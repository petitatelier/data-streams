#!/usr/bin/env node

/**
 * _OSC bridge server_, enabling bi-directional OSC messaging between
 * Websocket <-> UDP.
 *
 * Bridges OSC messages sent/received over UDP from a remote OSC controller
 * (TouchOSC or Lemur apps running on an iPad, for instance) to a remote
 * OSC client web app over a Web Socket (the ‹osc-stream› demo for instance).
 *
 * Usage:
 *
 *     $ node cli.js [ -- --auto-ping ]
 *
 * Configuration:
 *
 * Following NPM environment variables should be defined in the `config`
 * section of the `package.json` using this package as a dependency:
 *
 *     {
 *       …,
 *       "config": {
 *         "osc-bridge": {
 *           "udp-server": {
 *             "host": "0.0.0.0",
 *             "port": "7400"
 *           },
 *           "udp-client": {
 *             "host": "192.168.xxx.yyy",
 *             "port": "7500"
 *           },
 *           "ws-server": {
 *             "host": "0.0.0.0",
 *             "port": "8080"
 *           }
 *         }
 *       },
 *       "devDependencies": {
 *         "osc-bridge": "latest",
 *         …
 *       }
 *       …
 *     }
 *
 * Options:
 *
 * * `ws-server` defines the host and port to which the bridge binds
 *   its Web Socket – that is, where the client app connects to.
 *   Usually IP `0.0.0.0` and any free port.
 *
 * * `udp-client` defines the host and port of the remote OSC controller,
 *   to which OSC messages from the client app should be forwarded.
 *
 *   You need to check within the remote OSC controller app to find
 *   its host IP address, and the port it listens for incoming messages.
 *
 * * `udp-server` defines the host and port where this bridge listens
 *   for UDP datagrams – that is, where the remote OSC controller
 *   connects to, and from which the bridge receives OSC messages,
 *   that it will forward to the client app.
 *
 *   Use `0.0.0.0` to listen on all local network interfaces, and any
 *   free port. The remote OSC controller will need to be configured
 *   to send its OSC outgoing messages to the IP address of this
 *   bridge server and the port choosen here.
 *
 *   Upon start, this bridge server will list the IP addresses of
 *   all local network interfaces of its host, to ease setup.
 */
const OSC = require( "osc-js");

const AUTO_PING_INTERVAL = 5000; // in milliseconds

const oscBridgeConfig = {
  // @param {string} Where messages sent via `send()` method will be
  //   delivered to: "ws" for Websocket clients, "udp" for UDP client
  receiver: "ws",

  udpServer: {
    // @param {string} Hostname of UDP server to bind to
    host: process.env.npm_package_config_osc_bridge_udp_server_host || "localhost",
    // @param {number} Port of UDP server to bind to
    port: process.env.npm_package_config_osc_bridge_udp_server_port || 8000,
    // @param {boolean} Exclusive flag
    exclusive: false
  },
  udpClient: {
    // @param {string} Hostname of UDP client for messaging
    host: process.env.npm_package_config_osc_bridge_udp_client_host || "localhost",
    // @param {number} Port of UDP client for messaging
    port: process.env.npm_package_config_osc_bridge_udp_client_port || 9000
  },
  wsServer: {
    // @param {string} Hostname of WebSocket server
    host: process.env.npm_package_config_osc_bridge_ws_server_host || "localhost",
    // @param {number} Port of WebSocket server
    port: process.env.npm_package_config_osc_bridge_ws_server_port || 8080
  }
}

function getLocalHostIPAddresses() {
  const os = require( "os"),
        interfaces = os.networkInterfaces(),
        ipAddresses = [];

  for( let deviceName in interfaces) {
    const addresses = interfaces[ deviceName];
    for( let i = 0; i < addresses.length; i++) {
      const addressInfo = addresses[ i];
      if( addressInfo.family === "IPv4" && !addressInfo.internal) {
        ipAddresses.push( `${deviceName}: \`${addressInfo.address}\``);
      }
    }
  }
  return ipAddresses;
}

function showConfig( config) {
  const ipAddresses = getLocalHostIPAddresses();
  console.info(
    `Bridging OSC over Web Socket to/from \`ws://${config.wsServer.host}:${config.wsServer.port}\``);
  console.log(
    `Listening for OSC over UDP on \`${config.udpServer.host}:${config.udpServer.port}\``);
  console.info(
    `Broadcasting OSC over UDP to \`${config.udpClient.host}:${config.udpClient.port}\``);
  console.info(
    `Local host reachable at: [ ${ipAddresses.join( ", ")} ]`);
}

function start() {
  const plugin = new OSC.BridgePlugin( oscBridgeConfig);
  const osc = new OSC({ plugin });

  osc.open();
  osc.on( "open", () => showConfig( oscBridgeConfig));
  osc.on( "close", () => console.info( "Connection was closed."));
  osc.on( "error", (err) => console.error( "An error occurred:", err));
  // osc.options.plugin.socket.on( "message", (msg) => console.log( "OSC msg on socket:", msg));

  return osc;
}

function autoSendPing( osc, interval) {
  function sendPing( osc) {
    const message = new OSC.Message( "/ping", ++count, Date.now())
    console.log( "Sending OSC message: /ping", message.args);
    osc.send( message);
  }

  let count = 0;
  console.log( `Will ping WS every ${interval}ms with count and current time`);
  setInterval( sendPing, interval, osc);
}

// Start the OSC bridge server
console.log( "OSC Websocket <-> UDP bridge server");
const osc = start();

// Enable auto pinging the WS if `--auto-ping` argument was given
const [ , , ...args ] = process.argv;
if( args.indexOf( "--auto-ping") > -1) {
  autoSendPing( osc, AUTO_PING_INTERVAL); // interval in milliseconds
}

// Stop the OSC bridge server on CTRL-C keypress in the terminal
process.on( "SIGINT", function() {
  console.info( "Received CTRL-C, stopping OSC bridge.")
  osc.close();
  process.exit();
});