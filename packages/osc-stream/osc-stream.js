// import { OSC } from "osc-js";
// @see [Importing OSC-js from ES module does not work](https://github.com/adzialocha/osc-js/issues/37)
//
// Workaround: add a `<script src="../node_modules/osc-js/lib/osc.min.js"></script>` element in
// the HTML page that uses this `osc-stream` package (sigh); see [demo](../../demos/osc-stream.html).

export const Default = Object.freeze({
  osc: {
    // Connect by default to ws://localhost:8080
    options: { host: "0.0.0.0", port: "8080" }
  }
});

function makeMapperTransformStream( mapperFn) {
  return new TransformStream({
    transform( chunk, controller) {
      controller.enqueue( mapperFn( chunk));
    }
  });
}

export const OSCMessageHTMLFormatter = makeMapperTransformStream(( message) => {
  return `OSC Message [${message.address}]: ${message.args}<br/>`;
});

export class OSCStream {
  constructor( options) {
    const { host, port } = Object.assign( {}, Default.osc.options, options),
          plugin = new self.OSC.WebsocketClientPlugin(),
          that = this;

    this.osc = new self.OSC({ plugin });
    this.host = host;
    this.port = port;

    this.readable = new ReadableStream({
      start( controller) {
        const { osc, host, port } = that;

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
    });
  }
}