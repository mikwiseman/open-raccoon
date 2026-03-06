defmodule WaiAgentsAgentsTest do
  use ExUnit.Case

  test "agent changeset requires name and slug" do
    changeset = WaiAgentsAgents.Agent.changeset(%WaiAgentsAgents.Agent{}, %{})
    refute changeset.valid?
  end
end
