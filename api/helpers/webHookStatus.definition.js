var definition = {
    "_id": {
        "type": "String",
        "default": null
    },
    "url": {
        "type": "String",
        "required": true
    },
    "name": {
        "type": "String",
        "required": true
    },
    "entity": {
        "type": "String"
    },
    "data": {
        "type": {
            "version":{
                "type": "Number"
            },
            "serviceId":{
                "type": "String"
            },
            "operation":{
                "type": "String"
            },
            "user":{
                "type": "String"
            },
            "txnId": {
                "type": "String"
            },
            "timeStamp":{
                "type": "String"
            },
            "data":{
                "type": {
                    "old": {
                        "type": "String"
                    },
                    "new":{
                        "type": "String"
                    }
                }
            }
        }
    },
    "status":{
        "type": "String",
        "enum": ["Completed", "Requested", "Error", "Pending"],
        "default": "Pending"
    },
    "retry":{
        "type": "Number",
        "default": 0
    },
    "scheduleTime":{
        "type": "Date",
        "default": 0
    },
    "logs":{
        "type":{
            "timestamp": {"type": "Date"},
            "message": {"type": "String"}
        }
    },

};
module.exports.definition = definition;