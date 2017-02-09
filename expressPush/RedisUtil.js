const path = require('path');
const async = require('async');
const RedisAuthPoolOption = require(path.join(__dirname, "config"))['RedisPoolOption'].value;

//{
//    db:"8",
//    poolsize:"10",
//    host:"172.16.117.3",
//    port:"6379",
//    authpass:"appcan.cn", //数据库密码
//    type:"0",//0 单机 1主从 2集群
//    sentinels:[{host:"",port:""}], // 主从配置
//    sentinelName:"",//主从配置 监控服务名称
//    cluster:[{host:"",port:""}]//集群配置
//};

const MEAP = require('meap');
const RedisPOOL = MEAP.REDISPOOL(RedisAuthPoolOption.db || 1, RedisAuthPoolOption.poolsize, RedisAuthPoolOption.host,RedisAuthPoolOption.port,RedisAuthPoolOption.authpass,RedisAuthPoolOption.type, RedisAuthPoolOption.sentinels, RedisAuthPoolOption.cluster,RedisAuthPoolOption.sentinelName);

//存储导购hash数据 --无事物HMSET
exports.saveExpressInfo = function(key,value,cb){
    RedisPOOL.Runner(function(Client) {
        if (Client){
            Client.hmset(key,value,function(err,res){
                Client.Release();
                cb(err,res)
            });
        }
        else
            cb('client error')
    });
};

//获取导购hash数据 --无事物HMGET
exports.getGuideInfoByGNO = function(guideNO,guideFields,cb){
    RedisPOOL.Runner(function(Client) {
        if (Client){
            Client.hmget(guideNO,guideFields,function(err,res){
                Client.Release();
                cb(err,res)
            });
        }
        else
            cb('client error')
    });
};

exports.getKeys = function(cb){
    RedisPOOL.Runner(function(Client) {
        if (Client){
            var data = {};
            Client.keys('*', function(err, res){
                async.each(res,function(item,cb){
                    Client.hgetall(item, function (err, obj) {
                        if(err) cb(err)
                        data[item] = obj;    
                        cb(err,obj)
                    });
                },function(err){
                    Client.Release();
                    cb(err,data)
                })
            });
        }
        else
            cb('client error')
    });    
}

exports.delKey = function(key, cb){
    RedisPOOL.Runner(function(Client) {
        if (Client){
            Client.del(key, function(err,res){
                Client.Release();
                console.log('[flushdb]',err,res);
                cb(err, res)
            });            
            // Client.flushdb(function(err, res){
            //     Client.Release();
            //     console.log('[flushdb]',err,res);
            //     cb(err)
            // });
        }
        else
            cb('client error')
    });
}

//清空db
exports.clearDBInfo = function(cb){
    RedisPOOL.Runner(function(Client) {
        if (Client){
            Client.multi().keys('*').exec(function(err,data){
                Client.del(data[0][1],function(err,data){
                    Client.Release();
                    console.log(err,data);
                    cb(err)

                });
            });
        }
        else
            cb('client error')
    });
};