defmodule RaccoonChat.MixProject do
  use Mix.Project

  def project do
    [
      app: :raccoon_chat,
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
      mod: {RaccoonChat.Application, []},
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:raccoon_shared, in_umbrella: true},
      {:raccoon_accounts, in_umbrella: true},
      {:phoenix_pubsub, "~> 2.1"}
    ]
  end
end
