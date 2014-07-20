#iframe-rpc2

an easy to use JavaScript Cross-Domain RPC framework.

## useage

### Create a connection

#### in main page
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

#### in remote page
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

#### call remote method
```
rpc('main_fn1', ['arg1', 'arg2']);

rpc('main_fn2', ['arg1', 'arg2', 'arg3', 'arg4'], function (result) {
    console.log(result);
});

```