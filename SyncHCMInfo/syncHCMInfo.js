const path = require('path');
const redisUtil = require(path.join(__dirname, "RedisUtil"));
const MEAP = require('meap');
const async = require('async');
module.exports = function(config){
    var count = 0;
    (function syncHCM(){
        var option = {
            method: "post",
            url: config.HCMBaseURL.value+config.guideEmployeeList.value,
            timeout:600,
            agent: false,
            FileRNLength: false,
            BasicAuth : {
                username:config.HCMBasicAuth.value.username,
                password:config.HCMBasicAuth.value.password
            },
            Headers :{
                "Content-Type": "application/json"
            },
            Body:{}
        };
        var currDate = new Date();
        var ajaxStartTime = currDate.getTime();
        console.log("[ajax request start time,count:"+count+"]:",currDate.getFullYear()+'-'+(currDate.getMonth()+1)+'-'+currDate.getDate()+' '+currDate.getHours()+":"+currDate.getMinutes()+":"+currDate.getSeconds());
        MEAP.AJAX.Runner(option, function (err, res, data) {
            var res_time = (Date.now()-ajaxStartTime)/1000;
            console.log('[ajax complete,time consuming,count:'+count+']: ',res_time,'S');
            if(err || res_time >= 59){
                if(count<=10){
                    count++;
                    syncHCM()
                }else{
                    count = 0;
                    console.log('[error-1]',err)
                }
            }else{
                try{
                    data = typeof data == 'string'?JSON.parse(data):data;
                    var guides = data.Employee;
                    var startTime = Date.now();
                    async.eachLimit(guides, 2000, function(guide,cb) {
                        redisUtil.saveGuideInfo(guide,cb)
                    }, function(err) {
                        count = 0;
                        console.log('[sync guide_info for redis complete,time consuming]: ',(Date.now()-startTime)/1000,'S');
                        console.log('[redis][saveGuideInfo][error]',err);
                    });
                }catch(e){
                    if(count<=10){
                        count++;
                        syncHCM()
                    }else{
                        count = 0;
                        console.log('[error-3]',err)
                    }
                }
            }

        });
    })()
};
