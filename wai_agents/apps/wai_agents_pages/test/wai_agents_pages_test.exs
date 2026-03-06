defmodule WaiAgentsPagesTest do
  use ExUnit.Case

  test "page changeset requires title and slug" do
    changeset = WaiAgentsPages.Page.changeset(%WaiAgentsPages.Page{}, %{})
    refute changeset.valid?
  end
end
