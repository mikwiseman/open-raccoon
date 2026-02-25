defmodule RaccoonShared.MixProject do
  use Mix.Project

  def project do
    [
      app: :raccoon_shared,
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
      mod: {RaccoonShared.Application, []},
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:ecto_sql, "~> 3.12"},
      {:postgrex, "~> 0.19"},
      {:jason, "~> 1.4"},
      {:oban, "~> 2.19"},
      {:ex_aws, "~> 2.5"},
      {:ex_aws_s3, "~> 2.5"}
    ]
  end
end
