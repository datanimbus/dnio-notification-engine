"use strict";

const mongoose = require("mongoose");
const definition = require("../helpers/webHookStatus.definition.js").definition;
const SMCrud = require("@appveen/swagger-mongoose-crud");
const utils = require("@appveen/utils");
const schema = new mongoose.Schema(definition);
const logger = global.logger;

var options = {
    logger: logger,
    collectionName: "webHookStatus"
};

schema.pre("save", utils.counter.getIdGenerator("CS", "webHookStatus", null, null, 2000));

var crudder = new SMCrud(schema, "webHookStatus", options);

function create(data){
    return crudder.model.create(data);
}

function update(id, data){
    return crudder.model.findOneAndUpdate({_id:id},data, {new: true});
}

module.exports = {
    index: crudder.index,
    show: crudder.show,
    count: crudder.count,
    create: create,
    update: update
};