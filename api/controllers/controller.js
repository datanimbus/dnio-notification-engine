"use strict";
//controllers
// const changeStreamController = require("./changeStream.controller.js");
// const entityController = require("./entity.controller.js");
const eventController = require("./event.controller.js");
const subscriptionController = require("./subscription.controller.js");
const templateController = require("./template.controller.js");
// const triggerEventController = require("./triggerEvent.controller.js");
const webHooksController = require("./webHooks.controller.js");
const webHooksAudit = require("./webHooks.audit.controller.js");
const webHookStatusController = require("./webHookStatus.controller.js");
const logsController = require("./logs.controller.js");

//exports
var exports = {};
exports.templateCreate = templateController.create;
exports.templateList = templateController.index;
exports.templateShow = templateController.show;
exports.templateDestroy = templateController.destroy;
exports.templateUpdate = templateController.update;
exports.templateCount = templateController.count;

exports.eventCreate = eventController.create;
exports.eventList = eventController.index;
exports.eventShow = eventController.show;
exports.eventDestroy = eventController.destroy;
exports.eventUpdate = eventController.update;
exports.eventCount = eventController.count;

exports.subscriptionCreate = subscriptionController.create;
exports.subscriptionList = subscriptionController.index;
exports.subscriptionShow = subscriptionController.show;
exports.subscriptionDestroy = subscriptionController.destroy;
exports.subscriptionCount = subscriptionController.count;
exports.subscriptionUpdateRecipients = subscriptionController.updateRecipients;
exports.subscriptionRemoveRecipients = subscriptionController.removeRecipients;

// exports.triggerEvent = triggerEventController.processEvent;

// exports.entityList = entityController.index;
// exports.entityShow = entityController.show;
// exports.entityUpdate = entityController.update;
// exports.entityCount = entityController.count;

exports.webHookCreate = webHooksController.create;
exports.webHookList = webHooksController.index;
exports.webHookShow = webHooksController.show;
exports.webHookDestroy = webHooksController.destroy;
exports.webHookUpdate = webHooksController.update;
exports.webHookCount = webHooksController.count;
exports.webHookAudit = webHooksAudit.index;
exports.webHookAuditCount = webHooksAudit.count;
exports.health = webHooksController.health;
exports.readiness = webHooksController.readiness;

exports.logsIndex = logsController.index;
exports.logsControllerCount = logsController.count;

exports.webHookStatusList = webHookStatusController.index;
exports.webHookStatusShow = webHookStatusController.show;
exports.webHookStatusCount = webHookStatusController.count;

// exports.changeStream = changeStreamController.changeStream;


module.exports = exports;
    