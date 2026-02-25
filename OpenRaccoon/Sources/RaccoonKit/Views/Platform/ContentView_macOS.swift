import SwiftUI

#if os(macOS)
public struct ContentView_macOS: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    @State private var showRegister = false
    @State private var isRestoringSession = true

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
        VStack(spacing: RaccoonSpacing.space4) {
            ProgressView()
                .controlSize(.large)
            Text("Restoring session...")
                .font(RaccoonTypography.body)
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
            SidebarView()
                .navigationSplitViewColumnWidth(min: 200, ideal: 240, max: 320)
        } content: {
            ConversationListView()
                .navigationSplitViewColumnWidth(min: 280, ideal: 320, max: 400)
        } detail: {
            if let conversationID = appState.selectedConversationID {
                ConversationDetailView(conversationID: conversationID)
            } else {
                EmptyStateView()
            }
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }
}

struct SidebarView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @State private var searchText = ""
    @State private var showSettings = false
    @State private var showNewConversation = false

    var body: some View {
        VStack(spacing: 0) {
            // App header - 48px
            HStack {
                Text("Open Raccoon")
                    .font(RaccoonTypography.textLg)
                    .foregroundStyle(textPrimary)
                Spacer()
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .frame(height: 48)

            // Search bar
            SearchBarView(text: $searchText, placeholder: "Search...")
                .padding(.horizontal, RaccoonSpacing.space3)
                .padding(.vertical, RaccoonSpacing.space3)

            Divider()
                .foregroundStyle(borderPrimary)

            // Navigation list
            List {
                Section {
                    sidebarItem(icon: "bubble.left.and.bubble.right", label: "Chats")
                    sidebarItem(icon: "square.grid.2x2", label: "Feed")
                    sidebarItem(icon: "storefront", label: "Marketplace")
                } header: {
                    Text("RECENT")
                        .font(RaccoonTypography.textXs)
                        .fontWeight(.semibold)
                        .foregroundStyle(textTertiary)
                }

                Section {
                    sidebarItem(icon: "cpu", label: "Raccoon (default)")
                    sidebarItem(icon: "chevron.left.forwardslash.chevron.right", label: "Code Agent")
                    sidebarItem(icon: "magnifyingglass", label: "Research Agent")
                } header: {
                    Text("AGENTS")
                        .font(RaccoonTypography.textXs)
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
                        .font(RaccoonTypography.textBase)
                        .foregroundStyle(textSecondary)
                }
                .buttonStyle(.plain)

                Spacer()

                Button {
                    Task { await appState.logout() }
                } label: {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(RaccoonTypography.textBase)
                        .foregroundStyle(textSecondary)
                }
                .buttonStyle(.plain)
                .help("Log Out")

                Button(action: { showNewConversation = true }) {
                    Image(systemName: "plus.message")
                        .font(RaccoonTypography.textBase)
                        .foregroundStyle(RaccoonColors.accentPrimary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .frame(height: 48)
        }
        .background(bgSecondary)
        .sheet(isPresented: $showSettings) {
            VStack(spacing: RaccoonSpacing.space4) {
                Text("Settings")
                    .font(RaccoonTypography.textLg)
                    .fontWeight(.semibold)
                Text("Settings will be available in a future update.")
                    .font(RaccoonTypography.textSm)
                    .foregroundStyle(textSecondary)
                Button("Close") { showSettings = false }
                    .keyboardShortcut(.cancelAction)
            }
            .padding(RaccoonSpacing.space6)
            .frame(minWidth: 300, minHeight: 200)
        }
        .sheet(isPresented: $showNewConversation) {
            VStack(spacing: RaccoonSpacing.space4) {
                Text("New Conversation")
                    .font(RaccoonTypography.textLg)
                    .fontWeight(.semibold)
                Text("Start a new conversation with an agent.")
                    .font(RaccoonTypography.textSm)
                    .foregroundStyle(textSecondary)
                Button("Close") { showNewConversation = false }
                    .keyboardShortcut(.cancelAction)
            }
            .padding(RaccoonSpacing.space6)
            .frame(minWidth: 300, minHeight: 200)
        }
    }

    private func sidebarItem(icon: String, label: String) -> some View {
        Label {
            Text(label)
                .font(RaccoonTypography.textSm)
                .fontWeight(.medium)
                .foregroundStyle(textPrimary)
        } icon: {
            Image(systemName: icon)
                .font(RaccoonTypography.textBase)
                .foregroundStyle(textSecondary)
                .frame(width: 24)
        }
        .frame(height: 36)
        .padding(.horizontal, RaccoonSpacing.space2)
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}

struct EmptyStateView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            Image(systemName: "bubble.left.and.text.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(textTertiary)
            Text("Select a conversation")
                .font(RaccoonTypography.textLg)
                .foregroundStyle(textSecondary)
            Text("Choose from the sidebar to start chatting")
                .font(RaccoonTypography.textSm)
                .foregroundStyle(textTertiary)
        }
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }
}
#endif
