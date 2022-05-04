const router = require("express").Router();
const log4js = require("log4js");
const mongoose = require("mongoose");

const logger = log4js.getLogger("web-hook.controller");
const webHookModel = mongoose.model("webHook");

router.get("/count", async (req, res) => {
    try {
        let filter = {};
        try {
            if (req.query.filter) {
                filter = JSON.parse(req.query.filter);
            }
        } catch (e) {
            logger.error(e);
            return res.status(400).json({
                message: e
            });
        }
        const count = await webHookModel.countDocuments(filter);
        return res.status(200).json(count);
    } catch (err) {
        logger.error(err);
        if (typeof err === "string") {
            return res.status(500).json({
                message: err
            });
        }
        res.status(500).json({
            message: err.message
        });
    }
});


router.get("/", async (req, res) => {
    try {
        let filter = {};
        try {
            if (req.query.filter) {
                filter = JSON.parse(req.query.filter);
            }
        } catch (e) {
            logger.error(e);
            return res.status(400).json({
                message: e
            });
        }
        if (req.query.countOnly) {
            const count = await webHookModel.countDocuments(filter);
            return res.status(200).json(count);
        }
        let skip = 0;
        let count = 30;
        let select = "";
        let sort = "";
        if (req.query.count && (+req.query.count) > 0) {
            count = +req.query.count;
        }
        if (req.query.page && (+req.query.page) > 0) {
            skip = count * ((+req.query.page) - 1);
        }
        if (req.query.select && req.query.select.trim()) {
            select = req.query.select;
        }
        if (req.query.sort && req.query.sort.trim()) {
            sort = req.query.sort;
        }
        const docs = await webHookModel.find(filter).select(select).sort(sort).skip(skip).limit(count).lean();
        res.status(200).json(docs);
    } catch (err) {
        logger.error(err);
        if (typeof err === "string") {
            return res.status(500).json({
                message: err
            });
        }
        res.status(500).json({
            message: err.message
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        let doc = await webHookModel.findById(req.params.id).lean();
        if (!doc) {
            return res.status(404).json({
                message: "Web Hook Not Found"
            });
        }
        res.status(200).json(doc);
    } catch (err) {
        logger.error(err);
        if (typeof err === "string") {
            return res.status(500).json({
                message: err
            });
        }
        res.status(500).json({
            message: err.message
        });
    }
});

router.post("/", async (req, res) => {
    try {
        const payload = req.body;
        const key = payload.jsonSchema.title.toCamelCase();
        logger.info(key);
        let doc = await webHookModel.findOne({ key });
        if (doc) {
            return res.status(400).json({
                message: "Web Hook with Same Key Exist"
            });
        }
        payload.key = key;
        doc = new webHookModel(payload);
        const status = await doc.save(req);
        res.status(200).json(status);
    } catch (err) {
        logger.error(err);
        if (typeof err === "string") {
            return res.status(500).json({
                message: err
            });
        }
        res.status(500).json({
            message: err.message
        });
    }
});

router.put("/:id", async (req, res) => {
    try {
        let doc = await webHookModel.findOne({ service: req.params.id });
        if (!doc) {
            doc = new webHookModel({
                service: req.params.id,
                hookUrls: req.body.hookUrls,
                workflowHooks: req.body.workflowHooks
            });
        } else {
            doc.hookUrls = req.body.hookUrls;
            doc.workflowHooks = req.body.workflowHooks;
        }
        const status = await doc.save(req);
        res.status(200).json(status);
    } catch (err) {
        logger.error(err);
        if (typeof err === "string") {
            return res.status(500).json({
                message: err
            });
        }
        res.status(500).json({
            message: err.message
        });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        let doc = await webHookModel.findOne({ service: req.params.id });
        if (!doc) {
            return res.status(404).json({
                message: "Web Hook Not Found"
            });
        }
        const status = await doc.remove(req);
        logger.debug(status);
        res.status(200).json({
            message: "Document Deleted"
        });
    } catch (err) {
        logger.error(err);
        if (typeof err === "string") {
            return res.status(500).json({
                message: err
            });
        }
        res.status(500).json({
            message: err.message
        });
    }
});


module.exports = router;