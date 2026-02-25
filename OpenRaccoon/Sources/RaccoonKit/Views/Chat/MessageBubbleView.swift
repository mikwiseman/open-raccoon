import SwiftUI

/// Message bubble per DESIGN_SYSTEM.md Section 5.1:
/// - Sent: right-aligned, bg-message-sent, 12px corners with 4px bottom-right
/// - Received: left-aligned, white with border, 12px corners with 4px bottom-left
/// - 28px avatar on first message in group
/// - Max width 65% of pane or 520px
/// - 10px 14px padding
/// - Timestamp text-xs text-secondary inside bubble
/// - 2px gap within groups, 8px between groups
public struct MessageBubbleView: View {
    public let message: Message
    public let isFirstInGroup: Bool
    public let isLastInGroup: Bool

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var isSent: Bool {
        message.senderType == .human && message.senderID == "current_user"
    }

    public init(message: Message, isFirstInGroup: Bool, isLastInGroup: Bool) {
        self.message = message
        self.isFirstInGroup = isFirstInGroup
        self.isLastInGroup = isLastInGroup
    }

    public var body: some View {
        HStack(alignment: .top, spacing: RaccoonSpacing.space2) {
            if isSent {
                Spacer(minLength: 0)
            } else {
                avatarSpace
            }

            VStack(alignment: isSent ? .trailing : .leading, spacing: 0) {
                bubble
            }

            if !isSent {
                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, RaccoonSpacing.space4)
        .padding(.top, isFirstInGroup ? RaccoonSpacing.space2 : 2)
    }

    @ViewBuilder
    private var avatarSpace: some View {
        if isFirstInGroup {
            AvatarView(
                name: message.senderID ?? "?",
                size: 28,
                isAgent: message.senderType == .agent,
                agentAccentColor: agentColor
            )
        } else {
            Color.clear
                .frame(width: 28, height: 28)
        }
    }

    private var bubble: some View {
        VStack(alignment: isSent ? .trailing : .leading, spacing: RaccoonSpacing.space1) {
            MessageContentView(message: message)

            if isLastInGroup {
                Text(formattedTime)
                    .font(RaccoonTypography.textXs)
                    .foregroundStyle(textSecondary)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 14)
        .frame(maxWidth: 520, alignment: isSent ? .trailing : .leading)
        .background(bubbleBackground)
        .overlay {
            if !isSent {
                bubbleShape
                    .strokeBorder(bubbleBorder, lineWidth: 1)
            }
        }
        .clipShape(bubbleShape)
    }

    private var bubbleShape: UnevenRoundedRectangle {
        if isSent {
            return UnevenRoundedRectangle(
                topLeadingRadius: RaccoonRadius.xl,
                bottomLeadingRadius: RaccoonRadius.xl,
                bottomTrailingRadius: isLastInGroup ? RaccoonRadius.sm : RaccoonRadius.xl,
                topTrailingRadius: RaccoonRadius.xl
            )
        } else {
            return UnevenRoundedRectangle(
                topLeadingRadius: RaccoonRadius.xl,
                bottomLeadingRadius: isLastInGroup ? RaccoonRadius.sm : RaccoonRadius.xl,
                bottomTrailingRadius: RaccoonRadius.xl,
                topTrailingRadius: RaccoonRadius.xl
            )
        }
    }

    private var bubbleBackground: Color {
        if isSent {
            return colorScheme == .dark
                ? RaccoonColors.Dark.bgMessageSent
                : RaccoonColors.Light.bgMessageSent
        } else {
            return colorScheme == .dark
                ? RaccoonColors.Dark.bgMessageReceived
                : RaccoonColors.Light.bgMessageReceived
        }
    }

    private var bubbleBorder: Color {
        colorScheme == .dark
            ? RaccoonColors.Dark.borderPrimary
            : RaccoonColors.Light.borderSecondary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var agentColor: Color {
        RaccoonColors.AgentAccent.default
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: message.createdAt)
    }
}
