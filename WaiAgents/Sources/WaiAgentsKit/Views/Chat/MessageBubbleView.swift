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
    public let currentUserID: String

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var isSent: Bool {
        message.senderType == .human && message.senderID == currentUserID
    }

    public init(message: Message, isFirstInGroup: Bool, isLastInGroup: Bool, currentUserID: String) {
        self.message = message
        self.isFirstInGroup = isFirstInGroup
        self.isLastInGroup = isLastInGroup
        self.currentUserID = currentUserID
    }

    public var body: some View {
        HStack(alignment: .top, spacing: WaiAgentsSpacing.space2) {
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
        .padding(.horizontal, WaiAgentsSpacing.space4)
        .padding(.top, isFirstInGroup ? WaiAgentsSpacing.space2 : 2)
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
        VStack(alignment: isSent ? .trailing : .leading, spacing: WaiAgentsSpacing.space1) {
            // Reply reference
            if let replyToID = message.metadata?.replyTo {
                ReplyView(
                    replyToText: replyToID,
                    senderName: ""
                )
            }

            MessageContentView(message: message)

            if isLastInGroup {
                Text(formattedTime)
                    .font(WaiAgentsTypography.textXs)
                    .foregroundStyle(textSecondary)
            }

            // Reactions
            if let reactions = message.reactions, !reactions.isEmpty {
                ReactionView(reactions: reactions)
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
                topLeadingRadius: WaiAgentsRadius.xl,
                bottomLeadingRadius: WaiAgentsRadius.xl,
                bottomTrailingRadius: isLastInGroup ? WaiAgentsRadius.sm : WaiAgentsRadius.xl,
                topTrailingRadius: WaiAgentsRadius.xl
            )
        } else {
            return UnevenRoundedRectangle(
                topLeadingRadius: WaiAgentsRadius.xl,
                bottomLeadingRadius: isLastInGroup ? WaiAgentsRadius.sm : WaiAgentsRadius.xl,
                bottomTrailingRadius: WaiAgentsRadius.xl,
                topTrailingRadius: WaiAgentsRadius.xl
            )
        }
    }

    private var bubbleBackground: Color {
        if isSent {
            return colorScheme == .dark
                ? WaiAgentsColors.Dark.bgMessageSent
                : WaiAgentsColors.Light.bgMessageSent
        } else {
            return colorScheme == .dark
                ? WaiAgentsColors.Dark.bgMessageReceived
                : WaiAgentsColors.Light.bgMessageReceived
        }
    }

    private var bubbleBorder: Color {
        colorScheme == .dark
            ? WaiAgentsColors.Dark.borderPrimary
            : WaiAgentsColors.Light.borderSecondary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var agentColor: Color {
        WaiAgentsColors.AgentAccent.default
    }

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    private var formattedTime: String {
        Self.timeFormatter.string(from: message.createdAt)
    }
}
