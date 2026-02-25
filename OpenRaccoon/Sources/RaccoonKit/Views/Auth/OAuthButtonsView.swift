import SwiftUI

/// Reusable row of OAuth provider buttons.
/// Google, Apple, GitHub with brand colors.
public struct OAuthButtonsView: View {
    public let onGoogleTapped: () -> Void
    public let onAppleTapped: () -> Void
    public let onGitHubTapped: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    public init(
        onGoogleTapped: @escaping () -> Void,
        onAppleTapped: @escaping () -> Void,
        onGitHubTapped: @escaping () -> Void
    ) {
        self.onGoogleTapped = onGoogleTapped
        self.onAppleTapped = onAppleTapped
        self.onGitHubTapped = onGitHubTapped
    }

    public var body: some View {
        VStack(spacing: RaccoonSpacing.space3) {
            // Google
            oauthButton(
                title: "Continue with Google",
                icon: "globe",
                backgroundColor: colorScheme == .dark ? Color(hex: 0x2A2A2A) : Color.white,
                foregroundColor: textPrimary,
                borderColor: borderPrimary,
                action: onGoogleTapped
            )

            // Apple
            oauthButton(
                title: "Continue with Apple",
                icon: "apple.logo",
                backgroundColor: colorScheme == .dark ? Color.white : Color.black,
                foregroundColor: colorScheme == .dark ? Color.black : Color.white,
                borderColor: .clear,
                action: onAppleTapped
            )

            // GitHub
            oauthButton(
                title: "Continue with GitHub",
                icon: "chevron.left.forwardslash.chevron.right",
                backgroundColor: Color(hex: 0x24292E),
                foregroundColor: Color.white,
                borderColor: .clear,
                action: onGitHubTapped
            )
        }
    }

    private func oauthButton(
        title: String,
        icon: String,
        backgroundColor: Color,
        foregroundColor: Color,
        borderColor: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: RaccoonSpacing.space3) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                Text(title)
                    .font(RaccoonTypography.body)
            }
            .foregroundStyle(foregroundColor)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
            .overlay {
                if borderColor != .clear {
                    RoundedRectangle(cornerRadius: RaccoonRadius.xl)
                        .strokeBorder(borderColor, lineWidth: 1)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
