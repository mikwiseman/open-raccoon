import SwiftUI

/// Settings root with NavigationLink sections:
/// Profile, Agents, Bridges, Security, Usage, About.
/// Uses List with grouped style.
public struct SettingsView: View {
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        List {
            // Account
            Section {
                settingsRow(icon: "person.circle", title: "Profile", color: WaiAgentsColors.accentPrimary) {
                    ProfileSettingsView()
                }
            } header: {
                Text("Account")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Configuration
            Section {
                settingsRow(icon: "cpu", title: "Agents", color: WaiAgentsColors.AgentAccent.code) {
                    AgentSettingsView()
                }
                settingsRow(icon: "link", title: "Bridges", color: WaiAgentsColors.Platform.telegram) {
                    BridgeSettingsView()
                }
            } header: {
                Text("Configuration")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Privacy & Security
            Section {
                settingsRow(icon: "lock.shield", title: "Security", color: WaiAgentsColors.Semantic.success) {
                    SecuritySettingsView()
                }
            } header: {
                Text("Privacy & Security")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Usage
            Section {
                settingsRow(icon: "chart.bar", title: "Usage & Billing", color: WaiAgentsColors.Semantic.warning) {
                    UsageDashboardView()
                }
            } header: {
                Text("Usage")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // About
            Section {
                HStack(spacing: WaiAgentsSpacing.space3) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 16))
                        .foregroundStyle(WaiAgentsColors.Semantic.info)
                        .frame(width: 28, height: 28)

                    VStack(alignment: .leading, spacing: 0) {
                        Text("WaiAgents")
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                        Text("Version 1.0.0")
                            .font(WaiAgentsTypography.caption)
                            .foregroundStyle(textTertiary)
                    }

                    Spacer()
                }
                .padding(.vertical, WaiAgentsSpacing.space1)
            } header: {
                Text("About")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.large)
        #else
        .listStyle(.sidebar)
        #endif
    }

    private func settingsRow<Destination: View>(
        icon: String,
        title: String,
        color: Color,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
        } label: {
            HStack(spacing: WaiAgentsSpacing.space3) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundStyle(color)
                    .frame(width: 28, height: 28)

                Text(title)
                    .font(WaiAgentsTypography.body)
                    .foregroundStyle(textPrimary)
            }
            .padding(.vertical, WaiAgentsSpacing.space1)
        }
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}
