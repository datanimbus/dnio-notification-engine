"use strict";
let cron = require("node-cron");
const Mongoose = require("mongoose");
const got = require("got");
const log4js = require("log4js");
const config = require("./config");
const webHookUtils = require("./utils/web-hook.utils");

const logger = log4js.getLogger(global.loggerName);
const retryCollection = config.retryCollectionName;

const clientId = config.isK8sEnv() ? `${process.env.HOSTNAME}` : "NE";

logger.trace(JSON.stringify(config.streamingConfig));

const client = require("@appveen/data.stack-utils").streaming.init(
    process.env.STREAMING_CHANNEL || "datastack-cluster",
    clientId,
    config.streamingConfig
);
const BATCH = config.postHookBatch;

cron.schedule("*/10 * * * * *", () => {
    natsScheduler();
});

client.on("connect", function () {
    sendWebHooks();
    processWebHooks();
    sendEventsUpdate();
});


client.on("reconnect", function () {
    sendWebHooks();
    processWebHooks();
    sendEventsUpdate();
});

client.on("error", function (err) {
    logger.error(err);
});

client.on("disconnect", function () {
    logger.info("disconnect");
});

client.on("reconnecting", function () {
    logger.info("reconnecting");
});

client.on("close", function () {
    logger.info("close");
    process.exit(0);
});

process.on("SIGTERM", () => {
    client.close();
});

function getGOTOptions(options) {
    let gotOptions = {};
    gotOptions.throwHttpErrors = false;
    gotOptions.url = options.url;
    gotOptions.method = options.method;
    gotOptions.headers = options.headers;
    if (options.json) {
        gotOptions.responseType = "json";
    }
    if (options.body) {
        gotOptions.json = options.body;
    }
    if (options.qs) {
        gotOptions.searchParams = options.qs;
    }
    return gotOptions;
}

function request(options, callback) {
    const gotOptions = getGOTOptions(options);
    got(gotOptions).then((res) => {
        if (res) {
            callback(null, res, res.body);
        } else {
            callback(null, null, null);
        }
    }).catch(err => {
        handleError(err, callback);
    });
}

function handleError(err, callback) {
    let error = {};
    error.code = err.code;
    error.name = err.name;
    error.message = err.message;
    error.stack = err.stack;
    if (error.code == "ECONNREFUSED") {
        callback(null, null, null);
    } else {
        callback(error, null, null);
    }
}

function natsScheduler() {
    if (client) {
        let q = "retry_" + config.queueNames.webHooks;
        Mongoose.connection.db.collection(retryCollection).count()
            .then(count => {
                if (count > 0) {
                    let totalBatches = count / BATCH;
                    totalBatches = Math.ceil(totalBatches);
                    let arr = [];
                    for (let i = 0; i < totalBatches; i++) {
                        arr.push(i);
                    }

                    return arr.reduce((_pr, cur, i) => {
                        return _pr
                            .then(() => {
                                return Mongoose.connection.db.collection(retryCollection).find({ "scheduleTime": { $lte: new Date() } }).limit(BATCH).skip(BATCH * i).toArray();
                            })
                            .then(items => {
                                if (items.length > 0) {
                                    items.forEach(data => {
                                        logger.debug("Data to publish " + JSON.stringify(data, null, 4));
                                        client.publish(q, JSON.stringify(data, null, 4));
                                        Mongoose.connection.db.collection(retryCollection).remove({ "_id": data["_id"] });
                                    });
                                }

                            });
                    }, Promise.resolve());

                }

            });
    }
}

function sendWebHooks() {
    let q = config.queueNames.webHooks;
    let opts = client.subscriptionOptions();
    opts.setStartWithLastReceived();
    opts.setDurableName("ne-durables");
    let subscription = client.subscribe(q, "sendWebHooks", opts);
    logger.debug(`Subscribed to ${q}`);
    subscription.on("message", function (body) {
        let msgObj = JSON.parse(body.getData());
        if (msgObj.scheduleTime < Date.now() || !msgObj.scheduleTime)
            webHookUtils.processMessageOnHooksChannel(JSON.parse(JSON.stringify(msgObj)), client);
        else client.publish(config.queueNames.webHooks, body.getData());
    });

}

