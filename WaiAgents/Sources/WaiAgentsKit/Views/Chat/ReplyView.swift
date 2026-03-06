import SwiftUI

/// Displays a compact reply reference above a message.
public struct ReplyView: View {
    public let replyToText: String
    public let senderName: String

    @Environment(\.colorScheme) private var colorScheme

    public init(replyToText: String, senderName: String) {
        self.replyToText = replyToText
        self.senderName = senderName
    }

    public var body: some View {
        HStack(spacing: WaiAgentsSpacing.space2) {
            RoundedRectangle(cornerRadius: 1)
                .fill(WaiAgentsColors.accentPrimary)
                .frame(width: 2)

            VStack(alignment: .leading, spacing: 2) {
                Text(senderName)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(WaiAgentsColors.accentPrimary)

                Text(replyToText)
                    .font(WaiAgentsTypography.textXs)
                    .foregroundStyle(textSecondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, WaiAgentsSpacing.space1)
        .frame(maxHeight: 36)
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }
}
