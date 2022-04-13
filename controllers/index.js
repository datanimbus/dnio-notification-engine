const router = require("express").Router();

router.use("/webHook", require("./web-hook.controller"));
router.use("/health", require("./health.controller"));

module.exports = router;