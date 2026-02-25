import SwiftUI
import RaccoonKit

@main
struct OpenRaccoonApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            #if os(macOS)
            ContentView_macOS()
                .environment(appState)
                .frame(minWidth: 900, minHeight: 600)
            #else
            ContentView_iOS()
                .environment(appState)
            #endif
        }
        #if os(macOS)
        .windowStyle(.titleBar)
        .defaultSize(width: 1200, height: 800)
        #endif
    }
}
