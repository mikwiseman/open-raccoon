import SwiftUI

/// Registration view with display name, email, password, confirm password fields,
/// "Create Account" button, password strength indicator,
/// and "Already have an account? Log In" link.
public struct RegisterView: View {
    @State private var displayName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false

    public let onRegister: (String, String, String) -> Void
    public let onNavigateToLogin: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    public init(
        onRegister: @escaping (String, String, String) -> Void,
        onNavigateToLogin: @escaping () -> Void
    ) {
        self.onRegister = onRegister
        self.onNavigateToLogin = onNavigateToLogin
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: RaccoonSpacing.space6) {
                Spacer()
                    .frame(height: RaccoonSpacing.space8)

                // Header
                VStack(spacing: RaccoonSpacing.space3) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(RaccoonColors.accentPrimary)

                    Text("Create Account")
                        .font(RaccoonTypography.h1)
                        .foregroundStyle(textPrimary)

                    Text("Join the Open Raccoon community")
                        .font(RaccoonTypography.body)
                        .foregroundStyle(textSecondary)
                }

                // Form fields
                VStack(spacing: RaccoonSpacing.space3) {
                    inputField(placeholder: "Display Name", text: $displayName, icon: "person")
                        .textContentType(.name)

                    inputField(placeholder: "Email", text: $email, icon: "envelope")
                        .textContentType(.emailAddress)
                    #if os(iOS)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    #endif

                    inputField(placeholder: "Password", text: $password, icon: "lock", isSecure: true)
                        .textContentType(.newPassword)

                    // Password strength indicator
                    if !password.isEmpty {
                        passwordStrength
                    }

                    inputField(placeholder: "Confirm Password", text: $confirmPassword, icon: "lock.rotation", isSecure: true)
                        .textContentType(.newPassword)

                    // Password mismatch warning
                    if !confirmPassword.isEmpty && password != confirmPassword {
                        Text("Passwords do not match")
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(RaccoonColors.Semantic.error)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                // Create Account button
                Button {
                    isLoading = true
                    onRegister(displayName, email, password)
                } label: {
                    Group {
                        if isLoading {
                            ProgressView()
                                .tint(RaccoonColors.Light.textInverse)
                        } else {
                            Text("Create Account")
                                .font(RaccoonTypography.textLg)
                        }
                    }
                    .foregroundStyle(RaccoonColors.Light.textInverse)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(isFormValid ? RaccoonColors.accentPrimary : bgTertiary)
                    .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
                }
                .buttonStyle(.plain)
                .disabled(!isFormValid)

                // Login link
                Button(action: onNavigateToLogin) {
                    HStack(spacing: RaccoonSpacing.space1) {
                        Text("Already have an account?")
                            .font(RaccoonTypography.bodySmall)
                            .foregroundStyle(textSecondary)
                        Text("Log In")
                            .font(RaccoonTypography.agentStatus)
                            .foregroundStyle(RaccoonColors.accentPrimary)
                    }
                }
                .buttonStyle(.plain)

                Spacer()
            }
            .padding(.horizontal, RaccoonSpacing.space6)
            .frame(maxWidth: 400)
            .frame(maxWidth: .infinity)
        }
        .background(bgPrimary)
    }

    private var passwordStrength: some View {
        HStack(spacing: RaccoonSpacing.space2) {
            ForEach(0..<4, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(index < strengthLevel ? strengthColor : bgTertiary)
                    .frame(height: 4)
            }
            Text(strengthText)
                .font(RaccoonTypography.caption)
                .foregroundStyle(strengthColor)
        }
    }

    private var strengthLevel: Int {
        var score = 0
        if password.count >= 8 { score += 1 }
        if password.rangeOfCharacter(from: .uppercaseLetters) != nil { score += 1 }
        if password.rangeOfCharacter(from: .decimalDigits) != nil { score += 1 }
        if password.rangeOfCharacter(from: .punctuationCharacters) != nil ||
           password.rangeOfCharacter(from: .symbols) != nil { score += 1 }
        return score
    }

    private var strengthText: String {
        switch strengthLevel {
        case 0: return "Very Weak"
        case 1: return "Weak"
        case 2: return "Fair"
        case 3: return "Good"
        case 4: return "Strong"
        default: return ""
        }
    }

    private var strengthColor: Color {
        switch strengthLevel {
        case 0, 1: return RaccoonColors.Semantic.error
        case 2: return RaccoonColors.Semantic.warning
        case 3, 4: return RaccoonColors.Semantic.success
        default: return textTertiary
        }
    }

    private var isFormValid: Bool {
        !displayName.isEmpty &&
        !email.isEmpty &&
        password.count >= 8 &&
        password == confirmPassword
    }

    @ViewBuilder
    private func inputField(
        placeholder: String,
        text: Binding<String>,
        icon: String,
        isSecure: Bool = false
    ) -> some View {
        HStack(spacing: RaccoonSpacing.space3) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(textTertiary)
                .frame(width: 20)

            if isSecure {
                SecureField(placeholder, text: text)
                    .textFieldStyle(.plain)
                    .font(RaccoonTypography.body)
                    .foregroundStyle(textPrimary)
            } else {
                TextField(placeholder, text: text)
                    .textFieldStyle(.plain)
                    .font(RaccoonTypography.body)
                    .foregroundStyle(textPrimary)
            }
        }
        .padding(.horizontal, RaccoonSpacing.space4)
        .frame(height: 48)
        .background(bgInput)
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: RaccoonRadius.xl)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var bgInput: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgInput : RaccoonColors.Light.bgInput
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgTertiary : RaccoonColors.Light.bgTertiary
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

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
