global.Require = require;
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));
const schedule = require('node-schedule');
const async = require('async');

console.log('-----------------------------------------定时任务已经启动---------------------------------------------');
var cron_seting = config['cron-style'].value;
var arr = [];
for(var i in cron_seting){
	for(var j in cron_seting[i]){
		var json = {};
		json.type = i;
		json.brand = j;
		json.value = cron_seting[i][j];
		arr.push(json);
	}
}
console.log('[cron-seting]', arr);

async.each(arr, function(item, cb){
	try{
		var type = item.type;
		var brand = item.brand;
		var value = item.value;
		var j = schedule.scheduleJob(value, function(){
		    console.log('-----------------------------------------[已执行次数]:',j.triggeredJobs(),'---------------------------------------------');
		    require(path.join(__dirname, "exportOrder.js"))(config,type,brand);
		});
		cb(0)
	}catch(e){
		cb(e)
	}
}, function(err){
	if(err){
		console.log('[scheduleJob][error]',err);
	}
})