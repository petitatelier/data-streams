import 'osc-js';

const Default = Object.freeze({
  osc: {
    options: { host: "0.0.0.0", port: "8080" }
  }
});
class OSCStream {
  constructor( options) {
    const plugin = new self.OSC.WebsocketClientPlugin();
    this.osc = new self.OSC({ plugin });
    this.options = Object.assign( {}, Default.osc.options, options);
    this.readable = new ReadableStream( new OSCWebSocketSource( this.osc));
    this.writable = new WritableStream( new OSCWebSocketSink( this.osc));
    const { host, port } = this.options;
    this.osc.open({ host, port });
    this.osc.on( "open", () => {
      console.debug( `OSCStream › Connected to \`ws://${host}:${port}\`.`);
    });
    this.osc.on( "close", () => {
      console.debug( `OSCStream › Disconnected from \`ws://${host}:${port}\`.`);
    });
    this.osc.on( "error", (err) => {
      console.error( `OSCStream › Error from \`ws://${host}:${port}\`:`, err);
      this.osc.close();
    });
  }
}
class OSCWebSocketSource {
  constructor( osc) {
    this.osc = osc;
  }
  start( controller) {
    this.osc.on( "*", (message) => {
      console.debug( "OSCWebSocketSource() › OSC message received:", message);
      controller.enqueue( message);
    });
    this.osc.on( "close", () => {
      console.debug( "OSCWebSocketSource() › Closing stream");
      controller.close();
    });
    this.osc.on( "error", (err) => {
      console.error( `OSCWebSocketSource › Error:`, err);
      controller.error( err);
    });
    return new Promise( resolve =>
      this.osc.on( "open", resolve));
  }
  cancel( reason) {
    console.debug( "OSCWebSocketSource() › Stream cancelled for reason:", reason);
    this.osc.close();
  }
}
class OSCWebSocketSink {
  constructor( osc) {
    this.osc = osc;
  }
  start( controller) {
    this.osc.on( "close", () => {
      controller.error( new Error( "OSCWebSocketSink() › The server closed the connection unexpectedly!"));
    });
    this.osc.on( "error", (error) => {
      controller.error( new Error( "OSCWebSocketSink() › The WebSocket errored!", err));
    });
    return new Promise( resolve =>
      this.osc.on( "open", resolve));
  }
  write( message) {
    console.debug( "OSCWebSocketSink() › Writing message:", message);
    this.osc.send( message);
  }
  close() {
    console.debug( "OSCWebSocketSink() › Request to close stream");
    return this.osc.close();
  }
  abort( reason) {
    console.debug( "OSCWebSocketSink() › Request to abort stream for reason", reason);
    return this.osc.close();
  }
}
const OSCMessageTextFormatter = makeMapperTransformStream(
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

export { Default, OSCMessageTextFormatter, OSCStream };
