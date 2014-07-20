var $ = require('jquery');
var channelCounter = 0;
var Events = require('Events.js');

var emptyFn = function() {};
var isFunction = function(obj) {
    return typeof obj === 'function';
};

var RPC = function(config) {
    var self = this;

    config = config || {};
    config.isHost = config.remote ? true : false;
    if (config.isHost && window.name) {
        config.channel = 'RPC_CHANNEL_P' + (channelCounter++);
    } else {
        config.channel = 'RPC_CHANNEL_' + (channelCounter++);
    }

    if (window.postMessage || document.postMessage) {
        config.protocol = "1";
    } else {
        config.protocol = "2";
    }

    var callbacks = {};
    var methods = config.method || {};
    var messageID = 1;

    Events.mixTo(RPC.Transport.prototype);

    var transport = new RPC.Transport(config);

    var send = function(message) {
        transport.send(message);
    };

    transport.on('ready', function() {
        if (isFunction(config.onReady)) {
            setTimeout(function() {
                config.onReady.call(self);
            }, 0);
        }
    });

    transport.on('message', function(message) {
        if (message.method) { // exec method
            execMethod(message);
        } else if (message.callbackId) { // exec callback
            var callback = callbacks[message.callbackId];

            if (callback) {
                callback(message.result);
            }
        }
    });

    var Fn = function(method, params, callback) {
        var message = {
            jsonrpc: "2.0",
            params: params,
            method: method,
            callbackId: messageID
        };

        if (isFunction(params)) {
            callback = params;
        }

        if (isFunction(callback)) {
            callbacks[messageID] = callback;
        }

        messageID++;
        setTimeout(function() {
            send(message);
        }, 0);
    };

    Fn.set = function(fnName, method) {
        methods[fnName] = method;
    };

    Fn.destroy = function() {
        messageID = 0;
        methods = {};
        callbacks = {};
        transport.destroy();
    };

    function execMethod(message) {
        var result;
        var fn = methods[message.method];
        if (isFunction(fn)) {
            try {
                if (Object.prototype.toString.call(message.params) !== '[object Array]') {
                    message.params = [message.params];
                }
                result = fn.apply({}, message.params);
            } catch (ex) {
                throw new Error("Exec function error: " + ex.message);
            }

            if (message.callbackId) {
                send({
                    callbackId: message.callbackId,
                    result: result
                });
            }
        }
    }

    transport.init();
    Fn.iframe = config.iframe;
    return Fn;
};

if (module) {
    module.exports = RPC;
} else {
    window.RPC = RPC;
}