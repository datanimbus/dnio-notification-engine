// const mongoose = require("mongoose");
//const webHookStatusController = require("../controllers/webHookStatus.controller");
const request = require("request-promise");
var e = {};
const logger = global.logger;
const config = require("../../config/config");
// const retryDelay = config.retryDelay.webHooks;
// const utils = require("@appveen/utils");
// let requeue = require("../channels/queueMgmt").requeue;

e.processMessageOnHooksChannel = async (_data, _client) => {
    let txnId = _data.txnId;
    try {
        logger.info(`[${txnId}] [${_data._id}] Invoke hook :: ${_data._id}`);
        logger.debug(`[${txnId}] [${_data._id}] Invoke hook :: Collection :: ${_data.collection}`);
        logger.trace(`[${txnId}] [${_data._id}] Invoke hook :: Q-data :: ${JSON.stringify(_data)}`);
    
        let hookData = await global.logsDB.collection(_data.collection).findOne({ _id: _data._id });
        logger.trace(`[${txnId}] [${_data._id}] Invoke hook :: DB Data :: ${JSON.stringify(hookData)}`);
    
        let apiCallResponse = await postWebHook(hookData);
        logger.trace(`[${txnId}] [${_data._id}] Invoke hook :: Response :: ${JSON.stringify(apiCallResponse)}`);

        apiCallResponse["_metadata"] = hookData._metadata;
        apiCallResponse._metadata.lastUpdated = new Date();
        apiCallResponse["logs"] = hookData.logs;
        apiCallResponse.logs.push({
            time: apiCallResponse._metadata.lastUpdated,
            message: apiCallResponse.message
        });

        if (apiCallResponse.retry <= config.retryCounter.webHooks) {
            apiCallResponse["scheduleTime"] = Date.now() + config.retryDelay.webHooks;
            _data["scheduleTime"] = Date.now() + config.retryDelay.webHooks;
            logger.info(`[${txnId}] [${_data._id}] Invoke hook :: Schedule time :: ${apiCallResponse.scheduleTime}`);
        }
        else {
            logger.error(`[${txnId}] [${_data._id}] Invoke hook :: Maximum retries reached`);
            apiCallResponse.message = "ERR_MAX_RETRY";
            apiCallResponse.status = "Fail";
        }
        
        logger.trace(`[${txnId}] [${_data._id}] Invoke hook :: Response after update:: ${JSON.stringify(apiCallResponse)}`);
        await global.logsDB.collection(_data.collection).findOneAndUpdate({_id: _data._id}, {"$set": apiCallResponse});

        if (apiCallResponse.retry <= config.retryCounter.webHooks && apiCallResponse.status == "Error") {
            logger.info(`[${txnId}] [${_data._id}] Invoke hook :: Retrying :: ${apiCallResponse.retry}`);
            _client.publish(config.queueNames.webHooks, JSON.stringify(_data));
        }
    } catch (e) {
        logger.error(`[${txnId}] [${_data._id}] Invoke hook :: ${e.message}`);
        _client.publish(config.queueNames.webHooks, JSON.stringify(_data));
    }
};

async function postWebHook(_data) {
    let txnId = _data.txnId;
    try {
        let timeout = (process.env.HOOK_CONNECTION_TIMEOUT && parseInt(process.env.HOOK_CONNECTION_TIMEOUT)) || 30;
        _data["headers"]["Content-Type"] = "application/json";
        let payload = JSON.parse(JSON.stringify(_data));
        delete payload._metadata;
        delete payload.url;
        delete payload.headers;
        delete payload.logs;
        delete payload.scheduleTime;
        var options = {
            url: _data.url,
            method: "POST",
            headers: _data.headers,
            json: true,
            body: payload,
            timeout: timeout * 1000,
            resolveWithFullResponse: true,
            insecure: config.tlsInsecure,
            rejectUnauthorized: config.tlsInsecure
        };
        logger.trace(`[${txnId}] [${_data._id}] Hook request :: ${JSON.stringify(options)}`);

        let response = await request(options);

        logger.debug(`[${txnId}] [${_data._id}] Hook response :: ${_data.url} :: ${response.statusCode}`);

        let responseData = {
            status: "Error",
            message: null,
            retry: _data.retry
        };
        if (response.statusCode == 200) responseData.status = "Completed";
        else if (response.statusCode == 202) responseData.status = "Requested";
        else {
            logger.info(response.statusCode);
            logger.info(response);
            responseData.retry = responseData.retry + 1;
            responseData.message = response.statusCode;
        }
        logger.debug(`[${txnId}] [${_data._id}] Hook response :: data :: ${JSON.stringify(responseData)}`);
        return responseData;
    } catch (err) {
        logger.error(`[${txnId}] [${_data._id}] Error invoking hook :: ${_data.url} :: ${err.message}`);
        let responseData = {
            retry: _data.retry + 1,
            status: "Error",
            message: err.message,
        };
        return responseData;
    }

    // return new Promise((resolve) => {
    //   let status = "Error";
    //   request.post(options, function (err, res) {
    //     if (err) {
    //       logger.error(err.message);
    //     } else if (!res) {
    //       logger.error(_url + " service down");
    //       throw new Error(_url + " service down");
    //     } else {
    //       status = res.statusCode === 200 ? "Completed" : res.statusCode === 202 ? "Requested" : "Error";
    //     }
    //     let updateObj = {
    //       status: status,
    //       id: _data.id,
    //       colName: _data.colName,
    //       uuid: _data.uuid
    //     };
    //     if (status === "Error") {
    //       updateObj["retry"] = _data.retry + 1;
    //       updateObj["scheduleTime"] = new Date(Date.now() + retryDelay);
    //       updateObj["logs"] = { "timestamp": new Date(), "message": res ? "returned " + res.statusCode : err.message };
    //     }
    //     client.publish("posthookUpdate", JSON.stringify(updateObj));

    //     if (res && res.statusCode >= 200 && res.statusCode < 400) {
    //       _result.passed.push(_data);
    //       resolve(_data);
    //     }
    //     else {
    //       _data["retry"] = _data["retry"] + 1;
    //       _data["scheduleTime"] = new Date(Date.now() + retryDelay);
    //       _result.failed.push(_data);
    //       logger.error("Webhook " + _data.name + " failed for entity " + _data.entity + ", returned " + (res ? res.statusCode : err.message));
    //       resolve();
    //     }
    //   });
    // });
}


// function createDataObj(data) {
//     return utils.counter.generateId("CS", "webHookStatus", null, null, null)
//         .then(id => {
//             data.uuid = id;
//             return data;
//         });
// }

e.retryInvokeHook = function (_doc, client) {

    let _result = {
        passed: [], failed: []
    };
    let postData = _doc;
    if (_doc && _doc.data && _doc.data.data && _doc.data.data.old)
        _doc.data.data.old = JSON.parse(_doc.data.data.old);
    if (_doc && _doc.data && _doc.data.data && _doc.data.data.new)
        _doc.data.data.new = JSON.parse(_doc.data.data.new);
    postData.data = _doc.data;
    postData.id = _doc._id;
    postData.name = _doc.name;
    postData.entity = _doc.entity;
    return postWebHook(postData, _doc.url, _result, client).then(() => _result);
};

module.exports = e;