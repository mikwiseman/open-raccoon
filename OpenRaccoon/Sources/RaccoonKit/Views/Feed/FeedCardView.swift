import SwiftUI

/// Card displaying a feed item with thumbnail/preview, title,
/// author avatar+name, like count, fork count.
/// Like button with scale bounce animation.
public struct FeedCardView: View {
    public let item: FeedItem
    public let authorName: String
    public var isLiked: Bool
    public let onTap: () -> Void
    public let onLike: () -> Void

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var likeScale: CGFloat = 1.0

    public init(
        item: FeedItem,
        authorName: String,
        isLiked: Bool = false,
        onTap: @escaping () -> Void,
        onLike: @escaping () -> Void
    ) {
        self.item = item
        self.authorName = authorName
        self.isLiked = isLiked
        self.onTap = onTap
        self.onLike = onLike
    }

    public var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                // Thumbnail
                thumbnailArea

                // Content
                VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
                    // Title
                    Text(item.title ?? "Untitled")
                        .font(RaccoonTypography.textLg)
                        .foregroundStyle(textPrimary)
                        .lineLimit(2)

                    // Description
                    if let description = item.description {
                        Text(description)
                            .font(RaccoonTypography.bodySmall)
                            .foregroundStyle(textSecondary)
                            .lineLimit(2)
                    }

                    // Author + stats
                    HStack(spacing: RaccoonSpacing.space2) {
                        AvatarView(name: authorName, size: 20)

                        Text(authorName)
                            .font(RaccoonTypography.bodySmall)
                            .foregroundStyle(textSecondary)

                        Spacer()

                        // Like button
                        Button {
                            performLikeAnimation()
                            onLike()
                        } label: {
                            HStack(spacing: RaccoonSpacing.space1) {
                                Image(systemName: isLiked ? "heart.fill" : "heart")
                                    .font(.system(size: 12))
                                    .foregroundStyle(isLiked ? RaccoonColors.Semantic.error : textTertiary)
                                    .scaleEffect(likeScale)
                                Text("\(item.likeCount)")
                                    .font(RaccoonTypography.caption)
                                    .foregroundStyle(textTertiary)
                            }
                        }
                        .buttonStyle(.plain)

                        // Fork count
                        HStack(spacing: RaccoonSpacing.space1) {
                            Image(systemName: "arrow.triangle.branch")
                                .font(.system(size: 11))
                                .foregroundStyle(textTertiary)
                            Text("\(item.forkCount)")
                                .font(RaccoonTypography.caption)
                                .foregroundStyle(textTertiary)
                        }
                    }
                }
                .padding(RaccoonSpacing.space3)
            }
            .background(bgSecondary)
            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
            .overlay {
                RoundedRectangle(cornerRadius: RaccoonRadius.xl)
                    .strokeBorder(borderPrimary, lineWidth: 1)
            }
            .raccoonShadow(RaccoonShadows.sm)
        }
        .buttonStyle(.plain)
    }

    private var thumbnailArea: some View {
        Group {
            if item.thumbnailURL != nil {
                // Placeholder for actual image loading (Kingfisher)
                Rectangle()
                    .fill(bgTertiary)
                    .aspectRatio(16 / 9, contentMode: .fit)
                    .overlay {
                        Image(systemName: "photo")
                            .font(.system(size: 24))
                            .foregroundStyle(textTertiary)
                    }
            } else {
                // Type-based placeholder
                Rectangle()
                    .fill(bgTertiary)
                    .aspectRatio(16 / 9, contentMode: .fit)
                    .overlay {
                        VStack(spacing: RaccoonSpacing.space2) {
                            Image(systemName: iconForType(item.type))
                                .font(.system(size: 28))
                                .foregroundStyle(RaccoonColors.accentPrimary.opacity(0.6))
                            Text(item.type.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(RaccoonTypography.caption)
                                .foregroundStyle(textTertiary)
                        }
                    }
            }
        }
        .clipShape(UnevenRoundedRectangle(
            topLeadingRadius: RaccoonRadius.xl,
            bottomLeadingRadius: 0,
            bottomTrailingRadius: 0,
            topTrailingRadius: RaccoonRadius.xl
        ))
    }

    private func performLikeAnimation() {
        guard !reduceMotion else { return }
        withAnimation(RaccoonMotion.spring) {
            likeScale = 1.3
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            withAnimation(RaccoonMotion.spring) {
                likeScale = 1.0
            }
        }
    }

    private func iconForType(_ type: FeedItem.FeedItemType) -> String {
        switch type {
        case .agentShowcase: return "cpu"
        case .pageShowcase: return "globe"
        case .toolShowcase: return "wrench.and.screwdriver"
        case .remix: return "arrow.triangle.branch"
        case .creation: return "sparkles"
        }
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgTertiary : RaccoonColors.Light.bgTertiary
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

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
