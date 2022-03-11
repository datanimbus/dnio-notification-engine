"use strict";

const mongoose = require("mongoose");
const SMCrud = require("@appveen/swagger-mongoose-crud");
const utils = require("@appveen/utils");
const dataStackUtils = require("@appveen/data.stack-utils");

const queue = require("../queue");
const definition = require("../schema/web-hook.schema").definition;

const schema = new mongoose.Schema(definition);
const client = queue.client;
const logger = global.logger;

const options = {
    logger: logger,
    collectionName: "webHook"
};

schema.pre("save", utils.counter.getIdGenerator("WHOOK", "webHook", null, null, 2000));

schema.pre("save", dataStackUtils.auditTrail.getAuditPreSaveHook("webHook"));

schema.post("save", dataStackUtils.auditTrail.getAuditPostSaveHook("webHook.audit", client, "auditQueue"));

schema.pre("remove", dataStackUtils.auditTrail.getAuditPreRemoveHook());

schema.post("remove", dataStackUtils.auditTrail.getAuditPostRemoveHook("webHook.audit", client, "auditQueue"));

new SMCrud(schema, "webHook", options);