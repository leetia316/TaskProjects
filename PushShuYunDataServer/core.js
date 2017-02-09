global.Require = require;
const MEAP = require('meap');
const path = require('path');
const _ = require("underscore");
const schedule = require('node-schedule');
const async = require('async');
const GroupSet = require(path.join(__dirname, '_project')).GroupSet;
const ProxyTasks = require(path.join(__dirname, '_project')).ProxyTasks;
const ScheduleSetting = require(path.join(__dirname, '_project')).Schedule;
const ShowLOG = require(path.join(__dirname, '_project')).ShowLOG;

//logger.js
const SingleProxy = require(path.join(__dirname, 'Logger')).SingleProxy;
const LoggerPool = require(path.join(__dirname, 'Logger')).LoggerPool;
const Logger = require(path.join(__dirname, 'Logger')).Logger;

/**
 * BaseSetting
 */
const BaseSetting = require("./BaseSetting");

/**
 * log池 配置
 */
const opt = {
    maxLength: 300,
    overrun: "replace",
    showLog: ShowLOG
};

//log池
const loggerPool = new SingleProxy(LoggerPool,opt);

var serviceLOG = function(){};

if(ShowLOG=="true" || ShowLOG == true){
    serviceLOG = console.log;
}

//showlog
console.log('[show-log]',ShowLOG);

//定时任务
console.log('[cron-seting]',ScheduleSetting);

//任务setting
console.log('[task-seting]',BaseSetting);

//TaskList
const taskList= parseProxyTasks(ProxyTasks);

schedule.scheduleJob(ScheduleSetting, function(){
    //串行执行任务(考虑到某些系统性能问题)
    async.eachSeries(taskList, function(ProxyTask, callback1) {

        if(BaseSetting[ProxyTask.Name].TaskStatus == 'start'){
            async.auto({
                inboundData: function(cb){
                    getInboundData(ProxyTask,cb)
                },
                dataBlocks: ["inboundData", function (callback, results) {
                    var inboundData = results.inboundData;
                    var batch = BaseSetting[ProxyTask.Name].Batch;
                    callback(null, parseBlocks(inboundData,batch))
                }],
                sendData: ['dataBlocks', function (callback, results) {
                    //分批量发送数据
                    eachPush(results.dataBlocks,ProxyTask,callback)
                }]
            }, function (err) {
                callback1(err)
            });
        }else{
            callback1()
        }
    }, function(err){
        var todayDate = new Date();
        //执行完成或失败，释放logger池中所有数据
        loggerPool.releaseAll();
        if(err){
            serviceLOG(err);
            console.log(todayDate.getFullYear()+'-'+(todayDate.getMonth()+1)+'-'+todayDate.getDate()+' '+todayDate.getHours()+':'+todayDate.getMinutes()+':'+todayDate.getSeconds()+' [部分推送数云任务执行失败]')
        }else{
            console.log(todayDate.getFullYear()+'-'+(todayDate.getMonth()+1)+'-'+todayDate.getDate()+' '+todayDate.getHours()+':'+todayDate.getMinutes()+':'+todayDate.getSeconds()+' [推送数云任务执行完成]')
        }
    });
});


/*
* @describe: 分批量发送数据
* */
function eachPush(dataBlocks,ProxyTask,cb){
    var _count = 0;
    async.eachSeries(dataBlocks, function(dataBlock, callback) {
        var logger = new Logger();
        loggerPool.push(logger);

        loggerPool.getById(logger.id).info('['+ProxyTask.Name+']','['+ProxyTask.Inbound.Group+']','[推送次数]:',++_count);
        sendOutboundData(dataBlock,ProxyTask,logger,callback)

    }, function(err) {
        cb(err)
    });
}


/*
 * @describe:获取入站数据
 * */
