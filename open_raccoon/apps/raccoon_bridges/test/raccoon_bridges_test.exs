defmodule RaccoonBridgesTest do
  use ExUnit.Case

  test "bridge changeset requires platform and method" do
    changeset = RaccoonBridges.BridgeConnection.changeset(%RaccoonBridges.BridgeConnection{}, %{})
    refute changeset.valid?
  end
end
