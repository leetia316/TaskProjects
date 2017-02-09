const path = require('path');
const redisUtil = require(path.join(__dirname, "RedisUtil"));
const MEAP = require('meap');
const async = require('async');
module.exports = function(config){

    var option = {
        method: "get",
        url: config.JAVABaseURL.value+config.updateClickRate.value,
        timeout:600,
        agent: false,
        FileRNLength: false,
        Body:{}
    };
    var currDate = new Date();
    var ajaxStartTime = currDate.getTime();
    console.log("[ajax request start time]:",currDate.getFullYear()+'-'+(currDate.getMonth()+1)+'-'+currDate.getDate()+' '+currDate.getHours()+":"+currDate.getMinutes()+":"+currDate.getSeconds());
    MEAP.AJAX.Runner(option, function (err, res, data) {
        console.log('[ajax complete,time consuming]: ',(Date.now()-ajaxStartTime)/1000,'S');
        data = typeof data == 'string'?JSON.parse(data):data;
        var guides = data.Employee;
        var startTime = Date.now();
        async.eachLimit(guides, 2000, function(guide,cb) {
            redisUtil.saveGuideInfo(guide,cb)
        }, function(err) {
            console.log('[sync guide_info for redis complete,time consuming]: ',(Date.now()-startTime)/1000,'S');
            console.log('[error]',err);
        });
    });
    
};

