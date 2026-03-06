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
        case "telegram": return WaiAgentsColors.Platform.telegram
        case "whatsapp": return WaiAgentsColors.Platform.whatsapp
        case "signal": return WaiAgentsColors.Platform.signal
        case "discord": return WaiAgentsColors.Platform.discord
        case "slack": return WaiAgentsColors.Platform.slack
        case "email": return WaiAgentsColors.Platform.email
        case "sms": return WaiAgentsColors.Platform.sms
        case "imessage": return WaiAgentsColors.Platform.iMessage
        case "matrix": return WaiAgentsColors.Platform.matrix
        default: return WaiAgentsColors.Platform.email
        }
    }
}
