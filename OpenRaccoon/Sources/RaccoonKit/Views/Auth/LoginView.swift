import SwiftUI

/// Login view with email + password fields, magic link option,
/// "Don't have an account? Register" link, and OAuth buttons.
/// Clean, centered layout with generous spacing.
public struct LoginView: View {
    private enum LoginMode: String, CaseIterable {
        case password = "Password"
        case magicLink = "Magic Link"
    }

    @State private var email = ""
    @State private var password = ""
    @State private var magicLinkToken = ""
    @State private var loginMode: LoginMode = .password

    @Environment(AppState.self) private var appState

    public let onLogin: (String, String) -> Void
    public let onMagicLinkRequest: (String) -> Void
    public let onMagicLinkVerify: (String) -> Void
    public let onNavigateToRegister: () -> Void
    public let onOAuthGoogle: () -> Void
    public let onOAuthApple: () -> Void
    public let onOAuthGitHub: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    public init(
        onLogin: @escaping (String, String) -> Void,
        onMagicLinkRequest: @escaping (String) -> Void,
        onMagicLinkVerify: @escaping (String) -> Void,
        onNavigateToRegister: @escaping () -> Void,
        onOAuthGoogle: @escaping () -> Void,
        onOAuthApple: @escaping () -> Void,
        onOAuthGitHub: @escaping () -> Void
    ) {
        self.onLogin = onLogin
        self.onMagicLinkRequest = onMagicLinkRequest
        self.onMagicLinkVerify = onMagicLinkVerify
        self.onNavigateToRegister = onNavigateToRegister
        self.onOAuthGoogle = onOAuthGoogle
        self.onOAuthApple = onOAuthApple
        self.onOAuthGitHub = onOAuthGitHub
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: RaccoonSpacing.space6) {
                Spacer()
                    .frame(height: RaccoonSpacing.space8)

                // Logo / Brand
                VStack(spacing: RaccoonSpacing.space3) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(RaccoonColors.accentPrimary)

                    Text("Open Raccoon")
                        .font(RaccoonTypography.h1)
                        .foregroundStyle(textPrimary)

                    Text("Welcome back")
                        .font(RaccoonTypography.body)
                        .foregroundStyle(textSecondary)
                }

                // Login mode picker
                Picker("Login method", selection: $loginMode) {
                    ForEach(LoginMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: loginMode) {
                    appState.authStore.loginError = nil
                    appState.authStore.resetMagicLinkState()
                }

                // Error messages
                if loginMode == .password, let errorMessage = appState.authStore.loginError {
                    Text(errorMessage)
                        .font(RaccoonTypography.bodySmall)
                        .foregroundStyle(RaccoonColors.Semantic.error)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, RaccoonSpacing.space4)
                }

