# cncjs-pendant-tinyweb [![Travis CI Build Status](https://travis-ci.org/cncjs/cncjs-pendant-tinyweb.svg)](https://travis-ci.org/cncjs/cncjs-pendant-tinyweb)

### A tiny web console for small 320x240 LCD display 

For users who want the jog function on a small 320x240 LCD display, use the mount option to set a mount point to serve static files. For example:
```
$ cnc -h
  Usage: cnc [options]
  Options:
    -m, --mount [<url>:]<absolute-path>  set the mount point for serving static files (default: /static:static)
```

First, download the latest zip file from https://github.com/cncjs/cncjs-pendant-tinyweb/releases and save it to your Raspberry Pi to serve as static files. Let's assume you extract the zip file within the `/home` directory, you will see the a `tinyweb` directory under `/home` after extraction.

Then, run cnc with the `-m` option, like below:
```
$ cnc -m /pendant:/home/tinyweb
```

After that, you should be able to see the tinyweb console as shown below at `http://localhost:8000/pendant/`.

![tinyweb-axes.png](https://raw.githubusercontent.com/cncjs/cncjs/master/media/tinyweb-axes.png)

It should fit perfectly with your 320x240 LCD display.
