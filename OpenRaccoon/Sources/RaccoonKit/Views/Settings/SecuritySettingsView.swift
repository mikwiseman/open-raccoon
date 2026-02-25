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
                    withAnimation(RaccoonMotion.easeDefault) {
                        showPasswordChange.toggle()
                    }
                } label: {
                    HStack {
                        Label("Change Password", systemImage: "lock.rotation")
                            .font(RaccoonTypography.body)
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
                        .font(RaccoonTypography.body)
                        .textContentType(.password)

                    SecureField("New Password", text: $newPassword)
                        .textFieldStyle(.roundedBorder)
                        .font(RaccoonTypography.body)
                        .textContentType(.newPassword)

                    SecureField("Confirm New Password", text: $confirmPassword)
                        .textFieldStyle(.roundedBorder)
                        .font(RaccoonTypography.body)
                        .textContentType(.newPassword)

                    Button {
                        // Change password placeholder
                    } label: {
                        Text("Update Password")
                            .font(RaccoonTypography.agentStatus)
                            .foregroundStyle(RaccoonColors.accentPrimary)
                    }
                    .disabled(newPassword.isEmpty || newPassword != confirmPassword)
                }
            } header: {
                Text("Password")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Passkeys
            Section {
                HStack(spacing: RaccoonSpacing.space3) {
                    Image(systemName: "person.badge.key")
                        .font(.system(size: 16))
                        .foregroundStyle(RaccoonColors.accentPrimary)

                    VStack(alignment: .leading, spacing: 0) {
                        Text("Passkeys")
                            .font(RaccoonTypography.body)
                            .foregroundStyle(textPrimary)
                        Text("No passkeys registered")
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(textTertiary)
                    }

                    Spacer()

                    Button {
                        // Register passkey placeholder
                    } label: {
                        Text("Add")
                            .font(RaccoonTypography.bodySmall)
                            .foregroundStyle(RaccoonColors.accentPrimary)
                    }
                    .buttonStyle(.plain)
                }
            } header: {
                Text("Passkeys")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Two-Factor Auth
            Section {
                HStack {
                    VStack(alignment: .leading, spacing: RaccoonSpacing.space1) {
                        Text("Two-Factor Authentication")
                            .font(RaccoonTypography.body)
                            .foregroundStyle(textPrimary)
                        Text("Add an extra layer of security to your account")
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(textTertiary)
                    }
                    Spacer()
                    Toggle("", isOn: $isTwoFactorEnabled)
                        .tint(RaccoonColors.accentPrimary)
                        .labelsHidden()
                }
            } header: {
                Text("Two-Factor Authentication")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Active Sessions
            Section {
                sessionRow(device: "MacBook Pro", location: "Current session", isCurrent: true)
                sessionRow(device: "iPhone 16", location: "Last active 2 hours ago", isCurrent: false)
            } header: {
                Text("Active Sessions")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            } footer: {
                Button {
                    // Sign out all placeholder
                } label: {
                    Text("Sign Out All Other Sessions")
                        .font(RaccoonTypography.bodySmall)
                        .foregroundStyle(RaccoonColors.Semantic.error)
                }
                .buttonStyle(.plain)
                .padding(.top, RaccoonSpacing.space2)
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
        HStack(spacing: RaccoonSpacing.space3) {
            Image(systemName: device.contains("iPhone") ? "iphone" : "laptopcomputer")
                .font(.system(size: 18))
                .foregroundStyle(textSecondary)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: RaccoonSpacing.space2) {
                    Text(device)
                        .font(RaccoonTypography.body)
                        .foregroundStyle(textPrimary)
                    if isCurrent {
                        Text("Current")
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(RaccoonColors.Semantic.success)
                            .padding(.horizontal, RaccoonSpacing.space2)
                            .padding(.vertical, 1)
                            .background(RaccoonColors.Semantic.successBg)
                            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.sm))
                    }
                }
                Text(location)
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            Spacer()
        }
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
}
