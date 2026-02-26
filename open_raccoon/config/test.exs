import Config

config :raccoon_shared, RaccoonShared.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "raccoon_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

config :raccoon_gateway, RaccoonGatewayWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base:
    "test-secret-key-base-that-is-at-least-64-bytes-long-for-phoenix-to-accept-it-ok",
  server: false

config :raccoon_shared, Oban, testing: :inline

config :logger, level: :warning

config :argon2_elixir, t_cost: 1, m_cost: 8

config :phoenix, :plug_init_mode, :runtime
config :phoenix, sort_verified_routes_query_params: true
