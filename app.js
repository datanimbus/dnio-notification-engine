"use strict";

const express = require("express");
const log4js = require("log4js");
const initializeDatabase = require("./db-factory");

const config = require("./config");

const PORT = process.env.PORT || 10010;
(async () => {
    try {
        // Wait for the initializeDatabase function to resolve and get envVariables
        const envVariables = await initializeDatabase();

        const TIMEOUT = envVariables.API_REQUEST_TIMEOUT || 120;

        const app = express();
        const logger = log4js.getLogger(global.loggerName);
        global.logger = logger;

        app.use(express.urlencoded({ extended: true }));
        app.use(express.json({ limit: "5mb" }));

        app.use(function (req, res, next) {
            if (req.path.indexOf("health") == -1) {
                logger.info("Request Received", req.method, req.path);
            }
            next();
        });

        app.use("/ne", require("./controllers"));

        if (config.isK8sEnv()) {
            logger.info("*** K8s environment detected ***");
            logger.info("Image version: " + process.env.IMAGE_TAG);
        } else {
            logger.info("*** Local environment detected ***");
        }

        logger.info(`Hook :: Retry limit :: ${config.retryCounter.webHooks}`);
        logger.info(`Hook :: Retry delay :: ${config.retryDelay.webHooks}ms`);

        const server = app.listen(PORT, (err) => {
            if (!err) {
                logger.info("Server started on port " + PORT);
            } else {
                logger.error(err);
                process.exit(0);
            }
        });

        server.setTimeout(parseInt(TIMEOUT) * 1000);
    } catch (error) {
        console.error("Error initializing envVariables:", error);
    }
})();