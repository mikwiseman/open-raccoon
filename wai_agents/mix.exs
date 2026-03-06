defmodule WaiAgents.MixProject do
  use Mix.Project

  def project do
    [
      apps_path: "apps",
      version: "0.1.0",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      releases: releases()
    ]
  end

  defp releases do
    [
      wai_agents: [
        applications: [
          wai_agents_shared: :permanent,
          wai_agents_accounts: :permanent,
          wai_agents_chat: :permanent,
          wai_agents_agents: :permanent,
          wai_agents_feed: :permanent,
          wai_agents_bridges: :permanent,
          wai_agents_pages: :permanent,
          wai_agents_integrations: :permanent,
          wai_agents_gateway: :permanent
        ]
      ]
    ]
  end

  # Dependencies listed here are available only for this
  # project and cannot be accessed from applications inside
  # the apps folder.
  #
  # Run "mix help deps" for examples and options.
  defp deps do
    [
      {:pgvector, "~> 0.3"},
      {:crontab, "~> 1.1"},
      {:stripity_stripe, "~> 3.0"}
    ]
  end
end
