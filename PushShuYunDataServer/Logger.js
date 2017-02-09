const _ = require("underscore");

/**
 * log缓存池,用于缓存当前使用中的log
 */
function LoggerPool(option){

    if (!(this instanceof LoggerPool)) {
        return new LoggerPool(option);
    }

    var self = this;

    //缓存最大条数
    this.maxLength = option.maxLength || 300;

    //默认行为替换最早的记录
    this.overrunAction = option.overrun || "replace";

    //是否显示log(默认不打印log)
    this.showLog = (function(showLog){
            return showLog == "true" || showLog == true
        })(option.showLog) || false;

    this.pool = {};
    this.push = function(logger){

        if (!(logger instanceof Logger)) {
            throw new Error('arguments must instanceof Logger')
        }

        var id = logger.id;

            //判断是否达到缓存池上限
            if(this.maxLength > self.getPoolSize()){
                self.pool[id] = {
                    createdAt: new Date().getTime(),
                    logger:self.showLog?logger:getNullLogger()
                };
            }else{
                //达到log缓存池上限，替换最早的log缓存/忽略本次log缓存/添加队列等待
                if(self.overrunAction == 'ignore'){}
                if(self.overrunAction == 'replace'){

                    //返回缓存池中插入时间最早的那一个
                    var olderKey = "";
                    var olderCreatedAt = "";

                    _.chain(self.pool).filter(function(val,key,poolObj){

                        if(!olderCreatedAt || !olderKey){
                            olderKey = val.logger.id;
                            olderCreatedAt = val.createdAt;
                        }

                        //判断更早的时间
                        if(val.createdAt < olderCreatedAt){
                            olderCreatedAt = val.createdAt;
                            olderKey = val.logger.id;
                        }

                    });

                    //删除更早的logInfo
                    self.releaseById(olderKey);

                    //添加log缓存
                    self.push(logger)

                }
                //排队等待
                if(self.overrunAction == 'wait'){
                    //todo

                }


            }
    };
    this.getById = function(id){
        return self.pool[id]?self.pool[id]['logger']:getNullLogger();
    };

    this.releaseById = function(id){
        delete self.pool[id]
    };

    this.releaseAll = function(){
        self.pool = {};
    };

    this.getPoolSize = function(){
        return _.keys(self.pool).length;
    };
}

//单例的代理
var SingleProxy = (function (){

    var _instance = {};

    return function(constructor,opt){

        if(!_instance[constructor.name]){
            return _instance[constructor.name] = new constructor(opt)
        }
        return _instance[constructor.name];
    }

})();

/**
 * 定义Logger类
 * @constructor
 */
function Logger(){

    if (!(this instanceof Logger)) {
        return new Logger(baseInfo);
    }

    var self = this;
    this.id = createUUID();
    this.info = function(){
        var argument = _.values(arguments);
        argument.unshift('[INFO]');

        var todayDate = new Date();
        argument.unshift(todayDate.getFullYear()+'-'+(todayDate.getMonth()+1)+'-'+todayDate.getDate()+' '+todayDate.getHours()+':'+todayDate.getMinutes()+':'+todayDate.getSeconds());
        argument.unshift(self.id);
        console.log.apply(null,argument);
    };
    this.error = function(){
        var argument = _.values(arguments);
        argument.unshift('[ERROR]');
        argument.unshift(self.id);
        console.error.apply(null,argument);
    };
}

//返回空log对象
function getNullLogger(){
    return {info:function(){},error:function(){}};
}

/**
 * 生成uuid
 * @returns {string}
 */
function createUUID() {
    return 'xxxxyxxxxxyxyxxxyxxxyxxxxxyxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
}


exports.SingleProxy = SingleProxy;
exports.LoggerPool = LoggerPool;
exports.Logger = Logger;




//SingleProxy 单例工厂

//Logger 记录器(每个事物，使用一个记录器)
    //info方法
    //error方法
//LoggerPool 记录器缓存池 具有可配置项，缓存每次事物的记录器 (全局单例，防止内存泄漏)

    //获取记录器(通过唯一标识)
    //销毁记录器(通过唯一标识)
    //添加记录器

//若LoggerPool达到上限，将LOG添加到待执行队列(后续功能)

//****Example****

// var heapdump = require('heapdump');
//
//
// //对比两个dump,来分析内存泄漏
// // 第一个dump
// heapdump.writeSnapshot('./app-start.dump');
// // 1分钟后，第二个dump
// setTimeout(function () {
//     heapdump.writeSnapshot('./app-5min.dump')
// }, 60*1*1000);
//
// var opt = {
//     maxLength: 10,
//     //达到上限的行为,替换最早的记录(replace)或者忽略本次缓存记录(ignore)。
//     overrun: "replace",
//     showLog: 'true'
// };
//
// var loggerPool = new SingleProxy(LoggerPool,opt);
//
// var logger1 = new Logger();
//
//
// loggerPool.push(logger1);
// var _logger1 = loggerPool.getById(logger1.id);
//
// var i=0;
// while(i<1000000){
//     _logger1.info('log1');
//     i++;
// }


