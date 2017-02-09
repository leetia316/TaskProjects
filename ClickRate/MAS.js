global.Require = require;
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));
const schedule = require('node-schedule');

console.log('-----------------------------------------定时任务已经启动---------------------------------------------');
console.log('[cron-seting]',config['cron-style'].value);
var j = schedule.scheduleJob(config['cron-style'].value, function(){
    console.log('[已执行次数]:',j.triggeredJobs());
    require(path.join(__dirname, "syncHCMInfo"))(config);
});





