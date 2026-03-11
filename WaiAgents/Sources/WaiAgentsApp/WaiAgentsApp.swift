import SwiftUI
import os
import WaiAgentsKit

private let logger = Logger(subsystem: "com.waiagents.app", category: "MagicLink")

@main
struct WaiAgentsApp: App {
    @State private var appState = AppState()

    private func handleMagicLinkURL(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.path.contains("magic-link/verify"),
              let token = components.queryItems?.first(where: { $0.name == "token" })?.value
        else { return }

        Task {
            do {
                try await appState.verifyMagicLink(token: token)
            } catch {
                logger.error("Magic link verification failed: \(error.localizedDescription)")
            }
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
