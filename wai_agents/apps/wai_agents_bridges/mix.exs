defmodule WaiAgentsBridges.MixProject do
  use Mix.Project

  def project do
    [
      app: :wai_agents_bridges,
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
      mod: {WaiAgentsBridges.Application, []},
      extra_applications: [:logger, :inets, :ssl]
    ]
  end

  defp deps do
    [
      {:wai_agents_shared, in_umbrella: true},
      {:wai_agents_accounts, in_umbrella: true},
      {:wai_agents_chat, in_umbrella: true}
    ]
  end
end
