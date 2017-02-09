const path = require('path');
const MEAP = require('meap');
const async = require('async');
const fs = require('fs');

module.exports = function(config, type, brand){
    try{
        var date = new Date();
        var year = date.getFullYear();
        var month = date.getMonth()+1;
        var day = date.getDate();
        var xls = [];
        if(type == 'byYear'){
            var json = {};
            json.brandCode = brand;
            json.timeInfo = year;
            json.type = type;
            xls.push(json);
            if(month == 1 && day < 15){
                var json = {};
                json.brandCode = brand;
                json.timeInfo = year - 1;
                json.type = type;
                xls.push(json);
            }
            // var zipPath = path.join(config.FILE_ROOT_PATH.value,brand,'orderReport'+timeInfo+'.zip');
            // var zipFiles = path.join(config.FILE_ROOT_PATH.value,brand,'orderReport'+timeInfo+'*.xls');
            // _execution('zip '+ zipPath + zipFiles, function(result){
            //     if(result == 1){
            //         console.log('[zip]',zipPath);
            //     }else{
            //         console.log('[zip][error]');
            //     }
            // })
        }else if(type == 'byMonth'){
            var json = {};
            json.brandCode = brand;
            json.timeInfo = year + (month<10?('0'+month):month).toString();
            json.type = type;
            xls.push(json);
            if(month == 1 && day < 15){
                var json = {};
                json.brandCode = brand;
                json.timeInfo = (year-1).toString() + '12';
                json.type = type;
                xls.push(json);
            }else if(day < 15){
                var json = {};
                json.brandCode = brand;
                json.timeInfo = year + '' + (month-1<10?('0'+(month-1)):month-1).toString();
                json.type = type;
                xls.push(json);
            }
        }

        fs.exists(path.join(config.FILE_ROOT_PATH.value,brand),function(exists){
            if(!exists){
                fs.mkdirSync(path.join(config.FILE_ROOT_PATH.value,brand));
            }
        })

        console.log('[xls]',xls);
    }catch(e){
        console.log('[error]',e);
        return false;
    }

    async.each(xls, function(param,cb){
        try{
            var brand = param.brandCode;
            var pathch = "";
            for(var i in param){
                pathch += i + "=" + param[i] + "&";
            }
            if(pathch.length > 0){
                pathch = pathch.substring(0,pathch.length-1);
                pathch = "?" + pathch;
            }        
            var option = {
                method: "GET",
                url: config.JAVA_URL_MAP.value[brand]+"/lzsz-MSSOrder-1.0/bigOrder/exportOrderList"+pathch,
                Cookie: "true",
                timeout : 300,
                agent : "false",
                FileRNLength : "false"
            };

            var time = currentTime();
            console.log('[req_url]',time,param,option.url);

            //其他项均选填
            MEAP.AJAX.Runner(option, function(err, res, data){
                var time = currentTime();
                if (!err) {
                    console.log('[request_data]',time,param,data);
                }
                else {
                    console.log('[request_error]',time,param,err);
                }
            });
            cb(0)
        }catch(e){
            cb(e)
        }
    }, function(err){
        if(err){
            console.log('[async][error]',err)
        }
    })

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

