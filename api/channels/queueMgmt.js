"use strict";
var cron = require("node-cron");
const webHook = require("./webHook");
const Mongoose = require("mongoose");
const envConfig = require("../../config/config");
const request = require("request");

const logger = global.logger;
var retryCollection = envConfig.retryCollectionName;

var clientId = envConfig.isK8sEnv() ? `${process.env.HOSTNAME}` : "NE";

logger.trace(JSON.stringify(envConfig.streamingConfig));

let client = require("@appveen/data.stack-utils").streaming.init(
    process.env.STREAMING_CHANNEL || "datastack-cluster",
    clientId,
    envConfig.streamingConfig
);
let BATCH = envConfig.postHookBatch;

global.streamingClient = client;

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
});

process.on("SIGTERM", () => {
    client.close();
});

var e = {};

function natsScheduler() {
    if (client) {
        let q = "retry_" + envConfig.queueNames.webHooks;
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
    let q = envConfig.queueNames.webHooks;
    var opts = client.subscriptionOptions();
    opts.setStartWithLastReceived();
    opts.setDurableName("ne-durables");
    var subscription = client.subscribe(q, "sendWebHooks", opts);
    subscription.on("message", function (body) {
        var msgObj = JSON.parse(body.getData());
        if(msgObj.scheduleTime < Date.now() || !msgObj.scheduleTime)
          webHook.processMessageOnHooksChannel(JSON.parse(JSON.stringify(msgObj)), client);
        else client.publish(envConfig.queueNames.webHooks, body.getData());
    });

}

function requeue(element) {
    let retryCounter = envConfig.retryCounter.webHooks;
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
        let q = "retry_" + envConfig.queueNames.webHooks;
        var opts = client.subscriptionOptions();
        opts.setStartWithLastReceived();
        opts.setDurableName("ne-durabless");
        var subscription = client.subscribe(q, "processWebhooks", opts);
        subscription.on("message", function (body) {
            var msgObj = JSON.parse(body.getData());
            logger.info("WebHook, Attempt " + msgObj["retry"]);
            webHook.retryInvokeHook(JSON.parse(JSON.stringify(msgObj)), client)
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
        let q = envConfig.queueNames.eventsQueue;
        var opts = client.subscriptionOptions();
        opts.setStartWithLastReceived();
        opts.setDurableName("ne-durabless");
        var subscription = client.subscribe(q, "sendEventsUpdate", opts);
        subscription.on("message", function (body) {
            var eventData = JSON.parse(body.getData());
            logger.info("Message recieved in events q : " + body.getData());
            postEventData(eventData);
        });
    } else {
        logger.error("Queue client is undefined", client);
    }
}

function postEventData(eventData) {
    let url = envConfig.eventsPostUrl;
    if (url && url != "" && url != "__NE_EVENTS_URL__") {
        var options = {
            url: url,
            method: "POST",
            json: true,
            body: eventData,
            headers: {
                "Content-Type": "application/json",
            }
        };
        request.post(options, function (err, res, body) {
            if (err) {
                logger.error(e);
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
    let q = envConfig.queueNames.logEventsQueue;
    let qPayload = {
        url: envConfig.eventsPostUrl,
        data: eventData,
        resStatusCOde: statusCode,
        resBody: body,
        status: status,
        message: message,
        scheduleTime: new Date()
    };
    client.publish(q, JSON.stringify(qPayload));
}
e.client = client;
e.requeue = requeue;
module.exports = e;