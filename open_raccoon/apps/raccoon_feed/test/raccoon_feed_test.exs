defmodule RaccoonFeedTest do
  use ExUnit.Case

  test "feed item changeset requires type and reference" do
    changeset = RaccoonFeed.FeedItem.changeset(%RaccoonFeed.FeedItem{}, %{})
    refute changeset.valid?
  end
end
