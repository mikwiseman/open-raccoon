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
            VStack(spacing: RaccoonSpacing.space6) {
                // Avatar section
                VStack(spacing: RaccoonSpacing.space3) {
                    AvatarView(name: displayName.isEmpty ? "U" : displayName, size: 80)

                    Button {
                        // Avatar upload placeholder
                    } label: {
                        Text("Change Avatar")
                            .font(RaccoonTypography.bodySmall)
                            .foregroundStyle(RaccoonColors.accentPrimary)
                    }
                    .buttonStyle(.plain)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, RaccoonSpacing.space4)

                // Form fields
                VStack(spacing: RaccoonSpacing.space4) {
                    fieldGroup(label: "Display Name") {
                        TextField("Your display name", text: $displayName)
                            .textFieldStyle(.plain)
                            .font(RaccoonTypography.body)
                            .foregroundStyle(textPrimary)
                            .padding(.horizontal, RaccoonSpacing.space3)
                            .frame(height: 44)
                            .background(bgInput)
                            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
                            .overlay {
                                RoundedRectangle(cornerRadius: RaccoonRadius.lg)
                                    .strokeBorder(borderPrimary, lineWidth: 1)
                            }
                            .onChange(of: displayName) { hasChanges = true }
                    }

                    fieldGroup(label: "Bio") {
                        TextEditor(text: $bio)
                            .font(RaccoonTypography.body)
                            .foregroundStyle(textPrimary)
                            .scrollContentBackground(.hidden)
                            .frame(minHeight: 80, maxHeight: 160)
                            .padding(RaccoonSpacing.space3)
                            .background(bgInput)
                            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
                            .overlay {
                                RoundedRectangle(cornerRadius: RaccoonRadius.lg)
                                    .strokeBorder(borderPrimary, lineWidth: 1)
                            }
                            .onChange(of: bio) { hasChanges = true }
                    }

                    fieldGroup(label: "Email") {
                        TextField("your@email.com", text: $email)
                            .textFieldStyle(.plain)
                            .font(RaccoonTypography.body)
                            .foregroundStyle(textPrimary)
                            .padding(.horizontal, RaccoonSpacing.space3)
                            .frame(height: 44)
                            .background(bgInput)
                            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
                            .overlay {
                                RoundedRectangle(cornerRadius: RaccoonRadius.lg)
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
                            .font(RaccoonTypography.textLg)
                            .foregroundStyle(RaccoonColors.Light.textInverse)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(RaccoonColors.accentPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
                    }
                    .buttonStyle(.plain)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .padding(.horizontal, RaccoonSpacing.space4)
        }
        .background(bgPrimary)
        #if os(iOS)
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    @ViewBuilder
    private func fieldGroup(label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
            Text(label)
                .font(RaccoonTypography.bodySmall)
                .foregroundStyle(textSecondary)
            content()
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var bgInput: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgInput : RaccoonColors.Light.bgInput
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
