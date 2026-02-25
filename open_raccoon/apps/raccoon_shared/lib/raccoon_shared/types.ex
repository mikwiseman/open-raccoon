defmodule RaccoonShared.Types do
  @moduledoc """
  Enum type definitions used across the Open Raccoon platform.
  Used with Ecto.Enum in schemas.
  """

  @user_statuses [:active, :suspended, :deleted]
  @user_roles [:user, :admin, :moderator]
  @conversation_types [:dm, :group, :agent, :bridge]
  @sender_types [:human, :agent, :bridge, :system]
  @message_types [:text, :media, :code, :embed, :system, :agent_status]
  @member_roles [:owner, :admin, :member]
  @agent_visibilities [:public, :unlisted, :private]
  @bridge_platforms [:telegram, :whatsapp, :signal, :discord]
  @bridge_methods [:user_level, :bot, :cloud_api]
  @bridge_statuses [:connected, :reconnecting, :disconnected, :error]
  @feed_item_types [:agent_showcase, :page_showcase, :tool_showcase, :remix, :creation]
  @feed_reference_types [:agent, :page, :tool]

  def user_statuses, do: @user_statuses
  def user_roles, do: @user_roles
  def conversation_types, do: @conversation_types
  def sender_types, do: @sender_types
  def message_types, do: @message_types
  def member_roles, do: @member_roles
  def agent_visibilities, do: @agent_visibilities
  def bridge_platforms, do: @bridge_platforms
  def bridge_methods, do: @bridge_methods
  def bridge_statuses, do: @bridge_statuses
  def feed_item_types, do: @feed_item_types
  def feed_reference_types, do: @feed_reference_types
end
