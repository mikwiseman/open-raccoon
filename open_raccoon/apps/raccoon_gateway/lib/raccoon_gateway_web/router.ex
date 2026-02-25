defmodule RaccoonGatewayWeb.Router do
  use RaccoonGatewayWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api/v1", RaccoonGatewayWeb do
    pipe_through :api

    # Auth
    post "/auth/register", AuthController, :register
    post "/auth/login", AuthController, :login
    post "/auth/refresh", AuthController, :refresh
    delete "/auth/logout", AuthController, :logout

    # Users
    get "/users/me", UserController, :me
    patch "/users/me", UserController, :update
    get "/users/:username", UserController, :show

    # Conversations
    resources "/conversations", ConversationController, only: [:index, :create, :show, :update, :delete] do
      resources "/messages", MessageController, only: [:index, :create]
      resources "/members", MemberController, only: [:index, :create, :delete]
    end

    # Agents
    resources "/agents", AgentController, only: [:index, :create, :show, :update, :delete]
    post "/agents/:id/conversation", AgentController, :start_conversation

    # Pages
    resources "/pages", PageController, only: [:index, :create, :show, :update]
    post "/pages/:id/deploy", PageController, :deploy
    post "/pages/:id/fork", PageController, :fork
    get "/pages/:id/versions", PageController, :versions

    # Bridges
    get "/bridges", BridgeController, :index
    post "/bridges/telegram/connect", BridgeController, :connect_telegram
    post "/bridges/whatsapp/connect", BridgeController, :connect_whatsapp
    delete "/bridges/:id", BridgeController, :disconnect
    get "/bridges/:id/status", BridgeController, :status

    # Feed
    get "/feed", FeedController, :index
    get "/feed/trending", FeedController, :trending
    get "/feed/new", FeedController, :new_items
    post "/feed/:id/like", FeedController, :like
    delete "/feed/:id/like", FeedController, :unlike
    post "/feed/:id/fork", FeedController, :fork

    # Marketplace
    get "/marketplace", MarketplaceController, :index
    get "/marketplace/categories", MarketplaceController, :categories
    get "/marketplace/agents/:slug", MarketplaceController, :agent_profile
    post "/marketplace/agents/:id/rate", MarketplaceController, :rate
    get "/marketplace/search", MarketplaceController, :search

    # Webhooks
    post "/webhooks/telegram", WebhookController, :telegram
    post "/webhooks/whatsapp", WebhookController, :whatsapp
    get "/webhooks/whatsapp", WebhookController, :whatsapp_verify
  end
end
