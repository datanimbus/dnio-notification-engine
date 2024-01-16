const mongoose = require("mongoose");
const log4js = require("log4js");

const config = require("./config");
const { fetchEnvironmentVariablesFromDB } = require("./config");
const version = require("./package.json").version;

const LOG_LEVEL = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";

global.loggerName = config.isK8sEnv() ? `[${process.env.DATA_STACK_NAMESPACE}] [${process.env.HOSTNAME}] [NE ${version}]` : `[NE ${version}]`;

log4js.configure({
    appenders: { out: { type: "stdout", layout: { type: "basic" } } },
    categories: { default: { appenders: ["out"], level: LOG_LEVEL } }
});

const logger = log4js.getLogger(global.loggerName);

require("./queue");

// const logsDBName = config.mongoLogsOptions.dbName;
// const logsDB = mongoose.createConnection(config.mongoLogUrl, config.mongoLogsOptions);
const logsDBName = config.dbLogsOptions.dbName;

logger.debug('DB Logs Type', config.dbLogsType);
logger.debug('DB Logs URL', config.dbLogsUrl);
logger.debug('DB Logs Options', config.dbLogsOptions);
const logsDB = mongoose.createConnection(config.dbLogsUrl, config.dbLogsOptions);

logsDB.on("connecting", () => { logger.info(` *** ${logsDBName} CONNECTING *** `); });
logsDB.on("disconnected", () => { logger.error(` *** ${logsDBName} LOST CONNECTION *** `); });
logsDB.on("reconnect", () => { logger.info(` *** ${logsDBName} RECONNECTED *** `); });
logsDB.on("connected", () => { logger.info(`Connected to ${logsDBName} DB`); });
logsDB.on("reconnectFailed", () => { logger.error(` *** ${logsDBName} FAILED TO RECONNECT *** `); });
global.logsDB = logsDB;

// const dbName = config.mongoOptions.dbName;
const dbName = config.dbAuthorOptions.dbName;
const initializeDatabase = () => {
    return new Promise(async (resolve, reject) => {
        try {
            // await mongoose.connect(config.mongoUrl, config.mongoOptions);
            logger.debug('DB Author Type', config.dbAuthorType);
            logger.debug('DB Author URL', config.dbAuthorUrl);
            logger.debug('DB Author Options', config.dbAuthorOptions);

            await mongoose.connect(config.dbAuthorUrl, config.dbAuthorOptions);

            logger.info(`Connected to ${dbName} DB`);
            const envVariables = await fetchEnvironmentVariablesFromDB();
            resolve(envVariables);
        } catch (err) {
            logger.error(err);
            reject(err);
        }
    });
};

mongoose.connection.on("connecting", () => { logger.info(` *** ${dbName} CONNECTING *** `); });
mongoose.connection.on("disconnected", () => { logger.error(` *** ${dbName} LOST CONNECTION *** `); });
mongoose.connection.on("reconnect", () => { logger.info(` *** ${dbName} RECONNECTED *** `); });
mongoose.connection.on("connected", () => { logger.info(`Connected to ${dbName} DB`); });
mongoose.connection.on("reconnectFailed", () => { logger.error(` *** ${dbName} FAILED TO RECONNECT *** `); });

require("./models").init();

module.exports = initializeDatabase;