const mongoose = require("mongoose");

var e = {};

e.changeStream = function(_req, _res){
    var id = _req.swagger.params.id.value;
    mongoose.model("webHookStatus").findOneAndUpdate({_id:id}, {status:"Completed"})
        .then(()=>{
            _res.status(200).send();
        })
        .catch(err=>{
            _res.status(500).send(err.message);
        });
};

module.exports = e;