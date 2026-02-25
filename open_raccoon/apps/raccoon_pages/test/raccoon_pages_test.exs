defmodule RaccoonPagesTest do
  use ExUnit.Case

  test "page changeset requires title and slug" do
    changeset = RaccoonPages.Page.changeset(%RaccoonPages.Page{}, %{})
    refute changeset.valid?
  end
end
