defmodule RaccoonAgentsTest do
  use ExUnit.Case

  test "agent changeset requires name and slug" do
    changeset = RaccoonAgents.Agent.changeset(%RaccoonAgents.Agent{}, %{})
    refute changeset.valid?
  end
end
