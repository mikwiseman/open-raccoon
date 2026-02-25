import Config

# Shared Ecto repo config
config :raccoon_shared, ecto_repos: [RaccoonShared.Repo]

config :raccoon_shared, RaccoonShared.Repo,
  migration_primary_key: [type: :binary_id],
  migration_timestamps: [type: :utc_datetime_usec]

# Oban background job config
config :raccoon_shared, Oban,
  repo: RaccoonShared.Repo,
  queues: [
    default: 10,
    mailers: 20,
    media: 5,
    bridges: 10,
    agents: 5,
    feed: 10,
    maintenance: 2
  ]

# Phoenix gateway config
config :raccoon_gateway,
  generators: [timestamp_type: :utc_datetime_usec]

config :raccoon_gateway, RaccoonGatewayWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: RaccoonGatewayWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: RaccoonGateway.PubSub,
  live_view: [signing_salt: "zIWHx2T+"]

# Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Guardian JWT config
config :raccoon_accounts, RaccoonAccounts.Guardian,
  issuer: "raccoon",
  secret_key: "dev-guardian-secret-key-change-in-prod"

# Swoosh Mailer config (Resend in prod, overridden in dev/test)
config :raccoon_shared, RaccoonShared.Mailer,
  adapter: Swoosh.Adapters.Resend

# Base URL for magic links and email callbacks
config :raccoon_gateway, :base_url, "http://45.55.219.10:4000"

# JSON library
config :phoenix, :json_library, Jason

# Import environment specific config
import_config "#{config_env()}.exs"
