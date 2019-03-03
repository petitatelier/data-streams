/**
 * OSCStream
 *
 * Usage:
 *
 *    const oscStream = new OSCStream({ host: window.location.hostname, port: 8080 });
 *    oscStream.readable
 *      .pipeThrough( OSCMessageTextFormatter)
 *      .pipeTo( streamingElement.writable)
 *      .then(() => console.log( "All data successfully written!"))
 *      .catch(( err) => console.error( "Something went wrong!", err));
 */

// import { OSC } from "osc-js";
// @see [Importing OSC-js from ES module does not work](https://github.com/adzialocha/osc-js/issues/37)
//
// Workaround: add a `<script src="../node_modules/osc-js/lib/osc.min.js"></script>` element in
// the HTML page that uses this `osc-stream` package (sigh); see [demo](../../demos/osc-stream.html).

export const Default = Object.freeze({
  osc: {
    // Connect by default to ws://0.0.0.0:8080; in the context of the
    // browser, you might want to connect to `window.location.hostname`
    options: { host: "0.0.0.0", port: "8080" }
  }
});

export class OSCStream {
  constructor( options) {
    const plugin = new self.OSC.WebsocketClientPlugin();

    this.osc = new self.OSC({ plugin });
    this.options = Object.assign( {}, Default.osc.options, options);

    this.readable = new ReadableStream( new OSCWebSocketSource( this.osc, this.options));
    // TODO: this.writable = new WritableStream( new OSCWebSocketSink( this.osc, this.options));
  }
}

class OSCWebSocketSource {
  constructor( osc, options) {
    return {
      start( controller) {
        const { host, port } = options;

        // Open Web Socket
        osc.open({ host, port });

        // Register OSC message handlers
        osc.on( "open", () => {
          console.debug( `OSCStream connected to \`ws://${host}:${port}\`.`);
        });

        osc.on( "close", () => {
          console.debug( `OSCStream disconnected from \`ws://${host}:${port}\`.`);
        });

        osc.on( "error", (err) => {
          console.error( `OSCStream error from \`ws://${host}:${port}\`:`, err);
          controller.error( err); // Signal a terminal error
          osc.close();
        });

        osc.on( "*", (message) => {
          console.debug( "OSC message received:", message);
          controller.enqueue( message);
        });
      },

      cancel( reason) {
        console.debug( "Stream cancelled for reason:", reason);
        osc.close();
      }
    };
  }
}

export const OSCMessageTextFormatter = makeMapperTransformStream(
  (message) => {
    return `OSC Message [${message.address}]: ${message.args}`;
  }
);

function makeMapperTransformStream( mapperFn) {
  return new TransformStream({
    transform( chunk, controller) {
      controller.enqueue( mapperFn( chunk));
    }
  });
}