function getInboundData(ProxyTask,cb) {

    var inboundOption = ProxyTask.Inbound;

    var group = inboundOption.Group;
    var baseURL = GroupSet[group]['Base-URL'];
    var URI = inboundOption["URI"];
    var method = inboundOption["Method"];
    var contentType = inboundOption["Content-Type"];
    var statusField = inboundOption["Status-Field"];
    var statusCode = inboundOption["Status-Code"];
    var dataPoint = inboundOption["Data-Point"];
    var params = inboundOption["Params"];

    var option = {};
    option.url = baseURL+""+URI;
    option.method = method;
    option = parseParamOption(method,params,contentType,option);
    serviceLOG('[PullDataOption]','['+ProxyTask.Name+']','['+group+']', JSON.stringify(option));

    AJAXCore(option,function(err,data){
        if(!err){
            if(data[statusField] == statusCode){
                serviceLOG('[DataLength]','['+ProxyTask.Name+']','['+group+']',data[dataPoint].length);
                cb(null,data[dataPoint])
            }else{
                cb("[ERROR][InboundData-StatusCode]-"+data[statusField])
            }
        }else{
            cb(err)
        }

    })

}

/*
* @describe:处理参数
* */
function parseParamOption(method,params,contentType,option){
    switch (method.toUpperCase()) {
        case "DELETE":
        case "GET":
            var pathch = "";
            var param = params;
            for (var i in param) {
                pathch += i + "=" + encodeURI(param[i]) + "&";
            }
            if (pathch.length > 0) {
                pathch = pathch.substring(0, pathch.length - 1);
                pathch = "?" + pathch;
            }
            option.url = option.url + pathch;
            break;
        case "PUT":
        case "POST":
            option.Body = JSON.stringify(params);
            option.Headers = {
                "Content-Type":contentType
            };
            break;
    }
    return option
}

/*
 * @describe:发送出站数据
 * */
function sendOutboundData(dataBlock,ProxyTask,logger,cb) {

    var outboundOption = ProxyTask.Outbound;
    var group = outboundOption.Group;
    var baseURL = GroupSet[group]['Base-URL'];
    var URI = outboundOption["URI"];
    var method = outboundOption["Method"];
    var contentType = outboundOption["Content-Type"];
    var basicAuth = outboundOption["Basic-Auth"];

    //数据预处理函数
    var preParseFunctionPath = outboundOption['preParseFunction'];

    //设置请求头信息
    var setHeadersFunction = outboundOption['setHeadersFunction'];



    var option = {};
    option.url = baseURL+""+URI;
    option.method = method;
    option.Headers = {
        "Content-Type": contentType
    };


    //预处理数据
    if(!preParseFunctionPath){
        if(basicAuth){
            option.BasicAuth = {
                username: basicAuth.Username,
                password: basicAuth.Password
            };
        }

        option.Body = JSON.stringify(dataBlock);
    }else{
        option.Body = require(getRealPath(preParseFunctionPath))(dataBlock,ProxyTask);
    }


    //设置请求头信息
    if(setHeadersFunction){

        var __headersMap = require(getRealPath(setHeadersFunction))(dataBlock,ProxyTask);

        if(!option.Headers){
            option.Headers = {};
        }

        for(var header in __headersMap){
            option.Headers[header] = __headersMap[header]
        }

    }


    loggerPool.getById(logger.id).info('[PushDataOption]','['+ProxyTask.Name+']','['+ProxyTask.Inbound.Group+']', JSON.stringify(option));
    AJAXCore(option,function(err,data){
        loggerPool.getById(logger.id).info('[WARNING][PushDataErrorInfo]','['+ProxyTask.Name+']','['+ProxyTask.Inbound.Group+']',err);
        loggerPool.getById(logger.id).info('[RESPONSE][PushDataInfo]','['+ProxyTask.Name+']','['+ProxyTask.Inbound.Group+']',data);

        //logger事物执行完毕，在loggerPool中销毁释放
        loggerPool.releaseById(logger.id);

        //忽略错误 继续请求
        cb()
    })

}

//获取真实的绝对路径
function getRealPath(str){
    var path = require('path');
    var dirs = str.split('.'),
        implFile = dirs.pop();
    var temp = "";
    for(var i=0,obj;obj = dirs[i++];){
        temp += "'"+obj+"',";
    }
    temp += "'"+implFile+".js'";
    eval("var dirPath = function(){return path.join(__dirname,"+temp+")}()");
    return dirPath;
}

