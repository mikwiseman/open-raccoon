defmodule RaccoonChatTest do
  use ExUnit.Case

  test "conversation changeset requires type" do
    changeset = RaccoonChat.Conversation.changeset(%RaccoonChat.Conversation{}, %{})
    refute changeset.valid?
  end
end
