import SwiftUI

/// Passkey registration/login UI with biometric icon,
/// explanation text, and register/sign-in buttons.
public struct PasskeyView: View {
    public enum Mode: Sendable {
        case register
        case login
    }

    public let mode: Mode
    public let onPasskeyAction: () -> Void

    @State private var isLoading = false
    @Environment(\.colorScheme) private var colorScheme

    public init(mode: Mode, onPasskeyAction: @escaping () -> Void) {
        self.mode = mode
        self.onPasskeyAction = onPasskeyAction
    }

    public var body: some View {
        VStack(spacing: RaccoonSpacing.space6) {
            Spacer()

            // Biometric icon
            VStack(spacing: RaccoonSpacing.space4) {
                Image(systemName: "person.badge.key.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(RaccoonColors.accentPrimary)
                    .symbolRenderingMode(.hierarchical)

                Text(mode == .register ? "Register a Passkey" : "Sign in with Passkey")
                    .font(RaccoonTypography.h2)
                    .foregroundStyle(textPrimary)
            }

            // Explanation
            VStack(spacing: RaccoonSpacing.space3) {
                explanationRow(
                    icon: "faceid",
                    text: "Use Face ID, Touch ID, or your device PIN"
                )
                explanationRow(
                    icon: "lock.shield",
                    text: "More secure than passwords"
                )
                explanationRow(
                    icon: "bolt.fill",
                    text: "Sign in instantly without typing"
                )
            }
            .padding(.horizontal, RaccoonSpacing.space4)

            Spacer()

            // Action button
            Button {
                isLoading = true
                onPasskeyAction()
            } label: {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(RaccoonColors.Light.textInverse)
                    } else {
                        HStack(spacing: RaccoonSpacing.space2) {
                            Image(systemName: "person.badge.key")
                                .font(.system(size: 16))
                            Text(mode == .register ? "Register Passkey" : "Sign in with Passkey")
                                .font(RaccoonTypography.textLg)
                        }
                    }
                }
                .foregroundStyle(RaccoonColors.Light.textInverse)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(RaccoonColors.accentPrimary)
                .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, RaccoonSpacing.space6)

            Spacer()
                .frame(height: RaccoonSpacing.space8)
        }
        .frame(maxWidth: 400)
        .frame(maxWidth: .infinity)
        .background(bgPrimary)
    }

    private func explanationRow(icon: String, text: String) -> some View {
        HStack(spacing: RaccoonSpacing.space3) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(RaccoonColors.accentPrimary)
                .frame(width: 32, alignment: .center)

            Text(text)
                .font(RaccoonTypography.body)
                .foregroundStyle(textSecondary)

            Spacer()
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }
}
