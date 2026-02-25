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
                settingsRow(icon: "person.circle", title: "Profile", color: RaccoonColors.accentPrimary) {
                    ProfileSettingsView()
                }
            } header: {
                Text("Account")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Configuration
            Section {
                settingsRow(icon: "cpu", title: "Agents", color: RaccoonColors.AgentAccent.code) {
                    AgentSettingsView()
                }
                settingsRow(icon: "link", title: "Bridges", color: RaccoonColors.Platform.telegram) {
                    BridgeSettingsView()
                }
            } header: {
                Text("Configuration")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Privacy & Security
            Section {
                settingsRow(icon: "lock.shield", title: "Security", color: RaccoonColors.Semantic.success) {
                    SecuritySettingsView()
                }
            } header: {
                Text("Privacy & Security")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Usage
            Section {
                settingsRow(icon: "chart.bar", title: "Usage & Billing", color: RaccoonColors.Semantic.warning) {
                    UsageDashboardView()
                }
            } header: {
                Text("Usage")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // About
            Section {
                HStack(spacing: RaccoonSpacing.space3) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 16))
                        .foregroundStyle(RaccoonColors.Semantic.info)
                        .frame(width: 28, height: 28)

                    VStack(alignment: .leading, spacing: 0) {
                        Text("Open Raccoon")
                            .font(RaccoonTypography.body)
                            .foregroundStyle(textPrimary)
                        Text("Version 1.0.0")
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(textTertiary)
                    }

                    Spacer()
                }
                .padding(.vertical, RaccoonSpacing.space1)
            } header: {
                Text("About")
                    .font(RaccoonTypography.caption)
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
            HStack(spacing: RaccoonSpacing.space3) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundStyle(color)
                    .frame(width: 28, height: 28)

                Text(title)
                    .font(RaccoonTypography.body)
                    .foregroundStyle(textPrimary)
            }
            .padding(.vertical, RaccoonSpacing.space1)
        }
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }
}
