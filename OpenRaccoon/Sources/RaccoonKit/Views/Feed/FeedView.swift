import SwiftUI

/// Main feed view with grid/card layout and tabs:
/// "For You", "Trending", "Following", "New".
/// Pill-style tab selection indicator, pull to refresh, infinite scroll.
public struct FeedView: View {
    @State private var selectedTab: FeedTab = .forYou
    @State private var feedItems: [FeedItem] = []
    @State private var isLoading = false
    @State private var isRefreshing = false

    @Environment(\.colorScheme) private var colorScheme

    enum FeedTab: String, CaseIterable, Sendable {
        case forYou = "For You"
        case trending = "Trending"
        case following = "Following"
        case new = "New"
    }

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            // Tab bar
            tabBar

            // Content
            if isLoading && feedItems.isEmpty {
                LoadingView()
                    .frame(maxHeight: .infinity)
            } else if feedItems.isEmpty {
                emptyState
            } else {
                feedContent
            }
        }
        .background(bgPrimary)
    }

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: RaccoonSpacing.space2) {
                ForEach(FeedTab.allCases, id: \.rawValue) { tab in
                    Button {
                        withAnimation(RaccoonMotion.easeDefault) {
                            selectedTab = tab
                        }
                    } label: {
                        Text(tab.rawValue)
                            .font(RaccoonTypography.agentStatus)
                            .foregroundStyle(
                                selectedTab == tab ? RaccoonColors.Light.textInverse : textSecondary
                            )
                            .padding(.horizontal, RaccoonSpacing.space4)
                            .padding(.vertical, RaccoonSpacing.space2)
                            .background(
                                selectedTab == tab
                                    ? RaccoonColors.accentPrimary
                                    : bgTertiary
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .padding(.vertical, RaccoonSpacing.space3)
        }
        .background(bgSecondary)
    }

    private var feedContent: some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: RaccoonSpacing.space4),
                    GridItem(.flexible(), spacing: RaccoonSpacing.space4),
                ],
                spacing: RaccoonSpacing.space4
            ) {
                ForEach(feedItems) { item in
                    FeedCardView(
                        item: item,
                        authorName: item.creatorID,
                        onTap: {
                            // Navigate to detail
                        },
                        onLike: {
                            // Like action
                        }
                    )
                }
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .padding(.top, RaccoonSpacing.space3)

            // Infinite scroll trigger
            if !feedItems.isEmpty {
                ProgressView()
                    .padding(.vertical, RaccoonSpacing.space6)
                    .onAppear {
                        // Load more items
                    }
            }
        }
        .refreshable {
            isRefreshing = true
            // Refresh feed
            isRefreshing = false
        }
    }

    private var emptyState: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            Image(systemName: "sparkles.rectangle.stack")
                .font(.system(size: 36))
                .foregroundStyle(textTertiary)
            Text("Nothing here yet")
                .font(RaccoonTypography.textLg)
                .foregroundStyle(textSecondary)
            Text("Discover agents, pages, and creations from the community")
                .font(RaccoonTypography.bodySmall)
                .foregroundStyle(textTertiary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, RaccoonSpacing.space8)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgTertiary : RaccoonColors.Light.bgTertiary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }
}
