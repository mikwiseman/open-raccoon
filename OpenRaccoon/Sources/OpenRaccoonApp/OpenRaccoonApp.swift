import SwiftUI
import RaccoonKit

@main
struct OpenRaccoonApp: App {
    @State private var appState = AppState()

    private func handleMagicLinkURL(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.path.contains("magic-link/verify"),
              let token = components.queryItems?.first(where: { $0.name == "token" })?.value
        else { return }

        Task {
            try await appState.verifyMagicLink(token: token)
        }
    }

    var body: some Scene {
        WindowGroup {
            #if os(macOS)
            ContentView_macOS()
                .environment(appState)
                .frame(minWidth: 900, minHeight: 600)
                .onOpenURL { url in
                    handleMagicLinkURL(url)
                }
            #else
            ContentView_iOS()
                .environment(appState)
                .onOpenURL { url in
                    handleMagicLinkURL(url)
                }
            #endif
        }
        #if os(macOS)
        .windowStyle(.titleBar)
        .defaultSize(width: 1200, height: 800)
        #endif
    }
}
