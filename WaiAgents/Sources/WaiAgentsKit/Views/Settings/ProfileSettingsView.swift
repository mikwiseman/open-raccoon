import SwiftUI

/// Profile settings with avatar upload/change,
/// display name, bio, email fields, and save button.
public struct ProfileSettingsView: View {
    @State private var displayName = ""
    @State private var bio = ""
    @State private var email = ""
    @State private var hasChanges = false

    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(spacing: WaiAgentsSpacing.space6) {
                // Avatar section
                VStack(spacing: WaiAgentsSpacing.space3) {
                    AvatarView(name: displayName.isEmpty ? "U" : displayName, size: 80)

                    Button {
                        // Avatar upload placeholder
                    } label: {
                        Text("Change Avatar")
                            .font(WaiAgentsTypography.bodySmall)
                            .foregroundStyle(WaiAgentsColors.accentPrimary)
                    }
                    .buttonStyle(.plain)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, WaiAgentsSpacing.space4)

                // Form fields
                VStack(spacing: WaiAgentsSpacing.space4) {
                    fieldGroup(label: "Display Name") {
                        TextField("Your display name", text: $displayName)
                            .textFieldStyle(.plain)
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                            .padding(.horizontal, WaiAgentsSpacing.space3)
                            .frame(height: 44)
                            .background(bgInput)
                            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
                            .overlay {
                                RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                                    .strokeBorder(borderPrimary, lineWidth: 1)
                            }
                            .onChange(of: displayName) { hasChanges = true }
                    }

                    fieldGroup(label: "Bio") {
                        TextEditor(text: $bio)
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                            .scrollContentBackground(.hidden)
                            .frame(minHeight: 80, maxHeight: 160)
                            .padding(WaiAgentsSpacing.space3)
                            .background(bgInput)
                            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
                            .overlay {
                                RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                                    .strokeBorder(borderPrimary, lineWidth: 1)
                            }
                            .onChange(of: bio) { hasChanges = true }
                    }

                    fieldGroup(label: "Email") {
                        TextField("your@email.com", text: $email)
                            .textFieldStyle(.plain)
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                            .padding(.horizontal, WaiAgentsSpacing.space3)
                            .frame(height: 44)
                            .background(bgInput)
                            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
                            .overlay {
                                RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                                    .strokeBorder(borderPrimary, lineWidth: 1)
                            }
                            .textContentType(.emailAddress)
                            #if os(iOS)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            #endif
                            .onChange(of: email) { hasChanges = true }
                    }
                }

                // Save button
                if hasChanges {
                    Button {
                        // Save placeholder
                        hasChanges = false
                    } label: {
                        Text("Save Changes")
                            .font(WaiAgentsTypography.textLg)
                            .foregroundStyle(WaiAgentsColors.Light.textInverse)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(WaiAgentsColors.accentPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
                    }
                    .buttonStyle(.plain)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
        }
        .background(bgPrimary)
        #if os(iOS)
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    @ViewBuilder
    private func fieldGroup(label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
            Text(label)
                .font(WaiAgentsTypography.bodySmall)
                .foregroundStyle(textSecondary)
            content()
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var bgInput: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgInput : WaiAgentsColors.Light.bgInput
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.borderPrimary : WaiAgentsColors.Light.borderPrimary
    }
}
