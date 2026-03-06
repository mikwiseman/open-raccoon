defmodule WaiAgentsIntegrations.MixProject do
  use Mix.Project

  def project do
    [
      app: :wai_agents_integrations,
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
      mod: {WaiAgentsIntegrations.Application, []},
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:wai_agents_shared, in_umbrella: true},
      {:wai_agents_accounts, in_umbrella: true},
      {:wai_agents_agents, in_umbrella: true},
      {:wai_agents_bridges, in_umbrella: true},
      {:req, "~> 0.5"},
      {:oban, "~> 2.20"},
      {:plug_crypto, "~> 2.0"}
    ]
  end
end
