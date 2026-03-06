import SwiftUI

#if os(macOS)
enum SidebarDestination: String, CaseIterable, Identifiable {
    case chats
    case feed
    case marketplace

    var id: String { rawValue }
}

public struct ContentView_macOS: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    @State private var showRegister = false
    @State private var isRestoringSession = true
    @State private var selectedDestination: SidebarDestination = .chats

    public init() {}

    public var body: some View {
        Group {
            if isRestoringSession {
                sessionRestorationView
            } else if appState.isAuthenticated {
                authenticatedView
            } else {
                authView
            }
        }
        .task {
            await appState.restoreSession()
            isRestoringSession = false
        }
    }

    private var sessionRestorationView: some View {
        VStack(spacing: WaiAgentsSpacing.space4) {
            ProgressView()
                .controlSize(.large)
            Text("Restoring session...")
                .font(WaiAgentsTypography.body)
                .foregroundStyle(textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(bgPrimary)
    }

    @ViewBuilder
    private var authView: some View {
        if showRegister {
            RegisterView(
                onRegister: { username, email, password in
                    Task {
                        do {
                            try await appState.register(
                                username: username,
                                email: email,
                                password: password
                            )
                        } catch {
                            // Error is surfaced via authStore.loginError
                        }
                    }
                },
                onNavigateToLogin: {
                    showRegister = false
                }
            )
        } else {
            LoginView(
                onLogin: { email, password in
                    Task {
                        do {
                            try await appState.login(email: email, password: password)
                        } catch {
                            // Error is surfaced via authStore.loginError
                        }
                    }
                },
                onMagicLinkRequest: { email in
                    Task {
                        do {
                            try await appState.requestMagicLink(email: email)
                        } catch {
                            // Error is surfaced via authStore.magicLinkError
                        }
                    }
                },
                onMagicLinkVerify: { token in
                    Task {
                        do {
                            try await appState.verifyMagicLink(token: token)
                        } catch {
                            // Error is surfaced via authStore.magicLinkError
                        }
                    }
                },
                onNavigateToRegister: {
                    showRegister = true
                },
                onOAuthGoogle: {},
                onOAuthApple: {},
                onOAuthGitHub: {}
            )
        }
    }

    private var authenticatedView: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            SidebarView(selectedDestination: $selectedDestination)
                .navigationSplitViewColumnWidth(min: 200, ideal: 240, max: 320)
        } content: {
            switch selectedDestination {
            case .chats:
                ConversationListView()
                    .navigationSplitViewColumnWidth(min: 280, ideal: 320, max: 400)
            case .feed:
                FeedView()
                    .navigationSplitViewColumnWidth(min: 380, ideal: 520, max: 800)
            case .marketplace:
                MarketplaceView()
                    .navigationSplitViewColumnWidth(min: 380, ideal: 520, max: 800)
            }
        } detail: {
            switch selectedDestination {
            case .chats:
                if let conversationID = appState.selectedConversationID {
                    let conversation = appState.conversationStore.conversation(byID: conversationID)
                    if conversation?.type == .agent {
                        AgentChatView(
                            conversationID: conversationID,
                            agentName: conversation?.title ?? "Agent"
                        )
                        .id(conversationID)
                    } else {
                        ConversationDetailView(conversationID: conversationID)
                            .id(conversationID)
                    }
                } else {
                    EmptyStateView()
                }
            case .feed:
                if let item = appState.selectedFeedItem {
                    FeedDetailView(
                        item: item,
                        authorName: item.creatorID,
                        onLike: {},
                        onFork: {},
                        onFollow: {}
                    )
                } else {
                    SecondaryPanePlaceholder(
                        title: "Feed",
                        subtitle: "Select an item from the feed to see details."
                    )
                }
            case .marketplace:
                if let agent = appState.selectedMarketplaceAgent {
                    AgentProfileView(
                        agent: agent,
                        creatorName: agent.creatorID,
                        onStartConversation: {
                            startConversation(with: agent)
                        }
                    )
                } else {
                    SecondaryPanePlaceholder(
                        title: "Marketplace",
                        subtitle: "Select an agent card to view profile and start a conversation."
                    )
                }
            }
        }
    }

    private func startConversation(with agent: Agent) {
        Task {
            do {
                let response: ConversationResponse = try await appState.apiClient.request(
                    .startAgentConversation(agentID: agent.id)
                )
                appState.conversationStore.upsert(response.conversation)
                appState.selectedConversationID = response.conversation.id
                appState.selectedMarketplaceAgent = nil
                selectedDestination = .chats
            } catch {
                // Error is shown in the marketplace view's alert
            }
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }
}

