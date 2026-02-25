import SwiftUI

#if os(macOS)
public struct ContentView_macOS: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @State private var columnVisibility: NavigationSplitViewVisibility = .all

    public init() {}

    public var body: some View {
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
}

struct SidebarView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @State private var searchText = ""

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
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(textTertiary)
                }

                Section {
                    sidebarItem(icon: "cpu", label: "Raccoon (default)")
                    sidebarItem(icon: "chevron.left.forwardslash.chevron.right", label: "Code Agent")
                    sidebarItem(icon: "magnifyingglass", label: "Research Agent")
                } header: {
                    Text("AGENTS")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(textTertiary)
                }
            }
            .listStyle(.sidebar)

            Spacer()

            // Bottom bar - 48px
            HStack {
                Button(action: {}) {
                    Image(systemName: "gear")
                        .font(.system(size: 14))
                        .foregroundStyle(textSecondary)
                }
                .buttonStyle(.plain)

                Spacer()

                Button(action: {}) {
                    Image(systemName: "plus.message")
                        .font(.system(size: 14))
                        .foregroundStyle(RaccoonColors.accentPrimary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .frame(height: 48)
        }
        .background(bgSecondary)
    }

    private func sidebarItem(icon: String, label: String) -> some View {
        Label {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(textPrimary)
        } icon: {
            Image(systemName: icon)
                .font(.system(size: 14))
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
