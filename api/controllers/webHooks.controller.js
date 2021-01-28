"use strict";

const mongoose = require("mongoose");
const definition = require("../helpers/webHooks.definition.js").definition;
const SMCrud = require("@appveen/swagger-mongoose-crud");
const utils = require("@appveen/utils");
const schema = new mongoose.Schema(definition);
const dataStackUtils = require("@appveen/data.stack-utils");
let queueMgmt = require("../channels/queueMgmt");
var client = queueMgmt.client;
const logger = global.logger;

var options = {
    logger: logger,
    collectionName: "webHook"
};

schema.pre("save", utils.counter.getIdGenerator("WHOOK", "webHook", null, null, 2000));

schema.pre("save", dataStackUtils.auditTrail.getAuditPreSaveHook("webHook"));

schema.post("save", dataStackUtils.auditTrail.getAuditPostSaveHook("webHook.audit",client,"auditQueue"));

schema.pre("remove", dataStackUtils.auditTrail.getAuditPreRemoveHook());

schema.post("remove", dataStackUtils.auditTrail.getAuditPostRemoveHook("webHook.audit",client,"auditQueue"));

var crudder = new SMCrud(schema, "webHook", options);

var e = {};

e.destroy = (_req, _res) => {
    var id = _req.swagger.params.id.value;
    crudder.model.remove({
        service: id
    })
        .then(() => {
            _res.status(200).json({});
        })
        .catch(err => {
            _res.status(500).json({
                message: err.message
            });
        });
};

e.update = (_req, _res) => {
    var id = _req.swagger.params.id.value;

    crudder.model.findOne({
        service: id
    })
        .then(doc => {
            if (doc) {
                doc.hookUrls = _req.body.hookUrls;
                doc.workflowHooks = _req.body.workflowHooks;
                return doc.save(_req);
            } else {
                doc = new crudder.model({
                    service: id,
                    hookUrls: _req.body.hookUrls,
                    workflowHooks: _req.body.workflowHooks

                });
                return doc.save(_req);
            }
        })
        .then(doc => {
            _res.status(200).json(doc);
        })
        .catch(err => _res.status(500).json({
            "message": err.message
        }));
};

function readiness(req, res) {
    return res.status(200).json();   
}

function health(req, res) {
    if (mongoose.connection.readyState === 1 && client && client.nc && client.nc.connected) {
        return res.status(200).json();
    }
    else {
        return res.status(400).json();
    }
}


module.exports = {
    index: crudder.index,
    show: crudder.show,
    update: e.update,
    count: crudder.count,
    create: crudder.create,
    destroy: e.destroy,
    logs: e.logs,
    health: health,
    readiness: readiness
};