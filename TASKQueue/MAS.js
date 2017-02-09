global.Require = require;
var MEAP = require("meap");
var fs = require("fs");
var path = require("path");
var config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));
var async = require('async');
//debugger;

MEAP.MSG.Init({
    db:config.db.value,
    host : config.host.value,
    port : config.port.value,
    authpass : config.authPass.value,
    type : config.type.value,
    sentinels : config.sentinels.value.split(","),
    sentinelName : config.cluster.value,
    cluster : config.cluster.value.split(",")
});

var Client = MEAP.MSG.Client(function(err, client) {
    if (!err) {
        console.log('[QUEUE-INFO]',"CLIENT ON READY");
        Client = client;
        client.on("next_push_task", task);
        client.emit("next_push_task");

    }
});
function run(message, callback) {
    execAjaxTask(message,callback)
}

function task() {
    Client.lpop("task_push", function(err, data) {
        if (!err && data) {
            try {
                var task = JSON.parse(data);
                run(task, function(err) {
                    if (err) {
                        console.log('[QUEUE-INFO]',"TASK RUN FAIL", err);
                        var error_info = {};
                        error_info.task = task;
                        error_info.err = err;
                        error_info = JSON.stringify(error_info);
                        Client.rpush("task_error",data,function(){
                            console.log('[QUEUE-INFO]',"Insert Error Task", error_info)
                        });
                    } else{
                        console.log('[QUEUE-INFO]',"TASK RUN SUCCESS");
                    }
                    Client.emit("next_push_task");
                });
            } catch(e) {
                Client.rpush("task_error",data);
                console.log("[CATCH ERROR]", e.message);
                Client.emit("next_push_task");
            }
        }
        else
            Client.emit("next_push_task");
    });



}

function execAjaxTask(ajaxOption,callback){
    var option = ajaxOption;
    console.log("[request_data]:",JSON.stringify(option.Body));
    console.log("[request_start][new req:" + option.url + " method:" + option.method + "]");
    MEAP.AJAX.Runner(option, function(err, res, data){
        console.log('[statusCode]:'+res.statusCode);
        if (!err && res.statusCode == 200) {
            console.log("[request_end][new req:" + option.url + " method:" + option.method + "]");
            data = (typeof data) == 'string'?JSON.parse(data):data;
            console.log('[res_data]',data);
            if(data.returnCode == "000" || data.returnCode == 'S' || data.returnCode == 's'){
                callback()
            }else{
                callback(data)
            }
        }else {
            console.log("[error][new req:" + option.url + " method:" + option.method + "]");
            callback({err:err,res_data:data,res_status:res.statusCode})
        }
    });
}






/*
 var uuid = Math.uuidCompact();
 Client.set("TASK_KEY_LOCK", uuid, "EX", 10, "NX", function(err, data) {
 if (!err && data === "OK") {
 LOG("lock success");
 Client.multi().LPOP("task_push", function(err, data) {
 }).del("TASK_KEY_LOCK").exec(function(err, data) {
 if (!err && data[0]) {
 try {
 var task = JSON.parse(data[0]);
 run(task, function(err) {
 Client.emit("next_push_task");
 if (err) {
 LOG("TASK RUN FAIL", err);
 } else
 LOG("TASK RUN SUCCESS");
 });
 } catch(e) {
 LOG("CATCH ERROR", e.message);
 Client.emit("next_push_task");
 }
 } else {
 unlock(1000);
 }
 });
 } else {
 waittask(1000);
 }
 });


 function unlock(t) {
 Client.del("TASK_KEY_LOCK", function() {
 LOG("UNLOCK,no message to send,wait 10 seconds\r\n\r\n\r\n\r\n");
 waittask(t);
 });
 }

 function waittask(t) {
 setTimeout(function() {
 Client.emit("next_push_task");
 }, t);
 }
 */
// do something
