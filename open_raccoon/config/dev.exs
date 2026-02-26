import Config

# Database config for development
config :raccoon_shared, RaccoonShared.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "raccoon_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

# Phoenix endpoint config for development
config :raccoon_gateway, RaccoonGatewayWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4000],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base:
    "dev-secret-key-base-that-is-at-least-64-bytes-long-for-phoenix-to-accept-it-ok",
  watchers: []

config :raccoon_gateway, dev_routes: true

# Use local adapter for dev (emails logged to console)
config :raccoon_shared, RaccoonShared.Mailer, adapter: Swoosh.Adapters.Local

config :logger, :default_formatter, format: "[$level] $message\n"

config :phoenix, :stacktrace_depth, 20
config :phoenix, :plug_init_mode, :runtime
