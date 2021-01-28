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
const envConfig = require("./config/config.js");

let version = require("./package.json").version;
const loggerName = envConfig.isK8sEnv() ? `[${process.env.DATA_STACK_NAMESPACE}] [${process.env.HOSTNAME}] [NE ${version}]` : `[NE ${version}]`;

const log4js = utils.logger.getLogger;
const logger = log4js.getLogger(loggerName);
let timeOut = process.env.API_REQUEST_TIMEOUT || 120;
//logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
const bluebird = require("bluebird");
const mongoose = require("mongoose");
const integration = require("./api/integrations/init");
let conf = require("./config/config.js");
var bodyParser = require("body-parser");

app.use(bodyParser.json({ limit: "5mb" }));

global.Promise = bluebird;
global.logger = logger;
mongoose.Promise = global.Promise;

if (process.env.SERVICES) {
    require("./supportServices/user")(10011);
    require("./supportServices/product")(10012);
    require("./supportServices/smsGateway")(10013);
    require("./supportServices/webHookGateway")(10014);
}

if (envConfig.isK8sEnv()) {
    logger.info("*** K8s environment detected ***");
    logger.info("Image version: " + process.env.IMAGE_TAG);
} else if (fs.existsSync("/.dockerenv")) {
    logger.info("*** Docker environment detected ***");
} else {
    logger.info("*** Local environment detected ***");
}

function customLogger(coll, op, doc, proj) {
    process.stdout.write(`Mongoose: ${coll}.${op}(${JSON.stringify(doc)}`);
    if (proj) {
        process.stdout.write("," + JSON.stringify(proj) + ")\n");
    } else {
        process.stdout.write(")\n");
    }
}

if (debugDB) mongoose.set("debug", customLogger);

let mongoUrl = process.env.MONGO_AUTHOR_URL || "mongodb://localhost";

mongoose.connect(mongoUrl, conf.mongoOptions, err => {
    if (err) {
        logger.error(err);
    } else {
        logger.info("Connected to DB");
        logger.trace(`Connected to URL: ${mongoose.connection.host}`);
        logger.trace(`Connected to DB:${mongoose.connection.name}`);
        logger.trace(`Connected via User: ${mongoose.connection.user}`);
        integration.init();
    }
});


mongoose.connection.on("connecting", () => { logger.info("-------------------------connecting-------------------------"); });
mongoose.connection.on("disconnected", () => { logger.error("-------------------------lost connection-------------------------"); });
mongoose.connection.on("reconnect", () => { logger.info("-------------------------reconnected-------------------------"); });
mongoose.connection.on("connected", () => { logger.info("-------------------------connected-------------------------"); });
mongoose.connection.on("reconnectFailed", () => { logger.error("-------------------------failed to reconnect-------------------------"); });

var logMiddleware = utils.logMiddleware.getLogMiddleware(logger);
app.use(logMiddleware);

let dataStackUtils = require("@appveen/data.stack-utils");
let queueMgmt = require("./api/channels/queueMgmt");
let logToQueue = dataStackUtils.logToQueue("ne", queueMgmt.client, envConfig.queueNames.logQueueName, "ne.logs");
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