const mongoose = require("mongoose");
//const webHookStatusController = require("../controllers/webHookStatus.controller");
const request = require("request");
var e = {};
const logger = global.logger;
const envConfig = require("../../config/config");
var retryDelay = envConfig.retryDelay.webHooks;
const utils = require("@appveen/utils");
//const Mongoose = require("mongoose");
//var retryCollection = envConfig.retryCollectionName;

// var client = queueMgmt.client;
/*function postWebHook(_data, _url, _result) {
 
    let client = require('../channels/queueMgmt').client;
    let requeue = require('../channels/queueMgmt').requeue;
    let timeout = (process.env.HOOK_CONNECTION_TIMEOUT && parseInt(process.env.HOOK_CONNECTION_TIMEOUT)) || 30;
    var options = {
        url: _url,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        json: true,
        body: _data,
        timeout: timeout * 1000
    };
    if (typeof process.env.TLS_REJECT_UNAUTHORIZED === "string" && process.env.TLS_REJECT_UNAUTHORIZED.toLowerCase() === "false") {
        options.insecure = true;
        options.rejectUnauthorized = false;
    }
    // console.log("###########################")
    // console.log(options);
    return new Promise((resolve) => {
        let status = "Error";
        request.post(options, function (err, res) {
            if (err) {
                logger.error(err.message);
            } else if (!res) {
                logger.error(_url + " service down");
                throw new Error(_url + " service down");
            } else {
                status = res.statusCode === 200 ? "Completed" : res.statusCode === 202 ? "Requested" : "Error";
            }
            let updateObj = {
                status: status,
                id:_data.id,
                colName: _data.colName,
                uuid: _data.uuid
            };
            if (status === "Error") {
                updateObj["retry"] = _data.retry+1;
                updateObj["scheduleTime"] = new Date(Date.now() + retryDelay);
               // updateObj["$push"] = { "logs": { "timestamp": new Date(), "message": res ? "returned " + res.statusCode : err.message } };
            }
            console.log('Update object is',updateObj);
            
            client.publish("posthookUpdate", JSON.stringify(updateObj));

            if ( res && res.statusCode >= 200 && res.statusCode < 400) {
                _result.passed.push(_data); 
                resolve(_doc);  
            }
            else {
                _data["retry"] = _data["retry"]+1;
                _result.failed.push(_data);
                logger.error("Webhook " + _data.name + " failed for entity " + _data.entity + ", returned " + (res ? res.statusCode : err.message));
                resolve();
            }
           // abc = [];
            //abc = _result
            //console.log('result array are',abc);
            
            //return abc;
            /*webHookStatusController.update(_data.id, updateObj)
                .then(_doc => {
                    if (_doc && res && res.statusCode >= 200 && res.statusCode < 400) {
                        _result.passed.push(_doc);
                        resolve(_doc);
                    }
                    else {
                        _result.failed.push(_doc);
                        logger.error("Webhook " + _data.name + " failed for entity " + _data.entity + ", returned " + (res ? res.statusCode : err.message));
                        resolve();
                    }
                }).catch(err => {
                    logger.error(err);
                    resolve();
                });
        });
    });
}*/

function postWebHook(_data, _url, _result,client) {
    let timeout = (process.env.HOOK_CONNECTION_TIMEOUT && parseInt(process.env.HOOK_CONNECTION_TIMEOUT)) || 30;
    var options = {
        url: _url,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        json: true,
        body: _data,
        timeout: timeout * 1000
    };
    if (typeof process.env.TLS_REJECT_UNAUTHORIZED === "string" && process.env.TLS_REJECT_UNAUTHORIZED.toLowerCase() === "false") {
        options.insecure = true;
        options.rejectUnauthorized = false;
    }

    return new Promise((resolve) => {
        let status = "Error";
        request.post(options, function (err, res) {
            if (err) {
                logger.error(err.message);
            } else if (!res) {
                logger.error(_url + " service down");
                throw new Error(_url + " service down");
            } else {
                status = res.statusCode === 200 ? "Completed" : res.statusCode === 202 ? "Requested" : "Error";
            }
            let updateObj = {
                status: status,
                id:_data.id,
                colName: _data.colName,
                uuid: _data.uuid
            };
            if (status === "Error") {
                updateObj["retry"] = _data.retry+1;
                updateObj["scheduleTime"] = new Date(Date.now()+retryDelay);
                updateObj["logs"] = { "timestamp": new Date(), "message": res ? "returned " + res.statusCode : err.message } ;
            }
            client.publish("posthookUpdate", JSON.stringify(updateObj));

            if ( res && res.statusCode >= 200 && res.statusCode < 400) {
                _result.passed.push(_data); 
                resolve(_data);  
            }
            else {
                _data["retry"] = _data["retry"]+1;
                _data["scheduleTime"] =  new Date(Date.now()+retryDelay);
                _result.failed.push(_data);
                logger.error("Webhook " + _data.name + " failed for entity " + _data.entity + ", returned " + (res ? res.statusCode : err.message));
                resolve();
            }
        });
    });
}


function createDataObj(data) {
    return utils.counter.generateId("CS", "webHookStatus", null, null, null)
        .then(id => {
            data.uuid = id;
            return data;
        });
}

e.invokeHook = function (_data,client) {
    let requeue = require("../channels/queueMgmt").requeue;

    mongoose.connection.db.collection("services").findOne({"_id": _data.serviceId})
        .then((data)=>{
            let colName = `${data.app}.${data.collectionName}.postHook`;
            return mongoose.model("webHook").findOne({
                service: _data.serviceId
            })
                .then((_doc) => {
                    if (_doc) {
                        logger.debug("webhook data is",JSON.stringify(_doc));
                        let hooks = null;
                        if (_data.type) {
                            hooks = _doc.workflowHooks && _doc.workflowHooks.postHooks && _doc.workflowHooks.postHooks[_data.type] ? _doc.workflowHooks.postHooks[_data.type] : [];
                            _data = _data.data;
                        }
                        else{
                            hooks = _doc.hookUrls;
                        }
                        let promises = hooks.map(_urlObj => {
                            delete _data.retryCounter;
                            let data = {
                                url: _urlObj.url,
                                name: _urlObj.name,
                                data: _data,
                                entity: _doc.entity,
                                status: "Pending",
                                retry: 0,
                                scheduleTime: new Date(),
                                colName: colName,
                                _metadata :{                      
                                }
                            };
                            return createDataObj(data);
                        });
                        return Promise.all(promises);
                    }
                })
                .then(hooks => {
                    hooks.forEach(data => {                       
                        client.publish("posthookCreate", JSON.stringify(data));
                        requeue(data);
                    });
                })
                .catch(err => {
                    logger.error(err);
                });
        });
       
};


e.retryInvokeHook = function (_doc,client) {

    let _result = {
        passed: [], failed: []
    };
    let postData = _doc;
    postData.data = _doc.data;
    postData.id = _doc._id;
    postData.name = _doc.name;
    postData.entity = _doc.entity;
    return postWebHook(postData, _doc.url, _result,client).then(() => _result);
};

module.exports = e;