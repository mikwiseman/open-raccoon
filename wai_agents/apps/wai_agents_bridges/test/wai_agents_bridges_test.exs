defmodule WaiAgentsBridgesTest do
  use ExUnit.Case

  test "bridge changeset requires platform and method" do
    changeset = WaiAgentsBridges.BridgeConnection.changeset(%WaiAgentsBridges.BridgeConnection{}, %{})
    refute changeset.valid?
  end
end
