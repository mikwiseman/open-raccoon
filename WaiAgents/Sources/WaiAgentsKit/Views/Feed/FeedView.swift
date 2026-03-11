import SwiftUI

/// Main feed view with grid/card layout and tabs:
/// "For You", "Trending", "Following", "New".
/// Pill-style tab selection indicator, pull to refresh, infinite scroll.
public struct FeedView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedTab: FeedViewModel.FeedTab = .forYou

    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            // Tab bar
            tabBar

            // Content
            if let vm = appState.feedViewModel {
                if vm.isLoading && vm.feedItems.isEmpty {
                    LoadingView()
                        .frame(maxHeight: .infinity)
                } else if let error = vm.error {
                    VStack(spacing: WaiAgentsSpacing.space3) {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundStyle(WaiAgentsColors.Semantic.error)
                        Text(error)
                            .font(WaiAgentsTypography.textSm)
                            .foregroundStyle(textSecondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.feedItems.isEmpty {
                    emptyState
                } else {
                    feedContent(vm)
                }
            } else {
                LoadingView()
                    .frame(maxHeight: .infinity)
            }
        }
        .background(bgPrimary)
        .task {
            if appState.feedViewModel == nil {
                let vm = FeedViewModel(apiClient: appState.apiClient)
                appState.feedViewModel = vm
                await vm.loadFeed(tab: selectedTab)
            }
        }
    }

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: WaiAgentsSpacing.space2) {
                ForEach(FeedViewModel.FeedTab.allCases, id: \.rawValue) { tab in
                    Button {
                        withAnimation(WaiAgentsMotion.easeDefault) {
                            selectedTab = tab
                        }
                        Task {
                            await appState.feedViewModel?.loadFeed(tab: tab)
                        }
                    } label: {
                        Text(tab.rawValue)
                            .font(WaiAgentsTypography.agentStatus)
                            .foregroundStyle(
                                selectedTab == tab ? WaiAgentsColors.Light.textInverse : textSecondary
                            )
                            .padding(.horizontal, WaiAgentsSpacing.space4)
                            .padding(.vertical, WaiAgentsSpacing.space2)
                            .background(
                                selectedTab == tab
                                    ? WaiAgentsColors.accentPrimary
                                    : bgTertiary
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.vertical, WaiAgentsSpacing.space3)
        }
        .background(bgSecondary)
    }

    private func feedContent(_ vm: FeedViewModel) -> some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: WaiAgentsSpacing.space4),
                    GridItem(.flexible(), spacing: WaiAgentsSpacing.space4),
                ],
                spacing: WaiAgentsSpacing.space4
            ) {
                ForEach(vm.feedItems) { item in
                    FeedCardView(
                        item: item,
                        authorName: item.creatorID,
                        onTap: {
                            appState.selectedFeedItemID = item.id
                            appState.selectedFeedItem = item
                        },
                        onLike: {
                            Task {
                                await vm.likeItem(id: item.id)
                            }
                        }
                    )
                }
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.top, WaiAgentsSpacing.space3)

            // Infinite scroll trigger — only show when there are more items to load
            if !vm.feedItems.isEmpty, vm.hasMore {
                ProgressView()
                    .padding(.vertical, WaiAgentsSpacing.space6)
                    .onAppear {
                        Task {
                            await vm.loadMore()
                        }
                    }
            }
        }
        .refreshable {
            await vm.refresh(tab: selectedTab)
        }
    }

    private var emptyState: some View {
        VStack(spacing: WaiAgentsSpacing.space4) {
            Image(systemName: "sparkles.rectangle.stack")
                .font(.system(size: 36))
                .foregroundStyle(textTertiary)
            Text("Nothing here yet")
                .font(WaiAgentsTypography.textLg)
                .foregroundStyle(textSecondary)
            Text("Discover agents, pages, and creations from the community")
                .font(WaiAgentsTypography.bodySmall)
                .foregroundStyle(textTertiary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, WaiAgentsSpacing.space8)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgSecondary : WaiAgentsColors.Light.bgSecondary
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgTertiary : WaiAgentsColors.Light.bgTertiary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}
