##iframe-rpc2

an easy to use JavaScript Cross-Domain RPC framework.

跨浏览器 RPC 通信组件。RPC 组件依赖 jQuery 以及 Events（src目录） 事件模块，这两个模块默认不打包。

### useage 使用方法

#### Create a connection 建立连接

##### in main page 主页面中
```javascript
var IframeRPC = require('iframe-rpc2.js');
var rpc = new IframeRPC({
    remote: "http://another.site/foo.html",
    onReady: function () {
        '...';
    },
    method: {
        // functions for remote
        main_fn1: function (arg1, arg2, arg3) {
            do_sth();
        },
        main_fn2: function (arg1, arg2, arg3) {
            var result = complex_fn();
            if (result) {
                return result;
            } else {
                throw new Error('Erroooooooooooor');
            }
        }
    }
});
```

##### in remote page 远程页面
```javascript
var IframeRpc = require('iframe-rpc2.js');

// in remote page, the 'remote' param must be 'undefined'.
var rpc = new IframeRPC({
    onReady: function () {
        '...';
    },
    method: {
        remote_fn1: function () {
            return 'result';
        }
    }
});
```

##### call remote method 调用远程方法
```
rpc('main_fn1', ['arg1', 'arg2']);

rpc('main_fn2', ['arg1', 'arg2', 'arg3', 'arg4'], function (result) {
    console.log(result);
});

```