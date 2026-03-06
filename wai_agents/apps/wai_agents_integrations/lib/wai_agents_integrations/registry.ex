defmodule WaiAgentsIntegrations.IntegrationRegistry do
  @moduledoc """
  Registry of all available integration modules.

  Provides lookup by service name and listing of all integrations.
  Integration modules register themselves using `use WaiAgentsIntegrations.IntegrationRegistry`.
  """

  @integrations %{
    "telegram" => WaiAgentsIntegrations.Integrations.Telegram,
    "whatsapp" => WaiAgentsIntegrations.Integrations.WhatsApp,
    "gmail" => WaiAgentsIntegrations.Integrations.Gmail,
    "google_calendar" => WaiAgentsIntegrations.Integrations.GoogleCalendar,
    "google_drive" => WaiAgentsIntegrations.Integrations.GoogleDrive,
    "github" => WaiAgentsIntegrations.Integrations.GitHub,
    "slack" => WaiAgentsIntegrations.Integrations.Slack,
    "discord" => WaiAgentsIntegrations.Integrations.Discord,
    "notion" => WaiAgentsIntegrations.Integrations.Notion,
    "twitter" => WaiAgentsIntegrations.Integrations.Twitter
  }

  @doc "List all registered integration modules."
  def list_integrations do
    @integrations
  end

  @doc "Get the integration module for a service name."
  def get_integration(service) when is_binary(service) do
    case Map.get(@integrations, service) do
      nil -> {:error, :unknown_service}
      module -> {:ok, module}
    end
  end

  @doc "Get all service names."
  def service_names do
    Map.keys(@integrations)
  end
end
