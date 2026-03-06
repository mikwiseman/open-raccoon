import SwiftUI

/// List of connected bridges with status indicators.
/// Connect new bridge buttons (Telegram, WhatsApp).
/// Disconnect option.
public struct BridgeSettingsView: View {
    @State private var bridges: [BridgeEntry] = []

    @Environment(\.colorScheme) private var colorScheme

    struct BridgeEntry: Identifiable {
        let id: String
        let platform: String
        let status: BridgeStatus
        let connectedAt: Date?

        enum BridgeStatus: String {
            case connected
            case reconnecting
            case disconnected
            case error
        }
    }

    public init() {}

    public var body: some View {
        List {
            // Connected bridges
            if !bridges.isEmpty {
                Section {
                    ForEach(bridges) { bridge in
                        bridgeRow(bridge)
                    }
                } header: {
                    Text("Connected")
                        .font(WaiAgentsTypography.caption)
                        .foregroundStyle(textTertiary)
                }
            }

            // Connect new
            Section {
                connectButton(
                    platform: "Telegram",
                    icon: "paperplane.fill",
                    color: WaiAgentsColors.Platform.telegram
                )
                connectButton(
                    platform: "WhatsApp",
                    icon: "phone.fill",
                    color: WaiAgentsColors.Platform.whatsapp
                )
            } header: {
                Text("Connect New Bridge")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            } footer: {
                Text("Bridges mirror your conversations from external platforms into WaiAgents.")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        .navigationTitle("Bridges")
        .navigationBarTitleDisplayMode(.inline)
        #else
        .listStyle(.sidebar)
        #endif
    }

    private func bridgeRow(_ bridge: BridgeEntry) -> some View {
        HStack(spacing: WaiAgentsSpacing.space3) {
            // Platform icon
            Circle()
                .fill(platformColor(bridge.platform))
                .frame(width: 36, height: 36)
                .overlay {
                    Image(systemName: platformIcon(bridge.platform))
                        .font(.system(size: 14))
                        .foregroundStyle(.white)
                }

            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space1) {
                Text(bridge.platform)
                    .font(WaiAgentsTypography.body)
                    .foregroundStyle(textPrimary)

                HStack(spacing: WaiAgentsSpacing.space1) {
                    statusDot(bridge.status)
                    Text(bridge.status.rawValue.capitalized)
                        .font(WaiAgentsTypography.caption)
                        .foregroundStyle(statusColor(bridge.status))
                }
            }

            Spacer()

            // Disconnect
            Button {
                // Disconnect placeholder
            } label: {
                Text("Disconnect")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(WaiAgentsColors.Semantic.error)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, WaiAgentsSpacing.space1)
    }

    private func connectButton(platform: String, icon: String, color: Color) -> some View {
        Button {
            // Connect placeholder
        } label: {
            HStack(spacing: WaiAgentsSpacing.space3) {
                Circle()
                    .fill(color)
                    .frame(width: 36, height: 36)
                    .overlay {
                        Image(systemName: icon)
                            .font(.system(size: 14))
                            .foregroundStyle(.white)
                    }

                Text("Connect \(platform)")
                    .font(WaiAgentsTypography.body)
                    .foregroundStyle(textPrimary)

                Spacer()

                Image(systemName: "plus.circle")
                    .font(.system(size: 18))
                    .foregroundStyle(WaiAgentsColors.accentPrimary)
            }
            .padding(.vertical, WaiAgentsSpacing.space1)
        }
        .buttonStyle(.plain)
    }

    private func statusDot(_ status: BridgeEntry.BridgeStatus) -> some View {
        Circle()
            .fill(statusColor(status))
            .frame(width: 6, height: 6)
    }

    private func statusColor(_ status: BridgeEntry.BridgeStatus) -> Color {
        switch status {
        case .connected: return WaiAgentsColors.Semantic.success
        case .reconnecting: return WaiAgentsColors.Semantic.warning
        case .disconnected: return textTertiary
        case .error: return WaiAgentsColors.Semantic.error
        }
    }

    private func platformColor(_ platform: String) -> Color {
        switch platform.lowercased() {
        case "telegram": return WaiAgentsColors.Platform.telegram
        case "whatsapp": return WaiAgentsColors.Platform.whatsapp
        case "signal": return WaiAgentsColors.Platform.signal
        case "discord": return WaiAgentsColors.Platform.discord
        default: return textTertiary
        }
    }

    private func platformIcon(_ platform: String) -> String {
        switch platform.lowercased() {
        case "telegram": return "paperplane.fill"
        case "whatsapp": return "phone.fill"
        case "signal": return "lock.fill"
        case "discord": return "gamecontroller.fill"
        default: return "link"
        }
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}
