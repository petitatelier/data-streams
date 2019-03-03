# data-streams/osc-stream

A [readable-](https://streams.spec.whatwg.org/#rs-model) and [writable stream](https://streams.spec.whatwg.org/#ws-model) of [OSC Messages](http://opensoundcontrol.org/spec-1_0), wrapping an underlying OSC Websocket client.

## Prequisites

Requires an _OSC relaying server_ running on local network, to bridge UDP datagrams received from an OSC controller to a Websocket, to which an `OSCStream` instance will connect. See _demo_ instructions hereafter.

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

Run following command and navigate to http://127.0.0.1:8081/demos/osc-stream.html:

    $ npm run dev:osc

The command will start an _OSC relaying server_, along with the local dev HTTP server,
enabling bi-directionnal communication between UDP (the transport protocol of OSC datagrams)
and a Web Socket (to which the `OSCStream` will connect to).

Before starting the _OSC Relay Server_, you might want to tweak its configuration; see
the config section of the [package.json](../../package.json) at the root of this monorepo.

## Known limitations

The underlying `osc-js` library used to handle OSC Messages currently cannot be
imported as a module. You'll need to install it in global scope before using
`OSCStream` from this package (hence the `<script src="../node_modules/osc-js/lib/osc.min.js">`
element in the _usage_ instructions hereabove). Hopefully it will evolve; I will
track progress in [issue #1](https://github.com/petitatelier/data-streams/issues/1).
