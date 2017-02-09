global.Require = require;
var MEAP = require("meap");
var redis = require("meap_redis");

MEAP.MSG.Init({
    host : "192.168.4.11",
    authpass : "3g2win",
    type : 0
});

var client = MEAP.MSG.Client(function(err, client) {
    if (!err) {
        client.rpush("task_push", '{"data":"data"}', function() {
            client.end();
        });
    }
});
