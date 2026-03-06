defmodule WaiAgentsSharedTest do
  use ExUnit.Case

  test "ID generation produces prefixed UUIDs" do
    id = WaiAgentsShared.ID.generate(:user)
    assert String.starts_with?(id, "user_")
  end
end
