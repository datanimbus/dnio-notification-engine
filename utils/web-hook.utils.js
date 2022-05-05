const Mongoose = require("mongoose");
const request = require("request-promise");
const log4js = require("log4js");
const _ = require("lodash");

const config = require("../config");

const logger = log4js.getLogger("Web-Hook Utils");

async function processMessageOnHooksChannel(data, client) {
    let txnId = data.txnId;
    try {
        logger.debug(`[${txnId}] [${data._id}] Invoke hook :: Q-data :: ${JSON.stringify(data)}`);
        logger.info(`[${txnId}] [${data._id}] Invoke hook :: ${data._id}`);
        logger.debug(`[${txnId}] [${data._id}] Invoke hook :: Collection :: ${data.collection}`);
        if (!data.collection) {
            logger.info("Rejecting message");
            return;
        }

        let hookData = await global.logsDB.collection(data.collection).findOne({ _id: data._id });
        logger.trace(`[${txnId}] [${data._id}] Invoke hook :: DB Data :: ${JSON.stringify(hookData)}`);

        if (hookData.hookType === "function") {
            logger.info(`[${txnId}] [${data._id}] Hook Found is FAAS`);
            const doc = await Mongoose.connection.db.collection("b2b.faas").findOne({ _id: hookData.refId });
            if (!doc) {
                throw new Error(`${hookData.refId} FAAS NOT FOUND`);
            }
            hookData.url = `http://${doc.deploymentName}.${doc.namespace}/api/${doc.app}/${_.camelCase(doc.name)}`;
        }

        let apiCallResponse = await postWebHook(hookData);
        logger.trace(`[${txnId}] [${data._id}] Invoke hook :: Response :: ${JSON.stringify(apiCallResponse)}`);

        apiCallResponse["_metadata"] = hookData._metadata;
        apiCallResponse._metadata.lastUpdated = new Date();
        apiCallResponse["logs"] = hookData.logs;
        apiCallResponse.logs.push({
            time: apiCallResponse._metadata.lastUpdated,
            message: apiCallResponse.message,
            statusCode: apiCallResponse.statusCode
        });

        if (apiCallResponse.retry <= config.retryCounter.webHooks) {
            apiCallResponse["scheduleTime"] = Date.now() + config.retryDelay.webHooks;
            data["scheduleTime"] = Date.now() + config.retryDelay.webHooks;
            logger.info(`[${txnId}] [${data._id}] Invoke hook :: Schedule time :: ${apiCallResponse.scheduleTime}`);
        }
        else {
            logger.error(`[${txnId}] [${data._id}] Invoke hook :: Maximum retries reached`);
            apiCallResponse.message = "ERR_MAX_RETRY";
            apiCallResponse.status = "Fail";
        }

        logger.trace(`[${txnId}] [${data._id}] Invoke hook :: Response after update:: ${JSON.stringify(apiCallResponse)}`);
        if (hookData.disableInsights) await global.logsDB.collection(data.collection).deleteOne({ _id: data._id });
        else await global.logsDB.collection(data.collection).findOneAndUpdate({ _id: data._id }, { "$set": apiCallResponse });

        if (apiCallResponse.retry <= config.retryCounter.webHooks && apiCallResponse.status == "Error") {
            logger.info(`[${txnId}] [${data._id}] Invoke hook :: Retrying :: ${apiCallResponse.retry}`);
            client.publish(config.queueNames.webHooks, JSON.stringify(data));
        }
    } catch (e) {
        logger.error(`[${txnId}] [${data._id}] Invoke hook :: ${e.message}`);
        client.publish(config.queueNames.webHooks, JSON.stringify(data));
    }
}

async function postWebHook(data) {
    let txnId = data.txnId;
    try {
        let timeout = (process.env.HOOK_CONNECTION_TIMEOUT && parseInt(process.env.HOOK_CONNECTION_TIMEOUT)) || 30;
        data["headers"]["Content-Type"] = "application/json";
        let payload = JSON.parse(JSON.stringify(data));
        delete payload._metadata;
        delete payload.url;
        delete payload.headers;
        delete payload.logs;
        delete payload.scheduleTime;
        let options = {
            url: data.url,
            method: "POST",
            headers: data.headers,
            json: true,
            body: payload,
            timeout: timeout * 1000,
            resolveWithFullResponse: true,
            insecure: config.tlsInsecure,
            rejectUnauthorized: config.tlsInsecure
        };
        logger.trace(`[${txnId}] [${data._id}] Hook request :: ${JSON.stringify(options)}`);

        let response = await request(options);

        logger.debug(`[${txnId}] [${data._id}] Hook response :: ${data.url} :: ${response.statusCode}`);

        let responseData = {
            status: "Error",
            statusCode: response.statusCode,
            message: response.body ? response.body.message : "Success - No Body",
            retry: data.retry,
            response: {
                headers: response.headers,
                body: response.body
            }
        };
        if (response.statusCode == 200) responseData.status = "Completed";
        else if (response.statusCode == 202) responseData.status = "Requested";
        else {
            logger.info(response.statusCode);
            logger.info(response);
            responseData.retry = responseData.retry + 1;
            responseData.message = response.statusCode;
        }
        logger.debug(`[${txnId}] [${data._id}] Hook response :: data :: ${JSON.stringify(responseData)}`);
        return responseData;
    } catch (err) {
        let responseData = {
            retry: data.retry + 1,
            status: "Error",
            statusCode: err.response.statusCode,
            message: err.message,
            response: {
                headers: err.response.headers,
                body: err.response.body
            }
        };
        logger.error(`[${txnId}] [${data._id}] Error invoking hook :: ${data.url} :: ${err.message}`);
        if (typeof err === "string") {
            responseData.statusCode = 500;
            responseData.message = err;
            responseData.response = {};
        } else {
            if (err.response) {
                responseData.statusCode = err.response.statusCode;
                responseData.message = err.response.body ? err.response.body.message : err.message;
                responseData.response = {
                    headers: err.response.headers,
                    body: err.response.body
                };
            } else {
                responseData.statusCode = 500;
                responseData.message = err.message;
                responseData.response = {};
            }
        }
        return responseData;
    }
}

async function retryInvokeHook(doc, client) {
    let result = {
        passed: [], failed: []
    };
    let postData = doc;
    if (doc && doc.data && doc.data.data && doc.data.data.old)
        doc.data.data.old = JSON.parse(doc.data.data.old);
    if (doc && doc.data && doc.data.data && doc.data.data.new)
        doc.data.data.new = JSON.parse(doc.data.data.new);
    postData.data = doc.data;
    postData.id = doc._id;
    postData.name = doc.name;
    postData.entity = doc.entity;
    return postWebHook(postData, doc.url, result, client).then(() => result);
}

module.exports.processMessageOnHooksChannel = processMessageOnHooksChannel;
module.exports.postWebHook = postWebHook;
module.exports.retryInvokeHook = retryInvokeHook;
