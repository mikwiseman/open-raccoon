defmodule RaccoonShared.Error do
  @moduledoc """
  Structured error types for the Open Raccoon platform.
  """

  @type t :: %__MODULE__{code: String.t(), message: String.t(), details: map()}

  defstruct [:code, :message, details: %{}]

  def not_found(resource \\ "resource") do
    %__MODULE__{code: "not_found", message: "#{resource} not found"}
  end

  def validation_failed(message, details \\ %{}) do
    %__MODULE__{code: "validation_failed", message: message, details: details}
  end

  def rate_limited(retry_after \\ nil) do
    %__MODULE__{
      code: "rate_limited",
      message: "Rate limit exceeded",
      details: %{retry_after: retry_after}
    }
  end

  def idempotency_conflict do
    %__MODULE__{code: "idempotency_conflict", message: "Conflicting idempotency key"}
  end

  def tool_permission_denied(tool) do
    %__MODULE__{
      code: "tool_permission_denied",
      message: "Tool execution was denied by user policy",
      details: %{tool: tool}
    }
  end

  def bridge_not_connected(platform) do
    %__MODULE__{
      code: "bridge_not_connected",
      message: "Bridge is not connected",
      details: %{platform: platform}
    }
  end

  def deadline_exceeded do
    %__MODULE__{code: "deadline_exceeded", message: "Operation timed out"}
  end

  def forbidden do
    %__MODULE__{code: "forbidden", message: "You do not have permission to perform this action"}
  end
end
