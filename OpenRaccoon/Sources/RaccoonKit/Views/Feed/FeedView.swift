import SwiftUI

/// Main feed view with grid/card layout and tabs:
/// "For You", "Trending", "Following", "New".
/// Pill-style tab selection indicator, pull to refresh, infinite scroll.
public struct FeedView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel: FeedViewModel?
    @State private var selectedTab: FeedViewModel.FeedTab = .forYou

    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            // Tab bar
            tabBar

            // Content
            if let vm = viewModel {
                if vm.isLoading && vm.feedItems.isEmpty {
                    LoadingView()
                        .frame(maxHeight: .infinity)
                } else if let error = vm.error {
                    VStack(spacing: RaccoonSpacing.space3) {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundStyle(RaccoonColors.Semantic.error)
                        Text(error)
                            .font(RaccoonTypography.textSm)
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
            if viewModel == nil {
                let vm = FeedViewModel(apiClient: appState.apiClient)
                viewModel = vm
                await vm.loadFeed(tab: selectedTab)
            }
        }
    }

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: RaccoonSpacing.space2) {
                ForEach(FeedViewModel.FeedTab.allCases, id: \.rawValue) { tab in
                    Button {
                        withAnimation(RaccoonMotion.easeDefault) {
                            selectedTab = tab
                        }
                        Task {
                            await viewModel?.loadFeed(tab: tab)
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

    private func feedContent(_ vm: FeedViewModel) -> some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: RaccoonSpacing.space4),
                    GridItem(.flexible(), spacing: RaccoonSpacing.space4),
                ],
                spacing: RaccoonSpacing.space4
            ) {
                ForEach(vm.feedItems) { item in
                    FeedCardView(
                        item: item,
                        authorName: item.creatorID,
                        onTap: {
                            // Navigate to detail
                        },
                        onLike: {
                            Task {
                                await vm.likeItem(id: item.id)
                            }
                        }
                    )
                }
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .padding(.top, RaccoonSpacing.space3)

            // Infinite scroll trigger
            if !vm.feedItems.isEmpty {
                ProgressView()
                    .padding(.vertical, RaccoonSpacing.space6)
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
