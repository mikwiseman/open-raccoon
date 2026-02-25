defmodule RaccoonAgents.MixProject do
  use Mix.Project

  def project do
    [
      app: :raccoon_agents,
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
      mod: {RaccoonAgents.Application, []}
    ]
  end

  defp deps do
    [
      {:raccoon_shared, in_umbrella: true},
      {:raccoon_accounts, in_umbrella: true},
      {:grpc, "~> 0.9"},
      {:protobuf, "~> 0.13"},
      {:phoenix_pubsub, "~> 2.1"},
      {:jason, "~> 1.4"}
    ]
  end
end
