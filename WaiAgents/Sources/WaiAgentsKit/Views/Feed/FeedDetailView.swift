import SwiftUI

/// Full-screen detail of a feed item with content display,
/// like/fork buttons, author info with follow button,
/// and comments/discussion placeholder.
public struct FeedDetailView: View {
    public let item: FeedItem
    public let authorName: String
    public var isLiked: Bool
    public var isFollowingAuthor: Bool
    public let onLike: () -> Void
    public let onFork: () -> Void
    public let onFollow: () -> Void

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

    public init(
        item: FeedItem,
        authorName: String,
        isLiked: Bool = false,
        isFollowingAuthor: Bool = false,
        onLike: @escaping () -> Void,
        onFork: @escaping () -> Void,
        onFollow: @escaping () -> Void
    ) {
        self.item = item
        self.authorName = authorName
        self.isLiked = isLiked
        self.isFollowingAuthor = isFollowingAuthor
        self.onLike = onLike
        self.onFork = onFork
        self.onFollow = onFollow
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space5) {
                // Thumbnail / Preview area
                thumbnailArea

                VStack(alignment: .leading, spacing: WaiAgentsSpacing.space4) {
                    // Title
                    Text(item.title ?? "Untitled")
                        .font(WaiAgentsTypography.h2)
                        .foregroundStyle(textPrimary)

                    // Type badge
                    Text(item.type.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(WaiAgentsTypography.caption)
                        .foregroundStyle(WaiAgentsColors.accentPrimary)
                        .padding(.horizontal, WaiAgentsSpacing.space2)
                        .padding(.vertical, 2)
                        .background(
                            colorScheme == .dark
                                ? WaiAgentsColors.accentSubtleDark
                                : WaiAgentsColors.accentSubtleLight
                        )
                        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.sm))

                    // Description / Content
                    if let description = item.description {
                        Text(description)
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textSecondary)
                    }

                    Divider()
                        .foregroundStyle(borderPrimary)

                    // Author info
                    authorSection

                    // Action buttons
                    actionButtons

                    Divider()
                        .foregroundStyle(borderPrimary)

                    // Comments placeholder
                    commentsSection
                }
                .padding(.horizontal, WaiAgentsSpacing.space4)
            }
        }
        .background(bgPrimary)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    private var thumbnailArea: some View {
        Rectangle()
            .fill(bgTertiary)
            .aspectRatio(16 / 9, contentMode: .fit)
            .overlay {
                if item.thumbnailURL != nil {
                    Image(systemName: "photo")
                        .font(.system(size: 36))
                        .foregroundStyle(textTertiary)
                } else {
                    Image(systemName: "sparkles")
                        .font(.system(size: 36))
                        .foregroundStyle(WaiAgentsColors.accentPrimary.opacity(0.5))
                }
            }
    }

    private var authorSection: some View {
        HStack(spacing: WaiAgentsSpacing.space3) {
            AvatarView(name: authorName, size: 40)

            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space1) {
                Text(authorName)
                    .font(WaiAgentsTypography.textLg)
                    .foregroundStyle(textPrimary)
                Text("Creator")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            Spacer()

            Button {
                onFollow()
            } label: {
                Text(isFollowingAuthor ? "Following" : "Follow")
                    .font(WaiAgentsTypography.bodySmall)
                    .foregroundStyle(
                        isFollowingAuthor ? textSecondary : WaiAgentsColors.Light.textInverse
                    )
                    .padding(.horizontal, WaiAgentsSpacing.space4)
                    .frame(height: 36)
                    .background(
                        isFollowingAuthor ? bgTertiary : WaiAgentsColors.accentPrimary
                    )
                    .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
            }
            .buttonStyle(.plain)
        }
    }

    private var actionButtons: some View {
        HStack(spacing: WaiAgentsSpacing.space4) {
            // Like button
            Button(action: onLike) {
                HStack(spacing: WaiAgentsSpacing.space2) {
                    Image(systemName: isLiked ? "heart.fill" : "heart")
                        .font(.system(size: 16))
                        .foregroundStyle(isLiked ? WaiAgentsColors.Semantic.error : textSecondary)
                    Text("\(item.likeCount)")
                        .font(WaiAgentsTypography.body)
                        .foregroundStyle(textSecondary)
                }
                .frame(height: 44)
            }
            .buttonStyle(.plain)

            // Fork button
            Button(action: onFork) {
                HStack(spacing: WaiAgentsSpacing.space2) {
                    Image(systemName: "arrow.triangle.branch")
                        .font(.system(size: 14))
                        .foregroundStyle(textSecondary)
                    Text("\(item.forkCount)")
                        .font(WaiAgentsTypography.body)
                        .foregroundStyle(textSecondary)
                }
                .frame(height: 44)
            }
            .buttonStyle(.plain)

            // Share button
            Button {
                // Share action placeholder
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 16))
                    .foregroundStyle(textSecondary)
                    .frame(height: 44)
            }
            .buttonStyle(.plain)

            Spacer()

            // View count
            HStack(spacing: WaiAgentsSpacing.space1) {
                Image(systemName: "eye")
                    .font(.system(size: 12))
                    .foregroundStyle(textTertiary)
                Text("\(item.viewCount)")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }
        }
    }

    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space3) {
            Text("Discussion")
                .font(WaiAgentsTypography.h3)
                .foregroundStyle(textPrimary)

            Text("Comments coming soon")
                .font(WaiAgentsTypography.bodySmall)
                .foregroundStyle(textTertiary)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, WaiAgentsSpacing.space8)
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgTertiary : WaiAgentsColors.Light.bgTertiary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.borderPrimary : WaiAgentsColors.Light.borderPrimary
    }
}
