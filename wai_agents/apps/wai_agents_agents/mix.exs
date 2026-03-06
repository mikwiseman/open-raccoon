defmodule WaiAgentsAgents.MixProject do
  use Mix.Project

  def project do
    [
      app: :wai_agents_agents,
      version: "0.1.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.19",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {WaiAgentsAgents.Application, []}
    ]
  end

  defp deps do
    [
      {:wai_agents_shared, in_umbrella: true},
      {:wai_agents_accounts, in_umbrella: true},
      {:grpc, "~> 0.9"},
      {:protobuf, "~> 0.14"},
      {:phoenix_pubsub, "~> 2.1"},
      {:jason, "~> 1.4"},
      {:pgvector, "~> 0.3"},
      {:crontab, "~> 1.1"}
    ]
  end
end
