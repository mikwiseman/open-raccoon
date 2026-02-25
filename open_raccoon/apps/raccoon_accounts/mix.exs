defmodule RaccoonAccounts.MixProject do
  use Mix.Project

  def project do
    [
      app: :raccoon_accounts,
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
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:raccoon_shared, in_umbrella: true},
      {:argon2_elixir, "~> 4.1"},
      {:guardian, "~> 2.3"},
      {:ueberauth, "~> 0.10"},
      {:ueberauth_google, "~> 0.12"},
      {:ueberauth_github, "~> 0.8"}
    ]
  end
end
