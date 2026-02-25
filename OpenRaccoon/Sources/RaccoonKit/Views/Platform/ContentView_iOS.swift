import SwiftUI

#if os(iOS)
public struct ContentView_iOS: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        TabView {
            NavigationStack {
                ConversationListView()
                    .navigationTitle("Chats")
            }
            .tabItem {
                Label("Chats", systemImage: "bubble.left.and.bubble.right")
            }

            NavigationStack {
                feedPlaceholder
                    .navigationTitle("Feed")
            }
            .tabItem {
                Label("Feed", systemImage: "square.grid.2x2")
            }

            NavigationStack {
                marketplacePlaceholder
                    .navigationTitle("Marketplace")
            }
            .tabItem {
                Label("Marketplace", systemImage: "storefront")
            }

            NavigationStack {
                settingsPlaceholder
                    .navigationTitle("Settings")
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        }
        .tint(RaccoonColors.accentPrimary)
    }

    private var feedPlaceholder: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            Image(systemName: "square.grid.2x2")
                .font(.system(size: 36))
                .foregroundStyle(textTertiary)
            Text("Feed coming soon")
                .font(RaccoonTypography.textLg)
                .foregroundStyle(textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var marketplacePlaceholder: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            Image(systemName: "storefront")
                .font(.system(size: 36))
                .foregroundStyle(textTertiary)
            Text("Marketplace coming soon")
                .font(RaccoonTypography.textLg)
                .foregroundStyle(textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var settingsPlaceholder: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            Image(systemName: "gear")
                .font(.system(size: 36))
                .foregroundStyle(textTertiary)
            Text("Settings coming soon")
                .font(RaccoonTypography.textLg)
                .foregroundStyle(textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }
}
#endif
