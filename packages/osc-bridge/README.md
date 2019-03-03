# data-streams/osc-bridge

An _OSC bridge server_, enabling bi-directional OSC messaging between
Websocket <-> UDP.

It is meant to be used by client apps, that use a Web Socket client
to receive/send OSC messages from/to a remote OSC controller, which
would only send/receive UDP datagrams.

## Setup

    $ npm install

## Usage

    $ osc-bridge [ --auto-ping ]

## Configuration

Before starting the _OSC bridge server_, you might want to tweak its configuration;
add following NPM environment variables in the `config` section of your `package.json`:

    {
      …,
      "config": {
        "osc-bridge": {
          "udp-server": {
            "host": "0.0.0.0",
            "port": "7400"
          },
          "udp-client": {
            "host": "192.168.xxx.yyy",
            "port": "7500"
          },
          "ws-server": {
            "host": "0.0.0.0",
            "port": "8080"
          }
        }
      },
      "devDependencies": {
        "osc-bridge": "latest",
        …
      }
      …
    }

See the [package.json](../../package.json) at the root of this monorepo
for an example.