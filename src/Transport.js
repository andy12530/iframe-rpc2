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