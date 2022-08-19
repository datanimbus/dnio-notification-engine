const mongoose = require("mongoose");
const log4js = require("log4js");

const config = require("./config");
const version = require("./package.json").version;

const LOG_LEVEL = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";

global.loggerName = config.isK8sEnv() ? `[${process.env.DATA_STACK_NAMESPACE}] [${process.env.HOSTNAME}] [NE ${version}]` : `[NE ${version}]`;

log4js.configure({
    appenders: { out: { type: "stdout", layout: { type: "basic" } } },
    categories: { default: { appenders: ["out"], level: LOG_LEVEL } }
});

const logger = log4js.getLogger(global.loggerName);

require("./queue");

const logsDBName = config.mongoLogsOptions.dbName;
const logsDB = mongoose.createConnection(config.mongoLogUrl, config.mongoLogsOptions);
logsDB.on("connecting", () => { logger.info(` *** ${logsDBName} CONNECTING *** `); });
logsDB.on("disconnected", () => { logger.error(` *** ${logsDBName} LOST CONNECTION *** `); });
logsDB.on("reconnect", () => { logger.info(` *** ${logsDBName} RECONNECTED *** `); });
logsDB.on("connected", () => { logger.info(`Connected to ${logsDBName} DB`); });
logsDB.on("reconnectFailed", () => { logger.error(` *** ${logsDBName} FAILED TO RECONNECT *** `); });
global.logsDB = logsDB;

const dbName = config.mongoOptions.dbName;
(async () => {
    try {
        await mongoose.connect(config.mongoUrl, config.mongoOptions);
        logger.info(`Connected to ${dbName} DB`);
    } catch (err) {
        logger.error(err);
    }
})();

mongoose.connection.on("connecting", () => { logger.info(` *** ${dbName} CONNECTING *** `); });
mongoose.connection.on("disconnected", () => { logger.error(` *** ${dbName} LOST CONNECTION *** `); });
mongoose.connection.on("reconnect", () => { logger.info(` *** ${dbName} RECONNECTED *** `); });
mongoose.connection.on("connected", () => { logger.info(`Connected to ${dbName} DB`); });
mongoose.connection.on("reconnectFailed", () => { logger.error(` *** ${dbName} FAILED TO RECONNECT *** `); });

require("./models").init();