defmodule WaiAgentsFeedTest do
  use ExUnit.Case

  test "feed item changeset requires type and reference" do
    changeset = WaiAgentsFeed.FeedItem.changeset(%WaiAgentsFeed.FeedItem{}, %{})
    refute changeset.valid?
  end
end
