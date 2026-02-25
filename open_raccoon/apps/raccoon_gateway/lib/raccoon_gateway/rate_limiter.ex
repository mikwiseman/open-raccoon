defmodule RaccoonGateway.RateLimiter do
  @moduledoc """
  ETS-backed rate limiter for the gateway.
  Uses Hammer 7.x module-based API.
  """
  use Hammer, backend: :ets
end