//解析任务数据ProxyTasks
function parseProxyTasks(ProxyTasks){
    //将任务组拆分
    var tasks = [];
    serviceLOG('[INFO][parseProxyTasks]','[ExecuteTasksList]:');
    _.each(ProxyTasks,function(proxyTask){
        _.each(proxyTask.Inbound.Group,function(groupId){
            var obj = {};
            for(var k in proxyTask){
                obj[k] = (typeof(proxyTask[k])=="object"?_.omit(proxyTask[k]):proxyTask[k]);
            }
            obj.Inbound.Group = groupId+"";

            if(BaseSetting[proxyTask.Name].TaskStatus == 'start'){
                serviceLOG('[INFO][parseProxyTasks]','['+proxyTask.Name+']',groupId);
            }
            tasks.push(obj);
        });
    });
    return tasks;

    //原数据 Group字段的变化
    // {
    //     "Name": "PushGoods2ShuYun-JACKJONES",
    //     "Inbound": {
    //     "Group": ["MSS-ONLY","MSS-JACKJONES"],
    //         "URI": "/lzsz-MSSGoods-1.0/crm/goods",
    //         "Method": "GET",
    //         "Content-Type": "application/json",
    //         "Params": {},
    //     "Status-Field":"status",
    //         "Status-Code":"200",
    //         "Data-Point": "data"
    // },
    //     "Outbound": {
    //     "Group": "SHUYUN-ALL",
    //         "URI": "/goods",
    //         "Method": "POST",
    //         "Content-Type": "application/json",
    //         "Basic-Auth": {
    //         "Username": "shuyun",
    //             "Password": "shuyun123"
    //     }
    // },
    //     "Batch": 200,
    //     "TaskStatus": "start",
    //     "Describe": "从JAVA拉取上架商品主数据推送数云系统"
    // }
    //解析后数据 Group字段的变化
    // {
    //     "Name": "PushGoods2ShuYun-JACKJONES",
    //     "Inbound": {
    //     "Group": "MSS-ONLY",
    //         "URI": "/lzsz-MSSGoods-1.0/crm/goods",
    //         "Method": "GET",
    //         "Content-Type": "application/json",
    //         "Params": {},
    //     "Status-Field":"status",
    //         "Status-Code":"200",
    //         "Data-Point": "data"
    // },
    //     "Outbound": {
    //     "Group": "SHUYUN-ALL",
    //         "URI": "/goods",
    //         "Method": "POST",
    //         "Content-Type": "application/json",
    //         "Basic-Auth": {
    //         "Username": "shuyun",
    //             "Password": "shuyun123"
    //     }
    // },
    //     "Batch": 200,
    //     "TaskStatus": "start",
    //     "Describe": "从JAVA拉取上架商品主数据推送数云系统"
    // }
    // {
    //     "Name": "PushGoods2ShuYun-JACKJONES",
    //     "Inbound": {
    //     "Group": "MSS-JACKJONES",
    //         "URI": "/lzsz-MSSGoods-1.0/crm/goods",
    //         "Method": "GET",
    //         "Content-Type": "application/json",
    //         "Params": {},
    //     "Status-Field":"status",
    //         "Status-Code":"200",
    //         "Data-Point": "data"
    // },
    //     "Outbound": {
    //     "Group": "SHUYUN-ALL",
    //         "URI": "/goods",
    //         "Method": "POST",
    //         "Content-Type": "application/json",
    //         "Basic-Auth": {
    //         "Username": "shuyun",
    //             "Password": "shuyun123"
    //     }
    // },
    //     "Batch": 200,
    //     "TaskStatus": "start",
    //     "Describe": "从JAVA拉取上架商品主数据推送数云系统"
    // }


}



function AJAXCore(option, cb) {

    //设置超时时间为三分钟
    option.timeout=240;

    MEAP.AJAX.Runner(option, function (err, res, data) {
        try{
            if (!err) {
                if(res.statusCode == 200){
                    data = JSON.parse(data);
                    cb(err, data)
                }else{
                    cb("[ERROR][AJAX-StatusCode]-"+res.statusCode,data)
                }
            } else {
                cb(err,data)
            }
        }catch(e){
            cb(e,data)
        }
    });
}


/*
* @describe:分块处理数据
* */
function parseBlocks(inboundData,batch){

    var blocks = [];
    var len = inboundData.length;
    //math.ceil(x)返回大于参数x的最小整数,即对浮点数向上取整
    var count = Math.ceil(len/batch);
    for(var i=0;i<count;i++){
        blocks.push(inboundData.slice(i*batch,(i+1)*batch))
    }

    return blocks
}




