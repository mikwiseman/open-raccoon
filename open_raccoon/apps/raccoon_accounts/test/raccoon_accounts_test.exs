defmodule RaccoonAccountsTest do
  use ExUnit.Case

  test "user changeset validates username format" do
    changeset = RaccoonAccounts.User.changeset(%RaccoonAccounts.User{}, %{username: "a b"})
    assert %{username: _} = errors_on(changeset)
  end

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
  end
end
