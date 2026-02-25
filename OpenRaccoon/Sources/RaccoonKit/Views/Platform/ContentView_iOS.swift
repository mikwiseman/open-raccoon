import SwiftUI

#if os(iOS)
public struct ContentView_iOS: View {
    @Environment(AppState.self) private var appState

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
        .tint(RaccoonColors.accentPrimary)
    }

}
#endif
