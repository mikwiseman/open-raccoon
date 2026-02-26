defmodule RaccoonChat.Application do
  @moduledoc """
  OTP Application for raccoon_chat.

  Starts the PresenceTracker and Typing GenServers
  under a supervised tree.
  """

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Task.Supervisor, name: RaccoonChat.TaskSupervisor},
      RaccoonChat.PresenceTracker,
      RaccoonChat.Typing
    ]

    opts = [strategy: :one_for_one, name: RaccoonChat.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
