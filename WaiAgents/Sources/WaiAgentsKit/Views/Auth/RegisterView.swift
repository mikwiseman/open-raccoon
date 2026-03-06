import SwiftUI

/// Registration view with display name, email, password, confirm password fields,
/// "Create Account" button, password strength indicator,
/// and "Already have an account? Log In" link.
public struct RegisterView: View {
    @State private var displayName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""

    @Environment(AppState.self) private var appState

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
            VStack(spacing: WaiAgentsSpacing.space6) {
                Spacer()
                    .frame(height: WaiAgentsSpacing.space8)

                // Header
                VStack(spacing: WaiAgentsSpacing.space3) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(WaiAgentsColors.accentPrimary)

                    Text("Create Account")
                        .font(WaiAgentsTypography.h1)
                        .foregroundStyle(textPrimary)

                    Text("Join the WaiAgents community")
                        .font(WaiAgentsTypography.body)
                        .foregroundStyle(textSecondary)
                }

                // Error message
                if let errorMessage = appState.authStore.loginError {
                    Text(errorMessage)
                        .font(WaiAgentsTypography.bodySmall)
                        .foregroundStyle(WaiAgentsColors.Semantic.error)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, WaiAgentsSpacing.space4)
                }

                // Form fields
                VStack(spacing: WaiAgentsSpacing.space3) {
                    inputField(placeholder: "Username", text: $displayName, icon: "person")
                        .textContentType(.username)

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
                            .font(WaiAgentsTypography.caption)
                            .foregroundStyle(WaiAgentsColors.Semantic.error)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                // Create Account button
                Button {
                    onRegister(displayName, email, password)
                } label: {
                    Group {
                        if appState.authStore.isRegistering {
                            ProgressView()
                                .tint(WaiAgentsColors.Light.textInverse)
                        } else {
                            Text("Create Account")
                                .font(WaiAgentsTypography.textLg)
                        }
                    }
                    .foregroundStyle(WaiAgentsColors.Light.textInverse)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(isFormValid ? WaiAgentsColors.accentPrimary : bgTertiary)
                    .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
                }
                .buttonStyle(.plain)
                .disabled(!isFormValid || appState.authStore.isRegistering)

                // Login link
                Button(action: onNavigateToLogin) {
                    HStack(spacing: WaiAgentsSpacing.space1) {
                        Text("Already have an account?")
                            .font(WaiAgentsTypography.bodySmall)
                            .foregroundStyle(textSecondary)
                        Text("Log In")
                            .font(WaiAgentsTypography.agentStatus)
                            .foregroundStyle(WaiAgentsColors.accentPrimary)
                    }
                }
                .buttonStyle(.plain)

                Spacer()
            }
            .padding(.horizontal, WaiAgentsSpacing.space6)
            .frame(maxWidth: 400)
            .frame(maxWidth: .infinity)
        }
        .background(bgPrimary)
    }

    private var passwordStrength: some View {
        HStack(spacing: WaiAgentsSpacing.space2) {
            ForEach(0..<4, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(index < strengthLevel ? strengthColor : bgTertiary)
                    .frame(height: 4)
            }
            Text(strengthText)
                .font(WaiAgentsTypography.caption)
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
        case 0, 1: return WaiAgentsColors.Semantic.error
        case 2: return WaiAgentsColors.Semantic.warning
        case 3, 4: return WaiAgentsColors.Semantic.success
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
        HStack(spacing: WaiAgentsSpacing.space3) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(textTertiary)
                .frame(width: 20)

            if isSecure {
                SecureField(placeholder, text: text)
                    .textFieldStyle(.plain)
                    .font(WaiAgentsTypography.body)
                    .foregroundStyle(textPrimary)
            } else {
                TextField(placeholder, text: text)
                    .textFieldStyle(.plain)
                    .font(WaiAgentsTypography.body)
                    .foregroundStyle(textPrimary)
            }
        }
        .padding(.horizontal, WaiAgentsSpacing.space4)
        .frame(height: 48)
        .background(bgInput)
        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: WaiAgentsRadius.xl)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var bgInput: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgInput : WaiAgentsColors.Light.bgInput
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgTertiary : WaiAgentsColors.Light.bgTertiary
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

    private var borderPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.borderPrimary : WaiAgentsColors.Light.borderPrimary
    }
}
