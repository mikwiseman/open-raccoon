import SwiftUI

/// 14px pill with platform color for bridge indicators.
public struct PlatformBadgeView: View {
    public let platform: String

    @Environment(\.colorScheme) private var colorScheme

    public init(platform: String) {
        self.platform = platform
    }

    public var body: some View {
        Text(platform.capitalized)
            .font(.system(size: 9, weight: .medium))
            .foregroundStyle(.white)
            .padding(.horizontal, 4)
            .frame(height: 14)
            .background(platformColor)
            .clipShape(Capsule())
            .opacity(colorScheme == .dark ? 0.9 : 1.0)
    }

    private var platformColor: Color {
        switch platform.lowercased() {
        case "telegram": return RaccoonColors.Platform.telegram
        case "whatsapp": return RaccoonColors.Platform.whatsapp
        case "signal": return RaccoonColors.Platform.signal
        case "discord": return RaccoonColors.Platform.discord
        case "slack": return RaccoonColors.Platform.slack
        case "email": return RaccoonColors.Platform.email
        case "sms": return RaccoonColors.Platform.sms
        case "imessage": return RaccoonColors.Platform.iMessage
        case "matrix": return RaccoonColors.Platform.matrix
        default: return RaccoonColors.Platform.email
        }
    }
}