struct SidebarView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @State private var showSettings = false
    @State private var showNewConversation = false
    @State private var sidebarAgents: [Agent] = []
    @State private var isLoadingAgents = false
    @State private var startConversationError: String?
    @Binding private var selectedDestination: SidebarDestination

    init(selectedDestination: Binding<SidebarDestination>) {
        _selectedDestination = selectedDestination
    }

    var body: some View {
        VStack(spacing: 0) {
            // App header - 48px
            HStack {
                Text("WaiAgents")
                    .font(WaiAgentsTypography.textLg)
                    .foregroundStyle(textPrimary)
                Spacer()
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .frame(height: 48)

            Divider()
                .foregroundStyle(borderPrimary)

            // Navigation list
            List {
                Section {
                    sidebarItem(icon: "bubble.left.and.bubble.right", label: "Chats", destination: .chats)
                    sidebarItem(icon: "square.grid.2x2", label: "Feed", destination: .feed)
                    sidebarItem(icon: "storefront", label: "Marketplace", destination: .marketplace)
                } header: {
                    Text("RECENT")
                        .font(WaiAgentsTypography.textXs)
                        .fontWeight(.semibold)
                        .foregroundStyle(textTertiary)
                }

                Section {
                    if isLoadingAgents {
                        HStack(spacing: WaiAgentsSpacing.space2) {
                            ProgressView()
                                .controlSize(.small)
                            Text("Loading agents...")
                                .font(WaiAgentsTypography.textSm)
                                .foregroundStyle(textTertiary)
                        }
                        .frame(height: 36)
                        .padding(.horizontal, WaiAgentsSpacing.space2)
                    } else if sidebarAgents.isEmpty {
                        Text("No agents available")
                            .font(WaiAgentsTypography.textSm)
                            .foregroundStyle(textTertiary)
                            .frame(height: 36)
                            .padding(.horizontal, WaiAgentsSpacing.space2)
                    } else {
                        ForEach(sidebarAgents) { agent in
                            Button {
                                startAgentConversation(agent)
                            } label: {
                                Label {
                                    Text(agent.name)
                                        .font(WaiAgentsTypography.textSm)
                                        .fontWeight(.medium)
                                        .foregroundStyle(textPrimary)
                                        .lineLimit(1)
                                } icon: {
                                    Image(systemName: iconForCategory(agent.category))
                                        .font(WaiAgentsTypography.textBase)
                                        .foregroundStyle(textSecondary)
                                        .frame(width: 24)
                                }
                                .frame(height: 36)
                                .padding(.horizontal, WaiAgentsSpacing.space2)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                } header: {
                    Text("AGENTS")
                        .font(WaiAgentsTypography.textXs)
                        .fontWeight(.semibold)
                        .foregroundStyle(textTertiary)
                }
            }
            .listStyle(.sidebar)

            Spacer()

            // Bottom bar - 48px
            HStack {
                Button(action: { showSettings = true }) {
                    Image(systemName: "gear")
                        .font(WaiAgentsTypography.textBase)
                        .foregroundStyle(textSecondary)
                }
                .buttonStyle(.plain)

                Spacer()

                Button {
                    Task { await appState.logout() }
                } label: {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(WaiAgentsTypography.textBase)
                        .foregroundStyle(textSecondary)
                }
                .buttonStyle(.plain)
                .help("Log Out")

                Button(action: { showNewConversation = true }) {
                    Image(systemName: "plus.message")
                        .font(WaiAgentsTypography.textBase)
                        .foregroundStyle(WaiAgentsColors.accentPrimary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .frame(height: 48)
        }
        .background(bgSecondary)
        .sheet(isPresented: $showSettings) {
            NavigationStack {
                SettingsView()
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { showSettings = false }
                        }
                    }
            }
            .frame(minWidth: 550, minHeight: 450)
        }
        .sheet(isPresented: $showNewConversation) {
            NewConversationSheet(
                onConversationCreated: { conversationID in
                    appState.selectedConversationID = conversationID
                    selectedDestination = .chats
                    showNewConversation = false
                },
                onDismiss: {
                    showNewConversation = false
                }
            )
        }
        .alert("Unable to Start Conversation", isPresented: Binding(
            get: { startConversationError != nil },
            set: { if !$0 { startConversationError = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(startConversationError ?? "Unknown error")
        }
        .task {
            await loadSidebarAgents()
        }
    }

    private func loadSidebarAgents() async {
        isLoadingAgents = true
        do {
            let response: PaginatedResponse<Agent> = try await appState.apiClient.request(
                .marketplace(cursor: nil, limit: 5)
            )
            sidebarAgents = Array(response.items.prefix(5))
        } catch {
            // Sidebar agents are non-critical; leave empty on failure
        }
        isLoadingAgents = false
    }

    private func startAgentConversation(_ agent: Agent) {
        Task {
            do {
                let response: ConversationResponse = try await appState.apiClient.request(
                    .startAgentConversation(agentID: agent.id)
                )
                appState.conversationStore.upsert(response.conversation)
                appState.selectedConversationID = response.conversation.id
                selectedDestination = .chats
            } catch {
                startConversationError = String(describing: error)
            }
        }
    }

    private func iconForCategory(_ category: String?) -> String {
        switch category?.lowercased() {
        case "coding": return "chevron.left.forwardslash.chevron.right"
        case "writing": return "pencil.line"
        case "creative": return "paintbrush"
        case "data": return "chart.bar"
        case "productivity": return "list.clipboard"
        case "education": return "book"
        case "other": return "sparkles"
        default: return "cpu"
        }
    }

    private func sidebarItem(icon: String, label: String, destination: SidebarDestination) -> some View {
        Button {
            selectedDestination = destination
            if destination != .chats {
                appState.selectedConversationID = nil
            }
        } label: {
            Label {
                Text(label)
                    .font(WaiAgentsTypography.textSm)
                    .fontWeight(.medium)
                    .foregroundStyle(
                        selectedDestination == destination
                            ? WaiAgentsColors.accentPrimary
                            : textPrimary
                    )
            } icon: {
                Image(systemName: icon)
                    .font(WaiAgentsTypography.textBase)
                    .foregroundStyle(
                        selectedDestination == destination
                            ? WaiAgentsColors.accentPrimary
                            : textSecondary
                    )
                    .frame(width: 24)
            }
            .frame(height: 36)
            .padding(.horizontal, WaiAgentsSpacing.space2)
            .background(
                (selectedDestination == destination)
                    ? (colorScheme == .dark ? WaiAgentsColors.accentSubtleDark : WaiAgentsColors.accentSubtleLight)
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.md))
        }
        .buttonStyle(.plain)
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgSecondary : WaiAgentsColors.Light.bgSecondary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.borderPrimary : WaiAgentsColors.Light.borderPrimary
    }
}

struct EmptyStateView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: WaiAgentsSpacing.space4) {
            Image(systemName: "bubble.left.and.text.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(textTertiary)
            Text("Select a conversation")
                .font(WaiAgentsTypography.textLg)
                .foregroundStyle(textSecondary)
            Text("Choose from the sidebar to start chatting")
                .font(WaiAgentsTypography.textSm)
                .foregroundStyle(textTertiary)
        }
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}

struct SecondaryPanePlaceholder: View {
    let title: String
    let subtitle: String
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: WaiAgentsSpacing.space3) {
            Text(title)
                .font(WaiAgentsTypography.textLg)
                .foregroundStyle(textSecondary)
            Text(subtitle)
                .font(WaiAgentsTypography.textSm)
                .multilineTextAlignment(.center)
                .foregroundStyle(textTertiary)
        }
        .padding(WaiAgentsSpacing.space6)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}
#endif
