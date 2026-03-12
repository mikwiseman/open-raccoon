import SwiftUI

#if os(iOS)
public struct ContentView_iOS: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
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
                onOAuthGoogle: {
                    appState.authStore.loginError = "Google sign-in is not implemented yet."
                },
                onOAuthApple: {
                    appState.authStore.loginError = "Apple sign-in is not implemented yet."
                },
                onOAuthGitHub: {
                    appState.authStore.loginError = "GitHub sign-in is not implemented yet."
                }
            )
        }
    }

    private var authenticatedView: some View {
        TabView {
            NavigationStack {
                ConversationListView()
                    .navigationTitle("Chats")
            }
            .tabItem {
                Label("Chats", systemImage: "bubble.left.and.bubble.right")
            }

            NavigationStack {
                FeedView()
                    .navigationTitle("Feed")
            }
            .tabItem {
                Label("Feed", systemImage: "square.grid.2x2")
            }

            NavigationStack {
                MarketplaceView()
                    .navigationTitle("Marketplace")
            }
            .tabItem {
                Label("Marketplace", systemImage: "storefront")
            }

            NavigationStack {
                SettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        }
        .tint(WaiAgentsColors.accentPrimary)
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }
}
#endif
