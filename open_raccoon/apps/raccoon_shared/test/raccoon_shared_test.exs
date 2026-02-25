defmodule RaccoonSharedTest do
  use ExUnit.Case

  test "ID generation produces prefixed UUIDs" do
    id = RaccoonShared.ID.generate(:user)
    assert String.starts_with?(id, "user_")
  end
end
