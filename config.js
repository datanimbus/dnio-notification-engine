"use strict";

const dataStackUtils = require('@appveen/data.stack-utils');
let envVariables = {};

function isK8sEnv() {
    return process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT;
}

const dataStackNS = process.env.DATA_STACK_NAMESPACE;
if (isK8sEnv() && !dataStackNS) throw new Error("DATA_STACK_NAMESPACE not found. Please check your configMap");

function get(_service) {
    if (isK8sEnv()) {
        if (_service == "sm") return `http://sm.${dataStackNS}`;
        if (_service == "pm") return `http://pm.${dataStackNS}`;
        if (_service == "user") return `http://user.${dataStackNS}`;
        if (_service == "gw") return `http://gw.${dataStackNS}`;
    } else {
        if (_service == "sm") return "http://localhost:10003";
        if (_service == "pm") return "http://localhost:10011";
        if (_service == "user") return "http://localhost:10004";
        if (_service == "gw") return "http://localhost:9080";
    }
}

async function fetchEnvironmentVariablesFromDB() {
    try {
        envVariables = await dataStackUtils.database.fetchEnvVariables();
        return envVariables;
    } catch (error) {
        logger.error(error);
        logger.error('Fetching environment variables failed. Crashing the component.');
        process.exit(1);
    }
}

module.exports = {
    retryCollectionName: "retryCollection",
    isK8sEnv: isK8sEnv,
    streamingConfig: {
        url: process.env.STREAMING_HOST || "nats://127.0.0.1:4222",
        user: process.env.STREAMING_USER || "",
        pass: process.env.STREAMING_PASS || "",
        // maxReconnectAttempts: process.env.STREAMING_RECONN_ATTEMPTS || 500,
        // reconnectTimeWait: process.env.STREAMING_RECONN_TIMEWAIT_MILLI || 500
        maxReconnectAttempts: process.env.STREAMING_RECONN_ATTEMPTS || 500,
        connectTimeout: 2000,
        stanMaxPingOut: process.env.STREAMING_RECONN_TIMEWAIT_MILLI || 500
    },
    baseUrlUM: get("user") + "/rbac",
    eventsPostUrl: envVariables.NE_EVENTS_URL || "",
    mongoUrl: process.env.MONGO_AUTHOR_URL || "mongodb://localhost",
    dbAuthorUrl:  process.env.DB_AUTHOR_URL || process.env.MONGO_AUTHOR_URL || "mongodb://localhost",
    validationApi: get("user") + "/rbac/validate",
    queueNames: {
        webHooks: "webHooks",
        logQueueName: "systemService",
        eventsQueue: "events",
        logEventsQueue: "logEvents"
    },
    defaultSMTPconfig: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // use SSL
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWD
        }
    },
    retryCounter: {
        webHooks: envVariables.HOOK_RETRY ? parseInt(envVariables.HOOK_RETRY) : 3
    },
    tlsInsecure: typeof envVariables.TLS_REJECT_UNAUTHORIZED === "string" && envVariables.TLS_REJECT_UNAUTHORIZED.toLowerCase() === "false",
    retryDelay: {
        webHooks: parseInt(envVariables.HOOK_DELAY) || 10000
    },
    mongoOptions: {
        // reconnectTries: process.env.MONGO_RECONN_TRIES,
        // reconnectInterval: process.env.MONGO_RECONN_TIME_MILLI,
        dbName: process.env.MONGO_AUTHOR_DBNAME || "datastackConfig",
        useNewUrlParser: true
    },
    mongoLogUrl: process.env.MONGO_LOGS_URL || "mongodb://localhost",
    mongoLogsOptions: {
        // reconnectTries: process.env.MONGO_RECONN_TRIES,
        // reconnectInterval: process.env.MONGO_RECONN_TIME_MILLI,
        dbName: process.env.MONGO_LOGS_DBNAME || "datastackLogs",
        useNewUrlParser: true
    },
    dbAuthorType: process.env.DB_AUTHOR_TYPE,
    dbAuthorOptions: {
        dbName: process.env.DB_AUTHOR_DBNAME || process.env.MONGO_AUTHOR_DBNAME || "datastackConfig",
        useNewUrlParser: true
    },
    dbLogsType: process.env.DB_LOGS_TYPE,
    dbLogsUrl: process.env.DB_LOGS_URL || process.env.MONGO_LOGS_URL || "mongodb://localhost",
    dbLogsOptions: {
        dbName: process.env.DB_LOGS_DBNAME || process.env.MONGO_LOGS_DBNAME || "datastackLogs",
        useNewUrlParser: true
    },
    postHookBatch: parseInt(envVariables.HOOK_POST_BATCH) || 500,
    fetchEnvironmentVariablesFromDB: fetchEnvironmentVariablesFromDB,
    HOOK_CONNECTION_TIMEOUT: envVariables.HOOK_CONNECTION_TIMEOUT
};