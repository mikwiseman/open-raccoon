defmodule RaccoonShared.Pagination do
  @moduledoc """
  Cursor-based pagination utilities.
  """
  import Ecto.Query

  @default_limit 50
  @max_limit 100

  defstruct [:next_cursor, :has_more]

  @type t :: %__MODULE__{next_cursor: String.t() | nil, has_more: boolean()}

  def parse_params(params) do
    limit = min(Map.get(params, "limit", @default_limit) |> to_integer(), @max_limit)
    cursor = Map.get(params, "cursor")
    {cursor, limit}
  end

  def apply_cursor(query, nil, _field), do: query

  def apply_cursor(query, cursor, field) do
    case decode_cursor(cursor) do
      {:ok, value} -> from(q in query, where: field(q, ^field) < ^value)
      :error -> query
    end
  end

  def build_page_info(items, limit) do
    has_more = length(items) > limit
    items = Enum.take(items, limit)
    next_cursor = if has_more, do: encode_cursor(List.last(items)), else: nil
    {items, %__MODULE__{next_cursor: next_cursor, has_more: has_more}}
  end

  def encode_cursor(%{id: id}), do: Base.url_encode64(id, padding: false)
  def encode_cursor(_), do: nil

  def decode_cursor(nil), do: :error

  def decode_cursor(cursor) do
    case Base.url_decode64(cursor, padding: false) do
      {:ok, value} -> {:ok, value}
      :error -> :error
    end
  end

  defp to_integer(v) when is_integer(v), do: v
  defp to_integer(v) when is_binary(v), do: String.to_integer(v)
  defp to_integer(_), do: nil
end
