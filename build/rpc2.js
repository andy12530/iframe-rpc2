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
RPC.behavior = {};
(function(Behavior) {
    Behavior.FLAG = '__RPC__';

    Behavior.handleMessage = function(message) {
        return Behavior.FLAG + JSON.stringify(message);
    };

    Behavior.verify = function(message) {
        var result = {
            message: undefined,
            trust: false
        };

        if (message.indexOf(Behavior.FLAG) === 0) {
            result.message = message.replace(Behavior.FLAG, '');
            result.trust = true;
        }

        return result;
    };

    Behavior.navigator = function(config, transport) {
        var pub = {
            incoming: function(message) {
                var verifyInfo = Behavior.verify(message);
                if (true === verifyInfo.trust) {
                    message = verifyInfo.message;
                } else {
                    return;
                }
                if (message === '"ready"') {
                    transport.emit('ready');
                    if (config.isHost) {
                        pub.outgoing('ready');
                    }
                } else {
                    transport.emit('message', JSON.parse(message));
                }
            },
            outgoing: function(message) {
                message = Behavior.handleMessage(message);

                if (config.isHost) {
                    window.navigator[config.channel + '_remote'](message);
                } else {
                    window.navigator[config.channel + '_host'](message);
                }
            },
            init: function() {
                if (config.isHost) {
                    window.navigator[config.channel + '_host'] = pub.incoming;
                } else {
                    window.navigator[config.channel + '_remote'] = pub.incoming;
                    pub.outgoing('ready');
                }
            }
        };
        return pub;
    };

    Behavior.postMessage = function(config, transport) {
        var postFnHost;
        var pub = {
            incoming: function(message) {
                if (message.channel === config.channel) {
                    transport.emit('message', message);
                }
            },
            outgoing: function(message) {
                if (message === 'ready') {
                    message = {
                        channel: config.channel,
                        isReady: true
                    };
                } else {
                    message.channel = config.channel;
                }
                message = Behavior.handleMessage(message);
                postFnHost.postMessage(message, "*");
            },
            init: function() {
                $(window).on('message', function(event) {
                    var message = event.data;
                    var verifyInfo = Behavior.verify(message);

                    if (true === verifyInfo.trust) {
                        message = verifyInfo.message;
                    } else {
                        return;
                    }

                    message = JSON.parse(message);
                    if (message.channel === config.channel) {
                        if (message.isReady) {
                            if (config.isHost) {
                                pub.outgoing('ready');
                            }
                            transport.emit('ready');
                        } else {
                            pub.incoming(message);
                        }
                    }
                });

                if (config.isHost) {
                    var i = config.iframe;
                    postFnHost = ("postMessage" in i.contentWindow) ? i.contentWindow : i.contentWindow.document;
                } else {
                    postFnHost = ("postMessage" in window.parent) ? window.parent : window.parent.document;
                    pub.outgoing('ready');
                }
            }
        };
        return pub;
    };
})(RPC.behavior);
(function(RPC) {
    var extend = function(obj, ext, overwrite) {
        for (var prop in ext) {
            if (prop in obj) {
                var member = ext[prop];
                if (typeof member === 'object') {
                    extend(obj[prop], member, overwrite);
                } else if (overwrite) {
                    obj[prop] = ext[prop];
                }
            } else {
                obj[prop] = ext[prop];
            }
        }
        return obj;
    };

    var createFrame = function(config) {
        var iframe = null;
        try {
            iframe = document.createElement('<IFRAME name="' + config.channel + '">');
        } catch (e) {

        }

        if (!iframe || iframe.nodeName !== "IFRAME") {
            iframe = document.createElement("IFRAME");
            iframe.name = config.channel;
        }

        config.props = config.props || {};

        if (typeof config.container === "string") {
            config.container = document.getElementById(config.container);
        }
        extend(iframe.style, config.props.style, true);
        if (!config.container) {
            // This needs to be hidden like this, simply setting display:none and the like will cause failures in some browsers.
            extend(iframe.style, {
                position: "absolute",
                top: "-2000px",
                // Avoid potential horizontal scrollbar
                left: "0px"
            }, true);
        }

        // HACK: IE cannot have the src attribute set when the frame is appended
        //       into the container, so we set it to "javascript:false" as a
        //       placeholder for now.  If we left the src undefined, it would
        //       instead default to "about:blank", which causes SSL mixed-content
        //       warnings in IE6 when on an SSL parent page.
        config.props.src = 'javascript:false';
        // transfer properties to the frame
        extend(iframe, config.props, true);
        iframe.border = iframe.frameBorder = 0;
        iframe.allowTransparency = true;
        if (config.container) {
            config.container.appendChild(iframe);
        } else {
            config.container = document.body;
            $('body').prepend(iframe);
        }
        // set the frame URL to the proper value (we previously set it to
        // "javascript:false" to work around the IE issue mentioned above)
        // if (config.onLoad) {
        //     $(iframe).on('load', config.onLoad);
        // }
        iframe.src = config.remote;
        return iframe;
    };

    RPC.Transport = function(config) {
        var self = this,
            stack = [];
        var messages = [];
        Events.mixTo(this);

        if (!config.isHost) {
            config.channel = window.name;
        }

        switch (config.protocol) {
            case "1":
                stack = new RPC.behavior.postMessage(config, self);
                break;
            case "2":
                stack = new RPC.behavior.navigator(config, self);
                break;
        }

        config.onLoad = function() {
            stack.init();
        };

        this.on('ready', function() {
            self.send = function(message) {
                stack.outgoing(message);
            };

            for (var i = 0; i < messages.length; i++) {
                self.send(messages[i]);
            }
        });

        this.init = function() {
            if (config.isHost) {
                config.iframe = createFrame(config);
            }
            config.onLoad();
        };

        this.send = function(message) {
            messages.push(message);
        };

        this.destroy = function() {
            config.iframe.parentNode.removeChild(config.iframe);
        };
    };
})(RPC);