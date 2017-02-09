global.Require = require;
var MEAP = require("meap");
var fs = require("fs");
var path = require("path");
var config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));
var async = require('async');
const schedule = require('node-schedule');
//debugger;

//err队列
var list_key = "task_error";
//永久失败的队列
var final_list_key = "final_task_error";
//失败次数队列
var errorMaxCount = 8;

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

//定时执行
console.log('[cron-seting]',config['cron-style'].value);
console.log('[QUEUE-INFO]',"CLIENT ON READY");
var Client;
schedule.scheduleJob(config['cron-style'].value, function(){
    Client = MEAP.MSG.Client(function(err, client) {
        if (!err) {
            Client = client;
            Client.llen(list_key,function(err,len){
                if(len != 0){
                    console.log('ErrorTaskListLength:',len);
                }

                client.on("next_push_task", task);
                client.emit("next_push_task",len);
            });
        }
    });

});

function run(message, callback) {
    execAjaxTask(message,callback)
}

function task(LsitLength) {
    if(LsitLength != 0){
        console.log('EXECTaskNUM',LsitLength);
    }
    Client.lpop(list_key, function(err, data) {
        if (!err && data) {
            try {
                var task = JSON.parse(data);
                delete task.__errorCount;
                run(task, function(err) {
                    console.log('[waitEXECTask]',LsitLength-1);
                    if (err) {
                        console.log('[QUEUE-INFO]',"TASK RUN FAIL", err);
                        var error_info = {};
                        //error_info.task = task;
                        error_info.err = err;
                        error_info = JSON.stringify(error_info);
                        var errTASK = JSON.parse(data);

                        //增加失败次数
                        if(typeof errTASK.__errorCount === 'undefined'){
                            errTASK.__errorCount = 1;
                        }else{
                            var tempCount = Number(errTASK.__errorCount);
                            errTASK.__errorCount = tempCount + 1;
                        }

                        //失败次数达到最大值，存入永久失败队列
                        if(errTASK.__errorCount<errorMaxCount){
                            Client.rpush(list_key,JSON.stringify(errTASK),function(){
                                console.log('[QUEUE-INFO]',"Insert Error Task", error_info);
                                var nextNum = LsitLength-1;
                                if(nextNum>0){
                                    Client.emit("next_push_task",nextNum);
                                }else{
                                    Client = null;
                                }
                            });
                        }else{
                            var errMap = {
                                "ElectronicCommerceSB/Item/AppCan/ProxyService/EcHybrisItemSyncRestProxy":{
                                    type:1,
                                    title:"上报商品到Hybris",
                                    keyword:"skuCode",
                                    length:20,
                                    brandNo:0
                                },
                                "ElectronicCommerceSB/Order/AppCan/ProxyService/EcHybrisOrderSyncRestProxy":{
                                    type:2,
                                    title:"订单同步到Hybris",
                                    keyword:"orderNo",
                                    length:20,
                                    brandNo:2
                                },
                                "ElectronicCommerceSB/Order/AppCan/ProxyService/EcHybrisOrderStatusPushSyncRestProxy":{
                                    type:3,
                                    title:"订单状态同步到Hybris",
                                    keyword:"orderNo",
                                    length:20,
                                    brandNo:2
                                },
                                "FinanceSB/Payment/AppCan/ProxyService/FinAppCanRefundOrderSyncRestProxy":{
                                    type:4,
                                    title:"退单同步到Hybris",
                                    keyword:"orderNo",
                                    length:20,
                                    brandNo:2
                                },
                                "FinanceSB/Payment/AppCan/ProxyService/FinAppCanRefundStatusSyncRestProxy":{
                                    type:5,
                                    title:"退单状态同步到Hybris",
                                    keyword:"orderNo",
                                    length:20,
                                    brandNo:2
                                }
                            }

                            for(var i in errMap){
                                if(errTASK.url.indexOf(i) > -1){
                                    var body = {};
                                    body.type = errMap[i]['type'];
                                    body.title = errMap[i]['title'];
                                    body.state = 2;
                                    if(typeof errTASK.Body == 'object'){
                                        body.params = JSON.stringify(errTASK.Body);
                                    }else{
                                        body.params = errTASK.Body;
                                    }
                                    var today = new Date();
                                    errTASK.FailDate = today.getFullYear()+"-"+(today.getMonth()+1)+"-"+today.getDate();
                                    if(typeof err == 'object'){
                                        body.exception = JSON.stringify(err);
                                    }else{
                                        body.exception = err || '';
                                    }
                                    body.totalTimes = 8;
                                    body.currentTimes = 8;

                                    var start = data.indexOf(errMap[i]['keyword']);
                                    console.log(errMap[i]['keyword'],start);
                                    var temp = data.substring(start, start+errMap[i]['length']);
                                    if(temp.match(/\d/g)){
                                        temp = parseInt(temp.match(/\d/g)[errMap[i]['brandNo']]);
                                    }
                                    var brand;
                                    switch(temp){
                                        case 1: brand = 'ONLY';break;
                                        case 2: brand = 'JACKJONES';break;
                                        case 3: brand = 'VEROMODA';break;
                                        case 4: brand = 'SELECTED';break;
                                        case 5: brand = 'JLINDEBERG';break;
                                        default:
                                            var msg = '[req_body_error] There is no brandCode in '+temp+",it should be 1 to 5";
                                            errTASK.errorMsg = msg;
                                            console.log(msg);
                                            Client.rpush(final_list_key,JSON.stringify(errTASK),function(){
                                                console.log('[QUEUE-INFO]',"Insert Error Task", error_info);
                                                var nextNum = LsitLength-1;
                                                if(nextNum>0){
                                                    Client.emit("next_push_task",nextNum);
                                                }else{
                                                    Client = null;
                                                }
                                            });
                                            return;
                                    }

                                    var option = {
                                        method: "POST",
                                        url: config.JAVA_URL_MAP.value[brand]+"/lzsz-MSSOrder-1.0/bigOrder/saveSysLog",
                                        Cookie: "true",
                                        timeout : 60,
                                        agent : "false",
                                        FileRNLength : "false"
                                    };
                                    
                                    var arr = [body];
                                    option.Body = arr;

                                    console.log('[req_java_data]',option.Body);

                                    console.log('[req_java_url]',option.url);

                                    //其他项均选填
                                    MEAP.AJAX.Runner(option, function(err, res, data){
                                        try{
                                            data = JSON.parse(data);
                                            if(data && data.status == 200){
                                                console.log('[request_java_data]',data);
                                            }else{
                                                var msg = '[request_java_error] '+data;
                                                errTASK.errorMsg = msg;
                                                errTASK.errAJAXUrl = option.url;
                                                console.log(msg);
                                                Client.rpush(final_list_key,JSON.stringify(errTASK),function(){
                                                    console.log('[QUEUE-INFO]',"Insert Error Task", error_info);
                                                    var nextNum = LsitLength-1;
                                                    if(nextNum>0){
                                                        Client.emit("next_push_task",nextNum);
                                                    }else{
                                                        Client = null;
                                                    }
                                                });
                                            }
                                        }catch(e){
                                            var msg = '[request_ajax_error] '+e;
                                            errTASK.errorMsg = msg;
                                            errTASK.errAJAXUrl = option.url;
                                            console.log(msg);
                                            Client.rpush(final_list_key,JSON.stringify(errTASK),function(){
                                                console.log('[QUEUE-INFO]',"Insert Error Task", error_info);
                                                var nextNum = LsitLength-1;
                                                if(nextNum>0){
                                                    Client.emit("next_push_task",nextNum);
                                                }else{
                                                    Client = null;
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    } else {
                        var nextNum = LsitLength-1;
                        if(nextNum>0){
                            Client.emit("next_push_task",nextNum);
                        }else{
                            Client = null;
                        }
                        console.log('[QUEUE-INFO]',"TASK RUN SUCCESS");
                    }

                });
            } catch(e) {
                Client.rpush(list_key,data,function(){
                    console.log("[CATCH ERROR]", e.message);
                    var nextNum = LsitLength-1;
                    if(nextNum>0){
                        Client.emit("next_push_task",nextNum);
                    }else{
                        Client = null;
                    }
                });
            }
        }
        else{
            var nextNum = LsitLength-1;
            if(nextNum>0){
                Client.emit("next_push_task",nextNum);
            }else{
                Client = null;
            }
        }
    });



}

function execAjaxTask(ajaxOption,callback){
    var option = ajaxOption;
    console.log("[request_data]:",JSON.stringify(option.Body));
    console.log("[request_start]["+(new Date())+"][new req:" + option.url + " method:" + option.method + "]");
    MEAP.AJAX.Runner(option, function(err, res, data){
        try{
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
                callback({err:err,res_status:res.statusCode})
            }
        }catch(e){
            callback({err:e})
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
