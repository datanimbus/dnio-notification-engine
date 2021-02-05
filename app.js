"use strict";

const fs = require("fs");
const path = require("path");
const jsyaml = require("js-yaml");
const swaggerTools = require("swagger-tools");
const express = require("express");
const app = express();
let debugDB = false;
if (process.env.LOG_LEVEL == "DB_DEBUG") { process.env.LOG_LEVEL = "debug"; debugDB = true; }
const utils = require("@appveen/utils");
const config = require("./config/config.js");

let version = require("./package.json").version;
const loggerName = config.isK8sEnv() ? `[${process.env.DATA_STACK_NAMESPACE}] [${process.env.HOSTNAME}] [NE ${version}]` : `[NE ${version}]`;

const log4js = utils.logger.getLogger;
const logger = log4js.getLogger(loggerName);
let timeOut = process.env.API_REQUEST_TIMEOUT || 120;
logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
const bluebird = require("bluebird");
const mongoose = require("mongoose");

// TODO: Delete this
// const integration = require("./api/integrations/init");

var bodyParser = require("body-parser");

app.use(bodyParser.json({ limit: "5mb" }));

global.Promise = bluebird;
global.logger = logger;
mongoose.Promise = global.Promise;


if (config.isK8sEnv()) {
    logger.info("*** K8s environment detected ***");
    logger.info("Image version: " + process.env.IMAGE_TAG);
} else {
    logger.info("*** Local environment detected ***");
}

logger.info(`Hook :: Retry limit :: ${config.retryCounter.webHooks}`);
logger.info(`Hook :: Retry delay :: ${config.retryDelay.webHooks}ms`);

function customLogger(coll, op, doc, proj) {
    process.stdout.write(`Mongoose: ${coll}.${op}(${JSON.stringify(doc)}`);
    if (proj) {
        process.stdout.write("," + JSON.stringify(proj) + ")\n");
    } else {
        process.stdout.write(")\n");
    }
}

// debugDB = true
if (debugDB) mongoose.set("debug", customLogger);

require("./db-factory");

var logMiddleware = utils.logMiddleware.getLogMiddleware(logger);
app.use(logMiddleware);

let dataStackUtils = require("@appveen/data.stack-utils");
let queueMgmt = require("./api/channels/queueMgmt");
let logToQueue = dataStackUtils.logToQueue("ne", queueMgmt.client, config.queueNames.logQueueName, "ne.logs");
app.use(logToQueue);

// swaggerRouter configuration
var options = {
    swaggerUi: path.join(__dirname, "/swagger.json"),
    controllers: path.join(__dirname, "./api/controllers"),
    useStubs: process.env.NODE_ENV === "development" // Conditionally turn on stubs (mock mode)
};

// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
var spec = fs.readFileSync(path.join(__dirname, "api/swagger/swagger.yaml"), "utf8");
var swaggerDoc = jsyaml.safeLoad(spec);

swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {

    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata());

    // Validate Swagger requests
    app.use(middleware.swaggerValidator());

    // Route validated requests to appropriate controller
    app.use(middleware.swaggerRouter(options));

    // Serve the Swagger documents and Swagger UI
    // app.use(middleware.swaggerUi());

    // Start the server
    var port = process.env.PORT || 10010;
    var server = app.listen(port, (err) => {
        if (!err) {
            logger.info("Server started on port " + port);
        } else
            logger.error(err);
    });
    server.setTimeout(parseInt(timeOut) * 1000);
});