                if loginMode == .magicLink, let errorMessage = appState.authStore.magicLinkError {
                    Text(errorMessage)
                        .font(RaccoonTypography.bodySmall)
                        .foregroundStyle(RaccoonColors.Semantic.error)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, RaccoonSpacing.space4)
                }

                // Login form content
                switch loginMode {
                case .password:
                    passwordLoginContent
                case .magicLink:
                    magicLinkContent
                }

                // Divider
                HStack {
                    Rectangle()
                        .fill(borderPrimary)
                        .frame(height: 1)
                    Text("or")
                        .font(RaccoonTypography.caption)
                        .foregroundStyle(textTertiary)
                    Rectangle()
                        .fill(borderPrimary)
                        .frame(height: 1)
                }

                // OAuth buttons
                OAuthButtonsView(
                    onGoogleTapped: onOAuthGoogle,
                    onAppleTapped: onOAuthApple,
                    onGitHubTapped: onOAuthGitHub
                )

                // Register link
                Button(action: onNavigateToRegister) {
                    HStack(spacing: RaccoonSpacing.space1) {
                        Text("Don't have an account?")
                            .font(RaccoonTypography.bodySmall)
                            .foregroundStyle(textSecondary)
                        Text("Register")
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

    // MARK: - Password Login

    private var passwordLoginContent: some View {
        VStack(spacing: RaccoonSpacing.space3) {
            // Email + Password fields
            VStack(spacing: RaccoonSpacing.space3) {
                inputField(
                    placeholder: "Email",
                    text: $email,
                    icon: "envelope"
                )
                .textContentType(.emailAddress)
                #if os(iOS)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                #endif

                inputField(
                    placeholder: "Password",
                    text: $password,
                    icon: "lock",
                    isSecure: true
                )
                .textContentType(.password)
            }

            // Log In button
            Button {
                onLogin(email, password)
            } label: {
                Group {
                    if appState.authStore.isLoggingIn {
                        ProgressView()
                            .tint(RaccoonColors.Light.textInverse)
                    } else {
                        Text("Log In")
                            .font(RaccoonTypography.textLg)
                    }
                }
                .foregroundStyle(RaccoonColors.Light.textInverse)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(RaccoonColors.accentPrimary)
                .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
            }
            .buttonStyle(.plain)
            .disabled(email.isEmpty || password.isEmpty || appState.authStore.isLoggingIn)
        }
    }

    // MARK: - Magic Link Login

    @ViewBuilder
    private var magicLinkContent: some View {
        if appState.authStore.magicLinkSent {
            magicLinkSentContent
        } else {
            magicLinkRequestContent
        }
    }

    private var magicLinkRequestContent: some View {
        VStack(spacing: RaccoonSpacing.space3) {
            inputField(
                placeholder: "Email",
                text: $email,
                icon: "envelope"
            )
            .textContentType(.emailAddress)
            #if os(iOS)
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
            #endif

            // Send Magic Link button
            Button {
                onMagicLinkRequest(email)
            } label: {
                Group {
                    if appState.authStore.isSendingMagicLink {
                        ProgressView()
                            .tint(RaccoonColors.Light.textInverse)
                    } else {
                        HStack(spacing: RaccoonSpacing.space2) {
                            Image(systemName: "wand.and.stars")
                                .font(.system(size: 14))
                            Text("Send Magic Link")
                                .font(RaccoonTypography.textLg)
                        }
                    }
                }
                .foregroundStyle(RaccoonColors.Light.textInverse)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(RaccoonColors.accentPrimary)
                .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
            }
            .buttonStyle(.plain)
            .disabled(email.isEmpty || appState.authStore.isSendingMagicLink)
        }
    }

    private var magicLinkSentContent: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            // Success message
            VStack(spacing: RaccoonSpacing.space2) {
                Image(systemName: "envelope.badge.shield.half.filled")
                    .font(.system(size: 32))
                    .foregroundStyle(RaccoonColors.Semantic.success)

                Text("Check your email!")
                    .font(RaccoonTypography.textLg)
                    .foregroundStyle(textPrimary)

                Text("We sent a login link to \(email)")
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.vertical, RaccoonSpacing.space3)

            // Token input for manual entry
            VStack(spacing: RaccoonSpacing.space2) {
                Text("Or paste your token below")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)

                inputField(
                    placeholder: "Paste token",
                    text: $magicLinkToken,
                    icon: "key"
                )
                #if os(iOS)
                .textInputAutocapitalization(.never)
                #endif
                .autocorrectionDisabled()
            }

            // Verify button
            Button {
                onMagicLinkVerify(magicLinkToken)
            } label: {
                Group {
                    if appState.authStore.isVerifyingMagicLink {
                        ProgressView()
                            .tint(RaccoonColors.Light.textInverse)
                    } else {
                        Text("Verify Token")
                            .font(RaccoonTypography.textLg)
                    }
                }
                .foregroundStyle(RaccoonColors.Light.textInverse)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(RaccoonColors.accentPrimary)
                .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
            }
            .buttonStyle(.plain)
            .disabled(magicLinkToken.isEmpty || appState.authStore.isVerifyingMagicLink)

            // Send again link
            Button {
                appState.authStore.resetMagicLinkState()
            } label: {
                Text("Send a new link")
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(RaccoonColors.accentPrimary)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Shared Components

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

    // MARK: - Theme Colors

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

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
