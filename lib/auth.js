/**
 * Created by shimng on 2017/3/12.
 */
var querystring = require("querystring");
var moment = require("moment");
var request = require('request');
var http = require("https");
var _ = require("underscore");
var Q= require("q");
var redis = require('redis');
var config = require("../config");
var async = require("async");
var crypto = require("crypto");
//钉钉API请求Host
var dingHost = "oapi.dingtalk.com" ;
function getToken(cb){
    var tokenUrl = "https://"+dingHost+"/gettoken?"+querystring.stringify({
            corpid:config.ding.corpId,
            corpsecret:config.ding.secret
        });
    request.get(tokenUrl,function(err,res,body){
        if(err){
            cb("getToken err",err);
        }else{
            try {
                var token = JSON.parse(body).access_token;
                cb(null, token);
            }
            catch (e) {
                cb("getToken error", e);
            }
        }
    })
}
function tryGetToken(cb){
    var now = moment().unix();
    async.waterfall([
        function (cb) {
            getToken(cb);
        }
    ],function(err,result){
        if(err){
            cb(err,err)
        }else{
            var dingToken = {
                token:result,
                time:now+7200
            };
            var client = redis.createClient(config.redis.port,config.redis.host,config.redis.auth);
            client.set(config.ding.prefix +"access_token",'{"access_token":"'+dingToken.token+'","expire_time":'+dingToken.time+'}',redis.print);
            client.quit();//必须关闭
            cb(null,dingToken);
        }
    })
}
function getAccessToken(cb){
    var now = moment().unix() ;
    //判断内存中是否有缓存
    var client = redis.createClient(config.redis.port,config.redis.host,config.redis.auth);
    client.get(config.ding.prefix+"access_token",function(err,keys) {
        client.quit();
        var key = JSON.parse(keys);
        if (_.has(key, "access_token") && now - key.expire_time < 0) {
            //获取到，并且未过期
            //返回token
            cb(null,{token:key.access_token,time:key.expire_time});
        }else{
            //没获取到，直接从顶顶获取
            tryGetToken(cb);
        }
    })
}

function getTicket(token,cb){
    var tokenUrl = "https://"+dingHost+"/get_jsapi_ticket?"+querystring.stringify({
            access_token:token.token
        });
    request.get(tokenUrl,function(err,res,body){
        if(err){
            cb("getTicket err",err);
        }else{
            try {
                var ticket = JSON.parse(body).ticket;
                cb(null, ticket);
            }
            catch (e) {
                cb("getTicket error", e);
            }
        }
    })
}
function tryGetTicket(token,url,cb){
    var now = moment().unix();
    var timestamp = getTimesTamp();
    var noncestr = getNonceStr();
    async.waterfall([
        function (cb) {
            getTicket(token,cb);
        }
    ],function(err,result){
        if(err){
            cb(err,err)
        }else{
            cb(null,{ticket:result,time:now+7200})
        }
    })
}
function getJsTicket(token,url,cb){
    //判断内存中是否有缓存
    var now = moment().unix();
    var client = redis.createClient(config.redis.port,config.redis.host,config.redis.auth);
    client.get(config.ding.prefix+"ticket",function(err,keys){
        client.quit();
        var key = JSON.parse(keys);
        if (_.has(key, "ticket") && now - key.expire_time < 0) {
            //获取到，并且未过期
            //返回token
            cb(null,{ticket:key.ticket,time:key.expire_time});
        }else{
            //没获取到，直接从顶顶获取
            tryGetTicket(token,url,cb);
        }
    })
}
//服务窗
function getChannelToken(cb){
    var tokenUrl = "https://"+dingHost+"/channel/get_channel_token?"+querystring.stringify({
            corpid:config.ding.corpId,
            channel_secret:config.ding.channelSecret
        });
    request.get(tokenUrl,function(err,res,body){
        if(err){
            cb("getChannelToken err",err);
        }else{
            try {
                var token = JSON.parse(body).access_token;
                cb(null, token);
            }
            catch (e) {
                cb("getChannelToken error", e);
            }
        }
    })
}
function tryGetChannelToken(cb){
    var now = moment().unix();
    async.waterfall([
        function (cb) {
            getChannelToken(cb);
        }
    ],function(err,result){
        if(err){
            cb(err,err)
        }else{
            var dingChannelToken = {
                token:result,
                time:now+7200
            };
            var client = redis.createClient(config.redis.port,config.redis.host,config.redis.auth);
            client.set(config.ding.prefix +"channel_access_token",'{"access_token":"'+dingChannelToken.token+'","expire_time":'+dingChannelToken.time+'}',redis.print);
            client.quit();//必须关闭
            cb(null,dingChannelToken);
        }
    })
}
function getChannelAccessToken(cb){
    //判断内存中是否有缓存
    var now = moment().unix();
    var client = redis.createClient(config.redis.port,config.redis.host,config.redis.auth);
    client.get(config.ding.prefix+"channel_access_token",function(err,keys){
        client.quit();
        var key = JSON.parse(keys);
        if (_.has(key, "access_token") && now - key.expire_time < 0) {
            //获取到，并且未过期
            //返回token
            cb(null,{token:key.access_token,time:key.expire_time});
        }else{
            //没获取到，直接从顶顶获取
            tryGetChannelToken(cb);
        }
    });
}

