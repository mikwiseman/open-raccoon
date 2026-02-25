defmodule RaccoonShared.ID do
  @moduledoc """
  Prefixed ID generation for all Open Raccoon entities.
  """

  @prefixes %{
    user: "user_",
    conversation: "conv_",
    message: "msg_",
    agent: "agt_",
    page: "page_",
    bridge: "brg_",
    feed_item: "fi_",
    credential: "cred_",
    rating: "rat_",
    reaction: "rxn_",
    follow: "fol_",
    like: "lik_",
    version: "ver_",
    member: "mem_",
    approval: "apr_"
  }

  @spec generate(atom()) :: String.t()
  def generate(type) when is_map_key(@prefixes, type) do
    @prefixes[type] <> Ecto.UUID.generate()
  end

  @spec prefix(atom()) :: String.t()
  def prefix(type) when is_map_key(@prefixes, type), do: @prefixes[type]
end
