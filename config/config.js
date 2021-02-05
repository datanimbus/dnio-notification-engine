"use strict";

function mongoUrl() {
    let mongoUrl = process.env.MONGO_AUTHOR_URL || "mongodb://localhost";
    // if (!mongoUrl.endsWith("/")) mongoUrl += "/";
    //  mongoUrl += (process.env.MONGO_AUTHOR_DBNAME || "datastackConfig");
    return mongoUrl;
}

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
    eventsPostUrl: process.env.NE_EVENTS_URL || "",
    mongoUrl: mongoUrl(),
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
        webHooks: process.env.HOOK_RETRY ? parseInt(process.env.HOOK_RETRY) : 3
    },
    tlsInsecure: typeof process.env.TLS_REJECT_UNAUTHORIZED === "string" && process.env.TLS_REJECT_UNAUTHORIZED.toLowerCase() === "false",
    retryDelay: {
        webHooks: parseInt(process.env.HOOK_DELAY) || 10000
    },
    mongoOptions: {
        reconnectTries: process.env.MONGO_RECONN_TRIES,
        reconnectInterval: process.env.MONGO_RECONN_TIME_MILLI,
        dbName: process.env.MONGO_AUTHOR_DBNAME || "datastackConfig",
        useNewUrlParser: true
    },
    mongoLogUrl: process.env.MONGO_LOGS_URL || "mongodb://localhost",
    mongoLogsOptions: {
        reconnectTries: process.env.MONGO_RECONN_TRIES,
        reconnectInterval: process.env.MONGO_RECONN_TIME_MILLI,
        dbName: process.env.MONGO_LOGS_DBNAME || "datastackLogs",
        useNewUrlParser: true
    },
    postHookBatch: parseInt(process.env.HOOK_POST_BATCH) || 500

};