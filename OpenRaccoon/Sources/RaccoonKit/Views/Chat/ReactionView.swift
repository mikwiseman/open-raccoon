import SwiftUI

/// Displays reactions on a message as small emoji pills.
public struct ReactionView: View {
    public let reactions: [MessageReaction]

    @Environment(\.colorScheme) private var colorScheme

    public init(reactions: [MessageReaction]) {
        self.reactions = reactions
    }

    public var body: some View {
        if !reactions.isEmpty {
            HStack(spacing: RaccoonSpacing.space1) {
                ForEach(groupedReactions, id: \.emoji) { group in
                    reactionPill(emoji: group.emoji, count: group.count)
                }
            }
        }
    }

    private func reactionPill(emoji: String, count: Int) -> some View {
        HStack(spacing: 2) {
            Text(emoji)
                .font(.system(size: 12))
            if count > 1 {
                Text("\(count)")
                    .font(RaccoonTypography.text2xs)
                    .foregroundStyle(textSecondary)
            }
        }
        .padding(.horizontal, RaccoonSpacing.space1)
        .padding(.vertical, 2)
        .background(bgTertiary)
        .clipShape(Capsule())
    }

    private struct ReactionGroup {
        let emoji: String
        let count: Int
    }

    private var groupedReactions: [ReactionGroup] {
        var counts: [String: Int] = [:]
        for reaction in reactions {
            counts[reaction.emoji, default: 0] += 1
        }
        return counts.map { ReactionGroup(emoji: $0.key, count: $0.value) }
            .sorted { $0.count > $1.count }
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgTertiary : RaccoonColors.Light.bgTertiary
    }
}
