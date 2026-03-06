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
        VStack(spacing: WaiAgentsSpacing.space6) {
            Spacer()

            // Biometric icon
            VStack(spacing: WaiAgentsSpacing.space4) {
                Image(systemName: "person.badge.key.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(WaiAgentsColors.accentPrimary)
                    .symbolRenderingMode(.hierarchical)

                Text(mode == .register ? "Register a Passkey" : "Sign in with Passkey")
                    .font(WaiAgentsTypography.h2)
                    .foregroundStyle(textPrimary)
            }

            // Explanation
            VStack(spacing: WaiAgentsSpacing.space3) {
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
            .padding(.horizontal, WaiAgentsSpacing.space4)

            Spacer()

            // Action button
            Button {
                isLoading = true
                onPasskeyAction()
            } label: {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(WaiAgentsColors.Light.textInverse)
                    } else {
                        HStack(spacing: WaiAgentsSpacing.space2) {
                            Image(systemName: "person.badge.key")
                                .font(.system(size: 16))
                            Text(mode == .register ? "Register Passkey" : "Sign in with Passkey")
                                .font(WaiAgentsTypography.textLg)
                        }
                    }
                }
                .foregroundStyle(WaiAgentsColors.Light.textInverse)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(WaiAgentsColors.accentPrimary)
                .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, WaiAgentsSpacing.space6)

            Spacer()
                .frame(height: WaiAgentsSpacing.space8)
        }
        .frame(maxWidth: 400)
        .frame(maxWidth: .infinity)
        .background(bgPrimary)
    }

    private func explanationRow(icon: String, text: String) -> some View {
        HStack(spacing: WaiAgentsSpacing.space3) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(WaiAgentsColors.accentPrimary)
                .frame(width: 32, alignment: .center)

            Text(text)
                .font(WaiAgentsTypography.body)
                .foregroundStyle(textSecondary)

            Spacer()
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }
}
