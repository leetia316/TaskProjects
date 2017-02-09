const path = require('path');
const redisUtil = require(path.join(__dirname, "RedisUtil"));
const MEAP = require('meap');
const async = require('async');
module.exports = function(config){
    redisUtil.getKeys(function(err,data){
        if(err){
            console.log('[syncHCMInfo]',err);
        }else{
            data = typeof data == 'string'? JSON.parse(data): data;
            var arr = [];
            for(var i in data){
                arr.push(i);
            }
            var length = arr.length;
            console.log('[getKeys]',length,arr);
            async.each(arr, function(item, cb){
                var temp = data[item];
                console.log('-----------------------------------------[temp]',length,temp);
                var currDate = new Date();
                var ajaxStartTime = currDate.getTime();
                if(temp['status'] == 0 && (ajaxStartTime-temp['cbDate']) > 10*60*1000){
                    if(!temp['option']){
                        expressRedisDel(item);
                        cb(0)
                        return false
                    }

                    try{
                        var option = JSON.parse(temp['option']);
                    }catch(e){
                        console.log('[option][error]',e);
                        cb(0)
                    }
                    console.log("[ajax request start time]:",currDate.getFullYear()+'-'+(currDate.getMonth()+1)+'-'+currDate.getDate()+' '+currDate.getHours()+":"+currDate.getMinutes()+":"+currDate.getSeconds());
                    console.log('[ajax request start]',option.url,',Method:',option.method);
                    console.log('[ajax request body]',option.Body);
                    MEAP.AJAX.Runner(option, function (err, res, data) {
                        console.log('[ajax complete,time consuming]: ',(Date.now()-ajaxStartTime)/1000,'S');
                        if (!err) {
                            data = typeof data == 'string' ? JSON.parse(data) : data;
                            console.log('[kuaidi100_res][接口订阅成功]',item,data);
                            if(data.result == true){
                                temp['status'] = 1;
                                temp['times'] = parseInt(temp['times']) + 1;
                                redisUtil.saveExpressInfo(item, temp, function(err){
                                    if(!err){
                                        console.log(JSON.stringify({status : '0',msg : 'redis更新成功'}));
                                        cb(0)
                                    }else{
                                        console.log(JSON.stringify({status : '-1',msg : 'reids更新失败'}));
                                        cb(0)
                                    }
                                })
                            }else{
                                console.log(JSON.stringify({status : '-1',msg : '接口订阅失败',data : data}));
                                cb(0)
                            }
                        }
                        else {
                            console.log(JSON.stringify({status : '-1',msg : '接口订阅失败'}));
                            cb(0)
                        }
                    });
                }
            },function(err){
                console.log('[kuaidi100_push][finish]',err);
            })
        }
    });

    function expressRedisDel(expressOrderNo){
        redisUtil.delKey(expressOrderNo, function(err){
            if(!err){
                console.log(JSON.stringify({
                    status: '-1',
                    msg: "订单推送删除成功"
                }));
            }else{
                Robot.log('[kuaidiCB][delKey][error]',err);
                console.log(JSON.stringify({
                    status: '-1',
                    msg: "订单推送删除失败"
                }));
            }
        })
    }

    function currentTime(){
        var date = new Date();
        var y = date.getFullYear();
        var m = date.getMonth()+1;
        var d = date.getDate();
        var h = date.getHours();
        var min = date.getMinutes();
        var s = date.getSeconds();
        var ms = date.getMilliseconds();
        if(ms < 10){
            ms = '00'+ms;
        }else if(ms < 100){
            ms = '0'+ms;
        }
        return y.toString()+'-'+(m<10?('0'+m):m).toString()+'-'+(d<10?('0'+d):d).toString()+' '+(h<10?('0'+h):h).toString()+':'+(min<10?('0'+min):min).toString()+':'+(s<10?('0'+s):s).toString()+ms.toString();    
    }    
};

