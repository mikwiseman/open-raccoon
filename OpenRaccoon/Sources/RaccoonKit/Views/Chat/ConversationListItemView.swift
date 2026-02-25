import SwiftUI

/// Conversation list item per DESIGN_SYSTEM.md Section 5.2:
/// - 68px height, 40px avatar
/// - Title: text-base medium, truncated
/// - Preview: text-sm secondary, max 1 line, truncated
/// - Timestamp: text-xs tertiary, top-right
/// - Unread badge: 20px circle accent
/// - Platform badge: 14px pill
public struct ConversationListItemView: View {
    public let conversation: Conversation
    public var lastMessagePreview: String?
    public var unreadCount: Int = 0
    public var isOnline: Bool = false
    public var platformBadge: String?

    @Environment(\.colorScheme) private var colorScheme

    public init(
        conversation: Conversation,
        lastMessagePreview: String? = nil,
        unreadCount: Int = 0,
        isOnline: Bool = false,
        platformBadge: String? = nil
    ) {
        self.conversation = conversation
        self.lastMessagePreview = lastMessagePreview
        self.unreadCount = unreadCount
        self.isOnline = isOnline
        self.platformBadge = platformBadge
    }

    public var body: some View {
        HStack(spacing: RaccoonSpacing.space3) {
            // Avatar with optional platform badge
            ZStack(alignment: .bottomTrailing) {
                AvatarView(
                    name: conversation.title ?? "?",
                    size: 40,
                    isOnline: isOnline,
                    isAgent: conversation.type == .agent,
                    agentAccentColor: RaccoonColors.AgentAccent.default
                )

                if let platform = platformBadge ?? bridgePlatform {
                    PlatformBadgeView(platform: platform)
                        .offset(x: 4, y: 4)
                }
            }

            // Title + preview
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(conversation.title ?? "Untitled")
                        .font(RaccoonTypography.textBase)
                        .fontWeight(.medium)
                        .foregroundStyle(textPrimary)
                        .lineLimit(1)

                    Spacer()

                    if let timestamp = conversation.lastMessageAt {
                        Text(formattedTimestamp(timestamp))
                            .font(RaccoonTypography.textXs)
                            .foregroundStyle(textTertiary)
                    }
                }

                HStack {
                    Text(lastMessagePreview ?? previewPlaceholder)
                        .font(RaccoonTypography.textSm)
                        .foregroundStyle(textSecondary)
                        .lineLimit(1)

                    Spacer()

                    if unreadCount > 0 {
                        BadgeView(count: unreadCount)
                    }
                }
            }
        }
        .padding(.horizontal, RaccoonSpacing.space3)
        .padding(.vertical, 10)
        .frame(height: 68)
        .contentShape(Rectangle())
    }

    private var bridgePlatform: String? {
        guard conversation.type == .bridge else { return nil }
        return conversation.bridgeID != nil ? "bridge" : nil
    }

    private var previewPlaceholder: String {
        switch conversation.type {
        case .agent:
            return "AI agent conversation"
        case .bridge:
            return "Bridged conversation"
        case .dm:
            return "Direct message"
        case .group:
            return "Group conversation"
        }
    }

    private func formattedTimestamp(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "HH:mm"
            return formatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else if calendar.isDate(date, equalTo: Date(), toGranularity: .weekOfYear) {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEE"
            return formatter.string(from: date)
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            return formatter.string(from: date)
        }
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
}
