const mongoose = require('mongoose');

const config = require('./config/config');

let logger = global.logger

let logsDBName = config.mongoLogsOptions.dbName
const logsDB = mongoose.createConnection(config.mongoLogUrl, config.mongoLogsOptions);
logsDB.on('connecting', () => { logger.info(` *** ${logsDBName} CONNECTING *** `); });
logsDB.on('disconnected', () => { logger.error(` *** ${logsDBName} LOST CONNECTION *** `); });
logsDB.on('reconnect', () => { logger.info(` *** ${logsDBName} RECONNECTED *** `); });
logsDB.on('connected', () => { logger.info(`Connected to ${logsDBName} DB`); });
logsDB.on('reconnectFailed', () => { logger.error(` *** ${logsDBName} FAILED TO RECONNECT *** `); });
global.logsDB = logsDB;

let dbName = config.mongoOptions.dbName
mongoose.connect(config.mongoUrl, config.mongoOptions, err => {
	if (err) {
		logger.error(err);
	} else {
		logger.info(`Connected to ${dbName} DB`);
	}
});

mongoose.connection.on('connecting', () => { logger.info(` *** ${dbName} CONNECTING *** `); });
mongoose.connection.on('disconnected', () => { logger.error(` *** ${dbName} LOST CONNECTION *** `); });
mongoose.connection.on('reconnect', () => { logger.info(` *** ${dbName} RECONNECTED *** `); });
mongoose.connection.on('connected', () => { logger.info(`Connected to ${dbName} DB`); });
mongoose.connection.on('reconnectFailed', () => { logger.error(` *** ${dbName} FAILED TO RECONNECT *** `); });
