defmodule WaiAgentsChat.Application do
  @moduledoc """
  OTP Application for wai_agents_chat.

  Starts the PresenceTracker and Typing GenServers
  under a supervised tree.
  """

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Task.Supervisor, name: WaiAgentsChat.TaskSupervisor},
      WaiAgentsChat.PresenceTracker,
      WaiAgentsChat.Typing
    ]

    opts = [strategy: :one_for_one, name: WaiAgentsChat.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
