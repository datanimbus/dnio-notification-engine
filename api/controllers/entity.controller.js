"use strict";

const mongoose = require("mongoose");
const definition = require("../helpers/entity.definition.js").definition;
const SMCrud = require("@appveen/swagger-mongoose-crud");
const utils = require("@appveen/utils");
const schema = new mongoose.Schema(definition);
const logger = global.logger;
const _ = require("lodash");

var options = {
    logger: logger,
    collectionName: "entity"
};
utils.counter.setDefaults("entity", 1000);
schema.pre("save", function(next){
    this.definition = _.uniq(this.definition);
    next();
});
var crudder = new SMCrud(schema, "entity", options);
module.exports = {
    index: crudder.index,
    show: crudder.show,
    update: crudder.update,
    count: crudder.count
};