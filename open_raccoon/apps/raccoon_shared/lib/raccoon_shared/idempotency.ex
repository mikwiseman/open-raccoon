defmodule RaccoonShared.Idempotency do
  @moduledoc """
  Idempotency key tracking for safe retries.
  """
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "idempotency_keys" do
    field :key, :string
    field :user_id, :binary_id
    field :response_code, :integer
    field :response_body, :map
    field :expires_at, :utc_datetime_usec
    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(record, attrs) do
    record
    |> cast(attrs, [:key, :user_id, :response_code, :response_body, :expires_at])
    |> validate_required([:key, :user_id, :expires_at])
    |> unique_constraint([:key, :user_id])
  end

  @doc "Check if an idempotency key exists and is not expired"
  def check(repo, key, user_id) do
    now = DateTime.utc_now()

    query =
      from(ik in __MODULE__,
        where: ik.key == ^key and ik.user_id == ^user_id and ik.expires_at > ^now
      )

    case repo.one(query) do
      nil -> :not_found
      record -> {:found, record}
    end
  end

  @doc "Store an idempotency result with 24hr expiry"
  def store(repo, key, user_id, response_code, response_body) do
    expires_at = DateTime.add(DateTime.utc_now(), 24 * 3600, :second)

    %__MODULE__{}
    |> changeset(%{
      key: key,
      user_id: user_id,
      response_code: response_code,
      response_body: response_body,
      expires_at: expires_at
    })
    |> repo.insert(on_conflict: :nothing)
  end
end
