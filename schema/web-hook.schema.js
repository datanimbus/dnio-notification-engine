const definition = {
    "_id": {
        "type": "String",
        "default": null
    },
    "service": {
        "type": "String",
        "unique": true,
        "required": true
    },
    "hookUrls": [{
        "name": {
            "type": "String"
        },
        "url": {
            "type": "String"
        }
    }],
    "workflowHooks": {
        "postHooks": {
            "submit": {
                "type": [{
                    "name": {
                        "type": "String"
                    },
                    "url": {
                        "type": "String"
                    }
                }]
            },
            "discard": {
                "type": [{
                    "name": {
                        "type": "String"
                    },
                    "url": {
                        "type": "String"
                    }
                }]
            },
            "approve": {
                "type": [{
                    "name": {
                        "type": "String"
                    },
                    "url": {
                        "type": "String"
                    }
                }]
            },
            "rework": {
                "type": [{
                    "name": {
                        "type": "String"
                    },
                    "url": {
                        "type": "String"
                    }
                }]
            },
            "reject": {
                "type": [{
                    "name": {
                        "type": "String"
                    },
                    "url": {
                        "type": "String"
                    }
                }]
            }
        }
    },
    "entity": {
        "type": "String"
    }
};
module.exports.definition = definition;