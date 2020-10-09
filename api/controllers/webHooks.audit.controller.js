"use strict";

const mongoose = require("mongoose");
const definition = {"name": {"type":"String"}};
const SMCrud = require("@appveen/swagger-mongoose-crud");
const schema = new mongoose.Schema(definition);
const logger = global.logger;

var options = {
    logger: logger,
    collectionName: "webHook.audit"
};

var crudder = new SMCrud(schema, "webHook.audit", options);

module.exports = {
    index: crudder.index,
    count: crudder.count
};