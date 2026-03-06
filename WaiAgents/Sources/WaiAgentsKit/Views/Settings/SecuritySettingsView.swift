import SwiftUI

/// Security settings: change password, manage passkeys,
/// active sessions list, two-factor auth toggle.
public struct SecuritySettingsView: View {
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isTwoFactorEnabled = false
    @State private var showPasswordChange = false

    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        List {
            // Password
            Section {
                Button {
                    withAnimation(WaiAgentsMotion.easeDefault) {
                        showPasswordChange.toggle()
                    }
                } label: {
                    HStack {
                        Label("Change Password", systemImage: "lock.rotation")
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                        Spacer()
                        Image(systemName: showPasswordChange ? "chevron.up" : "chevron.down")
                            .font(.system(size: 12))
                            .foregroundStyle(textTertiary)
                    }
                }
                .buttonStyle(.plain)

                if showPasswordChange {
                    SecureField("Current Password", text: $currentPassword)
                        .textFieldStyle(.roundedBorder)
                        .font(WaiAgentsTypography.body)
                        .textContentType(.password)

                    SecureField("New Password", text: $newPassword)
                        .textFieldStyle(.roundedBorder)
                        .font(WaiAgentsTypography.body)
                        .textContentType(.newPassword)

                    SecureField("Confirm New Password", text: $confirmPassword)
                        .textFieldStyle(.roundedBorder)
                        .font(WaiAgentsTypography.body)
                        .textContentType(.newPassword)

                    Button {
                        // Change password placeholder
                    } label: {
                        Text("Update Password")
                            .font(WaiAgentsTypography.agentStatus)
                            .foregroundStyle(WaiAgentsColors.accentPrimary)
                    }
                    .disabled(newPassword.isEmpty || newPassword != confirmPassword)
                }
            } header: {
                Text("Password")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Passkeys
            Section {
                HStack(spacing: WaiAgentsSpacing.space3) {
                    Image(systemName: "person.badge.key")
                        .font(.system(size: 16))
                        .foregroundStyle(WaiAgentsColors.accentPrimary)

                    VStack(alignment: .leading, spacing: 0) {
                        Text("Passkeys")
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                        Text("No passkeys registered")
                            .font(WaiAgentsTypography.caption)
                            .foregroundStyle(textTertiary)
                    }

                    Spacer()

                    Button {
                        // Register passkey placeholder
                    } label: {
                        Text("Add")
                            .font(WaiAgentsTypography.bodySmall)
                            .foregroundStyle(WaiAgentsColors.accentPrimary)
                    }
                    .buttonStyle(.plain)
                }
            } header: {
                Text("Passkeys")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Two-Factor Auth
            Section {
                HStack {
                    VStack(alignment: .leading, spacing: WaiAgentsSpacing.space1) {
                        Text("Two-Factor Authentication")
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                        Text("Add an extra layer of security to your account")
                            .font(WaiAgentsTypography.caption)
                            .foregroundStyle(textTertiary)
                    }
                    Spacer()
                    Toggle("", isOn: $isTwoFactorEnabled)
                        .tint(WaiAgentsColors.accentPrimary)
                        .labelsHidden()
                }
            } header: {
                Text("Two-Factor Authentication")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Active Sessions
            Section {
                sessionRow(device: "MacBook Pro", location: "Current session", isCurrent: true)
                sessionRow(device: "iPhone 16", location: "Last active 2 hours ago", isCurrent: false)
            } header: {
                Text("Active Sessions")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            } footer: {
                Button {
                    // Sign out all placeholder
                } label: {
                    Text("Sign Out All Other Sessions")
                        .font(WaiAgentsTypography.bodySmall)
                        .foregroundStyle(WaiAgentsColors.Semantic.error)
                }
                .buttonStyle(.plain)
                .padding(.top, WaiAgentsSpacing.space2)
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        .navigationTitle("Security")
        .navigationBarTitleDisplayMode(.inline)
        #else
        .listStyle(.sidebar)
        #endif
    }

    private func sessionRow(device: String, location: String, isCurrent: Bool) -> some View {
        HStack(spacing: WaiAgentsSpacing.space3) {
            Image(systemName: device.contains("iPhone") ? "iphone" : "laptopcomputer")
                .font(.system(size: 18))
                .foregroundStyle(textSecondary)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: WaiAgentsSpacing.space2) {
                    Text(device)
                        .font(WaiAgentsTypography.body)
                        .foregroundStyle(textPrimary)
                    if isCurrent {
                        Text("Current")
                            .font(WaiAgentsTypography.caption)
                            .foregroundStyle(WaiAgentsColors.Semantic.success)
                            .padding(.horizontal, WaiAgentsSpacing.space2)
                            .padding(.vertical, 1)
                            .background(WaiAgentsColors.Semantic.successBg)
                            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.sm))
                    }
                }
                Text(location)
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            Spacer()
        }
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}
