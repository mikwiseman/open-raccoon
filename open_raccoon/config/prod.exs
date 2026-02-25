import Config

config :raccoon_gateway, RaccoonGatewayWeb.Endpoint,
  force_ssl: [rewrite_on: [:x_forwarded_proto]],
  exclude: [
    hosts: ["localhost", "127.0.0.1"]
  ],
  cache_static_manifest: "priv/static/cache_manifest.json"

config :logger, level: :info