function getChannelTicket(token,cb){
    var tokenUrl = "https://"+dingHost+"/channel/get_channel_jsapi_ticket?"+querystring.stringify({
            access_token:token.token
        });
    request.get(tokenUrl,function(err,res,body){
        if(err){
            cb("getTicket err",err);
        }else{
            try {
                var ticket = JSON.parse(body).ticket;
                cb(null, ticket);
            }
            catch (e) {
                cb("getTicket error", e);
            }
        }
    })
}
function tryGetChannelTicket(token,url,cb){
    var now = moment().unix();
    async.waterfall([
        function (cb) {
            getChannelTicket(token,cb);
        }
    ],function(err,result){
        if(err){
            cb(err,err)
        }else{
            cb(null,{ticket:result,time:now+7200});
        }
    })
}
function getJsChannelTicket(token,url,cb){
    //判断内存中是否有缓存
    var now = moment().unix();
    var client = redis.createClient(config.redis.port,config.redis.host,config.redis.auth);
    client.get(config.ding.prefix+"channel_ticket",function(err,keys){
        var key = JSON.parse(keys);
        client.quit();
        if (_.has(key, "channel_ticket") && now - key.expire_time < 0) {
            //获取到，并且未过期
            //返回ticket
            cb(null,{tikect:key.ticket,time:key.expire_time});
        }else{
            //没获取到，直接从顶顶获取
            tryGetChannelTicket(token,url,cb);
        }
    })
}

function getTimesTamp() {
    return parseInt(new Date().getTime() / 1000) + '';
}
function getNonceStr() {
    return Math.random().toString(36).substr(2, 15);
}

module.exports = {
    commonHttpGet:function (args) {
        var q = Q.defer() ;
        var tokenUrl = "https://"+dingHost+"/"+args.action+"?"+querystring.stringify(args.params);
        request.get(tokenUrl,function(err,res,body){
            if(err){
                q.reject(err);
            }else{
                try {
                    q.resolve(JSON.parse(body));
                }
                catch (e) {
                    q.reject(e);
                }
            }
        })
        return q.promise;
    },
    commonHttpPost:function (args) {
        var q = Q.defer() ;
        var options = {
            method:"POST",
            url:"https://"+dingHost+"/"+args.action+"?access_token="+args.access_token,
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify(args.params)
        }
        request(options,function(err,res,body){
            if(err){
                q.reject(err);
            }else{
                try {
                    q.resolve(JSON.parse(body));
                }
                catch (e) {
                    q.reject(e);
                }
            }
        })
        return q.promise;
    },
    getAccessToken :function () {
        var q = Q.defer();
        async.waterfall([
            function(cb){
                getAccessToken(cb);
            }
        ],function(err,result){
            if(err){
                q.reject(err);
            }else{
                q.resolve(result);
            }
        });
        return q.promise;
    },
    getTicket:function () {
        var q = Q.defer();
        async.waterfall([
            function(cb){
                getAccessToken(cb);
            },
            function (token,cb) {
                getJsTicket(token,cb)
            },
        ],function(err,result){
            if(err){
                q.reject(err);
            }else{
                q.resolve(result);
            }
        });
        return q.promise;
    },
    getSignature:function (url) {
        var q = Q.defer();
        async.waterfall([
            function(cb){
                getAccessToken(cb);
            },
            function (token,cb) {
                getJsTicket(token,url,cb)
            },
            function (tickets,cb) {
                var timestamp = getTimesTamp();
                var noncestr = getNonceStr();
                var client = redis.createClient(config.redis.port,config.redis.host,config.redis.auth);
                client.set(config.ding.prefix +"ticket",'{"ticket":"'+tickets.ticket+'","expire_time":'+tickets.time+'}',redis.print);
                client.quit();//必须关闭
                var str = 'jsapi_ticket=' + tickets.ticket + '&noncestr=' + noncestr + '&timestamp=' + timestamp + '&url=' + url;
                var signature = crypto.createHash('sha1').update(str).digest('hex');
                cb(null, {
                    corpId: config.ding.corpId,
                    timeStamp: timestamp,
                    nonceStr: noncestr,
                    signature: signature
                });
            }
        ],function(err,result){
            if(err){
                q.reject(err);
            }else{
                q.resolve(result);
            }
        });
        return q.promise;
    },
    getChannelAccessToken:function () {
        var q = Q.defer();
        async.waterfall([
            function(cb){
                getChannelAccessToken(cb);
            }
        ],function(err,result){
            if(err){
                q.reject(err);
            }else{
                q.resolve(result);
            }
        });
        return q.promise;
    },
    getChannelTicket:function () {
        var q = Q.defer();
        async.waterfall([
            function(cb){
                getChannelAccessToken(cb);
            },
            function (token,cb) {
                getJsChannelTicket(token,cb)
            },
        ],function(err,result){
            if(err){
                q.reject(err);
            }else{
                q.resolve(result);
            }
        });
        return q.promise;
    },
    getChannelSignature:function (url) {
        var q = Q.defer();
        async.waterfall([
            function(cb){
                getChannelAccessToken(cb);
            },
            function (token,cb) {
                getJsChannelTicket(token,url,cb)
            },
            function (tickets, cb) {
                var timestamp = getTimesTamp();
                var noncestr = getNonceStr();
                var client = redis.createClient(config.redis.port,config.redis.host,config.redis.auth);
                client.set(config.ding.prefix +"channel_ticket",'{"ticket":"'+tickets.ticket+'","expire_time":'+tickets.time+'}',redis.print);
                client.quit();//必须关闭
                var str = 'jsapi_ticket=' + tickets.ticket + '&noncestr=' + noncestr + '&timestamp=' + timestamp + '&url=' + url;
                var signature = crypto.createHash('sha1').update(str).digest('hex');
                cb(null, {
                    corpId: config.ding.corpId,
                    timeStamp: timestamp,
                    nonceStr: noncestr,
                    signature: signature
                });
            }
        ],function(err,result){
            if(err){
                q.reject(err);
            }else{
                q.resolve(result);
            }
        });
        return q.promise;
    },
}