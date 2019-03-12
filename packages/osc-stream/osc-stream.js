// Library `osc-js` can only be imported in _global scope_ for now
// (not in _module scope_) and must be referenced with `self.OSC`.
// @see discussion in https://github.com/adzialocha/osc-js/issues/37
import "osc-js";

export const Default = Object.freeze({
  osc: {
    // Connect by default to ws://0.0.0.0:8080; in the context of the
    // browser, you might want to connect to `window.location.hostname`
    options: { host: "0.0.0.0", port: "8080" }
  }
});

/**
 * Wraps an _OSC Web Socket client_ in a duplex (readable and writable) stream.
 *
 * Usage:
 *
 *     import { OSCStream } from "../node_modules/@petitatelier/osc-stream";
 *
 *     const oscStream = new OSCStream({ host: window.location.hostname, port: 8080 });
 *     oscStream.readable
 *       .pipeTo( streamingElement.writable)
 *       .then(() => console.log( "All data successfully written!"))
 *       .catch(( err) => console.error( "Something went wrong!", err));
 */
export class OSCStream {
  constructor( options) {
    // Create the OSC WebSocket client
    const plugin = new self.OSC.WebsocketClientPlugin(); // see prerequisites above
    this.osc = new self.OSC({ plugin }); // idem
    this.options = Object.assign( {}, Default.osc.options, options);

    // Create and attach our readable- and writable stream interfaces
    this.readable = new ReadableStream( new OSCWebSocketSource( this.osc));
    this.writable = new WritableStream( new OSCWebSocketSink( this.osc));

    // Open OSC Web Socket
    const { host, port } = this.options; // `this.options`, not `options`
    this.osc.open({ host, port });

    // Register OSC message handlers; note that classes `OSCWebSocketSource`
    // and `OSCWebSocketSink` also register event listeners for those events
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

/**
 * Underlying source of the `ReadableStream()`.
 */
class OSCWebSocketSource {
  constructor( osc) {
    this.osc = osc;
  }

  // (The comments wrapped in « … » hereafter were copied verbatim from the spec,
  // to help setting up this class, see https://streams.spec.whatwg.org/#rs-class)

  // « A function that is called immediately during creation of the `ReadableStream`.
  // Typically this is used adapt a push source by setting up relevant event
  // listeners, or to acquire access to a pull source.
  //
  // If this setup process is asynchronous, it can return a promise to signal
  // success or failure; a rejected promise will error the stream. Any thrown
  // exceptions will be re-thrown by the `ReadableStream()` constructor. »
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
      controller.error( err); // Signal a terminal error
    });

    return new Promise( resolve =>
      this.osc.on( "open", resolve));
  }

  // « A function that is called whenever the consumer cancels the stream »
  cancel( reason) {
    console.debug( "OSCWebSocketSource() › Stream cancelled for reason:", reason);
    this.osc.close(); // will also close WS for the WritableStream
  }

  // « A function that is called whenever the stream’s internal queue
  // of chunks becomes not full, i.e. whenever the queue’s desired size
  // becomes positive. Generally, it will be called repeatedly until
  // the queue reaches its high water mark (i.e. until the desired
  // size becomes non-positive).
  //
  // For push sources, this can be used to resume a paused flow.
  // For pull sources, it is used to acquire new chunks to enqueue
  // into the stream. »
  //
  // pull( controller) {}
}

/**
 * Underlying sink of the `WritableStream()`.
 */
class OSCWebSocketSink {
  constructor( osc) {
    this.osc = osc;
  }

  // (The comments wrapped in « … » hereafter were copied verbatim from the spec,
  // to help setting up this class, see https://streams.spec.whatwg.org/#ws-class)

  // « A function that is called immediately during creation of the
  // `WritableStream`. Typically this is used to acquire access to
  // the underlying sink resource being represented.
  //
  // If this setup process is asynchronous, it can return a promise
  // to signal success or failure; a rejected promise will error
  // the stream. Any thrown exceptions will be re-thrown by the
  // `WritableStream()` constructor. »
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

  // « A function that is called when a new chunk of data is ready
  // to be written to the underlying sink. The stream implementation
  // guarantees that this function will be called only after previous
  // writes have succeeded, and never before start() has succeeded
  // or after close() or abort() have been called. »
  write( message) {
    console.debug( "OSCWebSocketSink() › Writing message:", message);
    this.osc.send( message);
  }

  // « A function that is called after the producer signals, via `writer.close()`,
  // that they are done writing chunks to the stream, and subsequently all
  // queued-up writes have successfully completed.
  //
  // This function can perform any actions necessary to finalize or flush writes
  // to the underlying sink, and release access to any held resources. »
  close() {
    console.debug( "OSCWebSocketSink() › Request to close stream");
    return this.osc.close();
  }

  // « The abort method aborts the stream, signaling that the producer
  // can no longer successfully write to the stream and it is to be
  // immediately moved to an errored state, with any queued-up writes
  // discarded. Will also execute any abort mechanism of the underlying sink. »
  abort( reason) {
    console.debug( "OSCWebSocketSink() › Request to abort stream for reason", reason);
    return this.osc.close();
  }
}

/**
 * A simple stream transformer, that formats an OSC Message as a string.
 * Just to show a use case of a transformer. You will probably write your own.
 *
 * Usage:
 *
 *     import { OSCStream, OSCMessageTextFormatter } from "../node_modules/@petitatelier/osc-stream";
 *
 *     const oscStream = new OSCStream({ host: window.location.hostname, port: 8080 });
 *     oscStream.readable
 *       .pipeThrough( OSCMessageTextFormatter)
 *       …
 */
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