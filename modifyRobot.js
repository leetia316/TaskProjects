/*
* @describe:清洗Redis-session数据。
* */
global.Require = require;
var MEAP = require('meap');
var async = require('async');
var fs = require('fs');
var SESSIONRedisPOOL;

//会话连接池配置
var RedisAuthPoolOption = {
    db: "2",
    poolsize: "10",
    host: "e681f7bc98d944b4.m.cnbja.kvstore.aliyuncs.com",
    port: 6379,
    authpass: "LINGZHIappcan1", //数据库密码
    type: "0",//0 单机 1主从 2集群
    sentinels: [{host: "", port: ""}], // 主从配置
    sentinelName: "",//主从配置 监控服务名称
    cluster: [{host: "", port: ""}]//集群配置
};

SESSIONRedisPOOL = MEAP.REDISPOOL(RedisAuthPoolOption.db || 1, RedisAuthPoolOption.poolsize, RedisAuthPoolOption.host, RedisAuthPoolOption.port, RedisAuthPoolOption.authpass, RedisAuthPoolOption.type, RedisAuthPoolOption.sentinels, RedisAuthPoolOption.cluster, RedisAuthPoolOption.sentinelName);

SESSIONRedisPOOL.Runner(function (Client) {
    console.log('[SESSION RedisClient is Ready...]');
    if (Client){
        Client.multi().keys('*').exec(function(err,data){
        	var arr = data[0][1];
        	async.eachLimit(arr, 1000, function(item, cb){
				Client.hget(item, 'STOREloginEntity',  function (err, data) {
                    if (!err && data) {
                    	try{
	                    	if(typeof data == 'string'){
	                    		data = JSON.parse(data);
	                    	}
	                    	if(data['shop-code'] == 'miss shop code'){
	                    		data['shop-code'] = "";
			                    Client.hset(item, 'STOREloginEntity', JSON.stringify(data), function (err) {
                                    var msg = '[hset]['+item+"]"+err+":"+data+"\r\n";
                                    console.log(msg);
                                    fs.appendFileSync('./modifyRobot.txt',msg);
		                            cb(0)
			                    });
	                    	}else{
                                cb(0)
                            }
	                    }catch(e){
                            var msg = '[data]['+item+"]"+e+":"+data+"\r\n";
                            console.log(msg);
                            fs.appendFileSync('./modifyRobot.txt',msg);
	                    	cb(0)
	                    }
                    }else if(err){
                        var msg = '[hget]['+item+"][err]:"+err+",[data]:"+data+"\r\n";
                        console.log(msg);
                        fs.appendFileSync('./modifyRobot.txt',msg);
                        cb(0)
                    }else{
                        cb(0)
                    }
                })
        	},function(err){
        		Client.Release();
        		console.log('[modifyRobot][finish]',err);
        	})
        });
    }
    else
        console.log('no Client');
});