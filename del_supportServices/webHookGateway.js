"use strict";
const app = require("express")();
const log4js = require("log4js");
const logger = log4js.getLogger("webHookGateway");
const request = require('request');
const envConfig = require('../config/config.js');
logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

var counter = 0;
var logMiddleware = (req, res, next) => {
    var reqId = counter++;
    if (reqId == Number.MAX_VALUE) {
        reqId = counter = 0;
    }

    logger.info(reqId + " " + req.ip + " " + req.method + " " + req.originalUrl);
    next();
    logger.trace(reqId + " Sending Response");
};

app.use(logMiddleware);

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS');
    next();
});

const bodyParser = require("body-parser");
app.use(bodyParser.json());

function sendCompletionRes(id){
    var options = {
        url: envConfig.baseUrlNE+"/changeStream/" + id,
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        }
    };
    request.put(options, function (err, res, body) {
        if (err) {
            logger.error(e.message);
        } else if (!res) {
            logger.error("brahma-deployment-manager service down");
        } else {
            logger.info("Request completed with status "+res.statusCode+" "+res.body);
        }
    });
}

app.post("/triggerHookRandom", function(req, res) {
    let rand = Math.floor((Math.random() * 10) + 1);
    if(rand % 2 === 0)
        res.status(200).send();
    else{
        res.status(202).send();
        setTimeout(function(){
            sendCompletionRes(req.body.id);
        }, 20000);
    }
});

app.post("/triggerHook200", function(req, res) {
    res.status(200).send();
});

app.post("/triggerHook202", function(req, res) {
    res.status(202).send();
    setTimeout(function(){
        sendCompletionRes(req.body.id);
    }, 20000);
});

function start(_port) {
    app.listen(_port, (err) => {
        if (!err) {
            logger.info("Web Hook Gateway started on port " + _port);
        } else
            logger.error(err);
    });
}

module.exports = start;