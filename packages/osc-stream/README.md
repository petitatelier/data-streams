# data-streams/osc-stream

A [readable-](https://streams.spec.whatwg.org/#rs-model) and [writable stream](https://streams.spec.whatwg.org/#ws-model) of [OSC Messages](http://opensoundcontrol.org/spec-1_0), wrapping an underlying [OSC Websocket client](https://github.com/adzialocha/osc-js/wiki/Websocket-Client-Plugin) (from the [@adzialocha/osc-js](https://github.com/adzialocha/osc-js/) library).

## Prequisites

Requires an _OSC bridge server_ running on your local network, to enable bi-directional messaging between the `OSCStream` class instance and a remote OSC controller.

You can use the [@petitatelier/osc-bridge](https://github.com/petitatelier/data-streams/tree/master/packages/osc-bridge) command-line utility to start one. See _demo_ instructions hereafter.

## Usage

```html
  <script src="../node_modules/osc-js/lib/osc.min.js"></script>
  <script type="module">
    import { OSCStream , OSCMessageHTMLFormatter } from "../node_modules/@petitatelier/osc-stream";
    const oscStream = new OSCStream({ host: "0.0.0.0", port: 8080 });

    oscStream.readable
      .pipeThrough( OSCMessageHTMLFormatter)
      .pipeTo( streamingElement.writable)
      .catch( err => console.error( "Something went wrong!", err));

    const oscWriter = oscStream.writable.getWriter();
    oscWriter.write( new self.OSC.Message( "/ping"))
      .catch( err => console.error( "Something went wrong!", err));
  </script>
```

## Demo

<img height="250" title="`OSCStream` class demo · Screencopy"
  src="../../demos/images/osc-stream-demo-screencopy.png" >

Run following command and navigate to http://127.0.0.1:8081/demos/osc-stream.html:

    $ npm run dev:osc

The command will start an _OSC bridge server_, along with the local dev HTTP server,
enabling bi-directional messaging between a remote OSC controller and the `OSCStream`
class instance of the demo.

Before starting the _OSC bridge server_, you might want to tweak its configuration;
see the `config` section of the [package.json](../../package.json) at the root of
this monorepo.

You will also need to configure your OSC controller app, to send its outgoing
messages to the _OSC bridge server_. Use the IP address of the network adapter
listed by the _OSC bridge server_ upon start.

## Known limitations

The underlying `osc-js` library used to handle OSC Messages currently cannot be
imported as a module. You'll need to install it in global scope before using
`OSCStream` from this package (hence the `<script src="../node_modules/osc-js/lib/osc.min.js">`
element in the _usage_ instructions hereabove). Hopefully it will evolve; I will
track progress in [issue #1](https://github.com/petitatelier/data-streams/issues/1).
