import Config

if System.get_env("PHX_SERVER") do
  config :raccoon_gateway, RaccoonGatewayWeb.Endpoint, server: true
end

config :raccoon_gateway, RaccoonGatewayWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))]

# Guardian secret key - required in all environments, no hardcoded fallback
guardian_secret_key =
  System.get_env("GUARDIAN_SECRET_KEY") ||
    raise """
    environment variable GUARDIAN_SECRET_KEY is missing.
    You can generate one by calling: mix guardian.gen.secret
    """

config :raccoon_accounts, RaccoonAccounts.Guardian,
  secret_key: guardian_secret_key

# Bridge credential encryption key (base64-encoded 32-byte key)
# Generate with: :crypto.strong_rand_bytes(32) |> Base.encode64()
bridge_encryption_key =
  System.get_env("BRIDGE_ENCRYPTION_KEY") ||
    raise """
    environment variable BRIDGE_ENCRYPTION_KEY is missing.
    Generate one with: elixir -e ':crypto.strong_rand_bytes(32) |> Base.encode64() |> IO.puts()'
    """

config :raccoon_bridges, bridge_encryption_key: bridge_encryption_key

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  config :raccoon_shared, RaccoonShared.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "open-raccoon.com"
  port = String.to_integer(System.get_env("PORT") || "4000")

  config :raccoon_gateway, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :raccoon_gateway, RaccoonGatewayWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [ip: {0, 0, 0, 0, 0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base,
    server: true

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

  config :raccoon_shared, RaccoonShared.Mailer,
    api_key: System.fetch_env!("RESEND_API_KEY")

  config :raccoon_gateway, :base_url,
    System.get_env("BASE_URL", "http://45.55.219.10:4000")
end
