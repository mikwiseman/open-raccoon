defmodule WaiAgentsChatTest do
  use ExUnit.Case

  test "conversation changeset requires type" do
    changeset = WaiAgentsChat.Conversation.changeset(%WaiAgentsChat.Conversation{}, %{})
    refute changeset.valid?
  end
end
