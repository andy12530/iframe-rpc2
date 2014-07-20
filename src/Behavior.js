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