function requeue(element) {
    let retryCounter = config.retryCounter.webHooks;
    if (element["retry"] < retryCounter - 1) {
        element["status"] = "Pending";
    }
    if (element["retry"] >= retryCounter) {
        return logger.error("webHook " + element.name + " failed permanently for entity " + element.entity);
    }
    logger.debug("element inserting for requeue", JSON.stringify(element));
    Mongoose.connection.db.collection(retryCollection).insert(element);
}

function processWebHooks() {
    if (client) {
        let q = "retry_" + config.queueNames.webHooks;
        let opts = client.subscriptionOptions();
        opts.setStartWithLastReceived();
        opts.setDurableName("ne-durabless");
        let subscription = client.subscribe(q, "processWebhooks", opts);
        logger.debug(`Subscribed to ${q}`);
        subscription.on("message", function (body) {
            let msgObj = JSON.parse(body.getData());
            logger.info("WebHook, Attempt " + msgObj["retry"]);
            webHookUtils.retryInvokeHook(JSON.parse(JSON.stringify(msgObj)), client)
                .then((_result) => {
                    logger.debug("result after invoking hook", JSON.stringify(_result));
                    let successWebHook = _result.passed.map(_d => _d.name);
                    if (successWebHook.length) {
                        logger.info("Webhook triggered: " + successWebHook);
                    }
                    if (_result.failed) {
                        _result.failed.forEach(fail => {
                            logger.error("webHook " + fail.name + " failed for entity " + fail.entity);
                            requeue(fail);
                        });
                    }
                })
                .catch(err => {
                    logger.error(err);
                });
        });
    }
}

function sendEventsUpdate() {
    if (client) {
        let q = config.queueNames.eventsQueue;
        let opts = client.subscriptionOptions();
        opts.setStartWithLastReceived();
        opts.setDurableName("ne-durabless");
        let subscription = client.subscribe(q, "sendEventsUpdate", opts);
        logger.debug(`Subscribed to ${q}`);
        subscription.on("message", function (body) {
            let eventData = JSON.parse(body.getData());
            logger.debug("Message recieved in events q : " + body.getData());
            postEventData(eventData);
        });
    } else {
        logger.error("Queue client is undefined", client);
    }
}

function postEventData(eventData) {
    let url = config.eventsPostUrl;
    if (url && url != "" && url != "__NE_EVENTS_URL__") {
        let options = {
            url: url,
            method: "POST",
            json: true,
            body: eventData,
            headers: {
                "Content-Type": "application/json",
            }
        };
        request(options, function (err, res, body) {
            if (err) {
                logger.error(err);
                logEvents(eventData, null, err, "failed", "Error in NE_EVENTS_URL api call");
            } else if (!res) {
                logger.error("No response from event post URL");
                logEvents(eventData, res.statusCode, body, "failed", "No resposne in NE_EVENTS_URL api call");
            } else {
                logger.debug("Event sent with status " + res.statusCode + " " + body);
                logEvents(eventData, res.statusCode, body, "success", "Event sent to NE_EVENTS_URL");
            }
        });
    } else {
        logger.info("NE_EVENTS_URL not configured");
        logEvents(eventData, null, null, "failure", "NE_EVENTS_URL not configured");
    }
}

function logEvents(eventData, statusCode, body, status, message) {
    let q = config.queueNames.logEventsQueue;
    let qPayload = {
        url: config.eventsPostUrl,
        data: eventData,
        resStatusCOde: statusCode,
        resBody: body,
        status: status,
        message: message,
        scheduleTime: new Date()
    };
    client.publish(q, JSON.stringify(qPayload));
}


module.exports.client = client;