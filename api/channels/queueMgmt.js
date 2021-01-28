"use strict";
//var NATS = require('node-nats-streaming')
var cron = require("node-cron");
//const email = require("./email");
// const sms = require("./sms");
const webHook = require("./webHook");
const Mongoose = require("mongoose");
const envConfig = require("../../config/config");
const request = require("request");
//const webHookStatusController = require("../controllers/webHookStatus.controller");
const logger = global.logger;
var queueEmailP1 = envConfig.queueNames.email.p1;
var queueEmailP2 = envConfig.queueNames.email.p2;
var queueSMSP1 = envConfig.queueNames.sms.p1;
var queueSMSP2 = envConfig.queueNames.sms.p2;
var retryCollection = envConfig.retryCollectionName;
//var client = NATS.connect('test-cluster', 'notification', envConfig.NATSConfig);
//var client = require('node-nats-streaming').connect(config.cluster_id,config.client_id,config);
var clientId = envConfig.isK8sEnv() ? `${process.env.HOSTNAME}` : "NE";

logger.trace(JSON.stringify(envConfig.streamingConfig));
let client = require("@appveen/data.stack-utils").streaming.init(
    process.env.STREAMING_CHANNEL || "datastack-cluster",
    clientId,
    envConfig.streamingConfig
);
let BATCH = envConfig.postHookBatch;

cron.schedule("*/10 * * * * *", () => {
    natsScheduler();
});
client.on("connect", function () {
    //logger.info("NATS connected");
    //sendEmail(1);
    //sendEmail(2);
    //sendSMS(1);
    //sendSMS(2);
    sendWebHooks();
    processWebHooks();
    sendEventsUpdate();
});


client.on("reconnect", function () {
    //logger.info("NATS reconnected");
    //sendEmail(1);
    //sendEmail(2);
    //sendSMS(1);
    //sendSMS(2);
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

/*function getQueue(priority, type) {
    var q = null;
    if (type === "email") {
        q = priority === 1 ? queueEmailP1 : queueEmailP2;
    } else if (type === "sms") {
        q = priority === 1 ? queueSMSP1 : queueSMSP2;
    }
    return q;
}
*/
var e = {};

e.queueEmail = (message, event) => {
    var q = event.priority === 1 ? queueEmailP1 : queueEmailP2;
    var obj = {};
    obj["message"] = message;
    obj["email"] = event.email;
    obj["retryCounter"] = 1;
    client.publish(q, JSON.stringify(obj, null, 4));
};

e.queueSMS = (message, event) => {
    var q = event.priority === 1 ? queueSMSP1 : queueSMSP2;
    var obj = {};
    obj["message"] = message;
    obj["from"] = event.sms.number;
    obj["retryCounter"] = 1;
    client.publish({ "queue": q }, JSON.stringify(obj, null, 4));
};
/*function requeue(msgObj, type, priority,times) {   
    
    var q = type === "webHook" ? 'retry/' +envConfig.queueNames.webHooks : getQueue(priority, type);
    console.log();
    
    let retryCounter = 0;
    if (type !== "webHook") {
        retryCounter = priority === 1 ? envConfig.retryCounter[type]["p1"] : envConfig.retryCounter[type]["p2"];
    } else {
        retryCounter = parseInt(process.env.HOOK_RETRY) || envConfig.retryCounter.webHooks;
    }
    let retryDelay = 0;
    if (type !== "webHook") {
        retryDelay = priority === 1 ? envConfig.retryDelay[type]["p1"] : envConfig.retryDelay[type]["p2"];
    } else {
        retryDelay = envConfig.retryDelay.webHooks;
    }
    if (msgObj["retry"] >= retryCounter) {
        if (type === "webHook") {
            return logger.error("webHook " + msgObj.name + " failed permanently for entity " + msgObj.entity);
        }
        logger.error(type + " failed permanently");
    }
    client.subscribe('foo', function (body) {
        arr.push(body);
        console.log('array is ', arr);
    });
    client.publish('foo', JSON.stringify(msgObj, null, 4));
    webHookStatusController.update(msgObj._id, { "status": "Pending" }).then();
}*/
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

// function sendEmail(priority) {
//     var q = priority === 1 ? queueEmailP1 : queueEmailP2;
//     client.subscribe(q, function (body) {
//         var msgObj = JSON.parse(body);
//         logger.info("Email, Attempt No ", msgObj["retryCounter"]);
//         email.sendEmail(msgObj["message"], msgObj["email"])
//             .then(() => {
//                 logger.info("Email sent successfully!");
//             }, err => {
//                 logger.error(err.message);
//                 requeue(msgObj, "email", priority);
//             });
//     });
// }

// function sendSMS(priority) {
//     var q = priority === 2 ? queueSMSP2 : queueSMSP1;
//     client.subscribe(q, function (body) {
//         // console.log("SMS", body);
//         var msgObj = JSON.parse(body);
//         logger.info("SMS, Attempt No ", msgObj["retryCounter"]);
//         sms.sendSMS(msgObj).then(() => {
//             logger.info("SMS sent");
//         }, err => {
//             requeue(msgObj, "sms", 1);
//             logger.error(err.message);
//         });
//     });
// }


/*function sendWebHooks() {
    let q = envConfig.queueNames.webHooks;
    client.subscribe(q, function (body) {
        console.log('body====', body);
        var msgObj = JSON.parse(body);
        logger.info("WebHook, Attempt No 0");
        webHook.invokeHook(JSON.parse(JSON.stringify(msgObj)))
            /*.then((_result) => {
                let successWebHook = _result.passed.map(_d => _d.name);
                if (successWebHook)
                    logger.info("Webhook triggered: " + successWebHook);
                if (_result.failed) {
                    _result.failed.forEach(fail => {
                        logger.error("webHook " + fail.name + " failed for entity " + fail.entity);
                        requeue(fail, "webHook");
                    });
                }
            })
            .catch(err => {
                logger.error(err.message);
            });
    });
}

function retryWebHooks() {
    let q = 'retry/' + envConfig.queueNames.webHooks;
    client.subscribe(q, function (body) {
        console.log('retry body',body);
        var msgObj = JSON.parse(body);
        logger.info("WebHook, Attempt No " + msgObj["retry"] + " name: " + msgObj["name"] + " entity: " + msgObj["entity"]);
        webHook.retryInvokeHook(JSON.parse(JSON.stringify(msgObj)))
            .then((_result) => {
                let successWebHook = _result.passed.map(_d => _d.name);
                if (successWebHook && successWebHook.length > 0)
                    logger.info("Webhook triggered: " + successWebHook);
                if (_result.failed) {
                    _result.failed.forEach(fail => {
                        logger.error("webHook " + fail.name + " failed for entity " + fail.entity);
                        requeue(fail, "webHook");
                    });
                }
            })
            .catch(err => {
                logger.error(err.message);
            });
    });
}*/

function sendWebHooks() {
    let q = envConfig.queueNames.webHooks;
    var opts = client.subscriptionOptions();
    opts.setStartWithLastReceived();
    opts.setDurableName("ne-durables");
    var subscription = client.subscribe(q, "sendWebHooks", opts);
    subscription.on("message", function (body) {
        var msgObj = JSON.parse(body.getData());
        logger.debug("data for invoking hook", JSON.stringify(msgObj));
        webHook.invokeHook(JSON.parse(JSON.stringify(msgObj)), client);
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