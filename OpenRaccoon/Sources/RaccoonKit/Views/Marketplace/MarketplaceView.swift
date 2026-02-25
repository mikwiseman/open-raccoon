import SwiftUI

/// Browse AI agents with category filter pills, search bar,
/// and grid of agent cards.
public struct MarketplaceView: View {
    @State private var searchText = ""
    @State private var selectedCategory: String?
    @State private var agents: [Agent] = []
    @State private var isLoading = false

    @Environment(\.colorScheme) private var colorScheme

    private let categories = [
        "Coding", "Writing", "Research", "Creative",
        "Data Analysis", "Education", "Productivity", "Fun"
    ]

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            // Search bar
            SearchBarView(text: $searchText, placeholder: "Search agents...")
                .padding(.horizontal, RaccoonSpacing.space4)
                .padding(.top, RaccoonSpacing.space3)

            // Category pills
            categoryPills

            // Agent grid
            if isLoading {
                LoadingView()
                    .frame(maxHeight: .infinity)
            } else if filteredAgents.isEmpty {
                emptyState
            } else {
                agentGrid
            }
        }
        .background(bgPrimary)
    }

    private var categoryPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: RaccoonSpacing.space2) {
                // "All" pill
                categoryPill(name: "All", isSelected: selectedCategory == nil) {
                    selectedCategory = nil
                }

                ForEach(categories, id: \.self) { category in
                    categoryPill(name: category, isSelected: selectedCategory == category) {
                        selectedCategory = category
                    }
                }
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .padding(.vertical, RaccoonSpacing.space3)
        }
    }

    private func categoryPill(name: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(name)
                .font(RaccoonTypography.bodySmall)
                .foregroundStyle(isSelected ? RaccoonColors.Light.textInverse : textSecondary)
                .padding(.horizontal, RaccoonSpacing.space3)
                .padding(.vertical, RaccoonSpacing.space2)
                .background(isSelected ? RaccoonColors.accentPrimary : bgTertiary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var agentGrid: some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: RaccoonSpacing.space4),
                    GridItem(.flexible(), spacing: RaccoonSpacing.space4),
                ],
                spacing: RaccoonSpacing.space4
            ) {
                ForEach(filteredAgents) { agent in
                    agentCard(agent)
                }
            }
            .padding(.horizontal, RaccoonSpacing.space4)
        }
    }

    private func agentCard(_ agent: Agent) -> some View {
        VStack(alignment: .leading, spacing: RaccoonSpacing.space3) {
            // Avatar and name
            HStack(spacing: RaccoonSpacing.space3) {
                AvatarView(
                    name: agent.name,
                    size: 44,
                    isAgent: true,
                    agentAccentColor: RaccoonColors.AgentAccent.default
                )

                VStack(alignment: .leading, spacing: RaccoonSpacing.space1) {
                    Text(agent.name)
                        .font(RaccoonTypography.textLg)
                        .foregroundStyle(textPrimary)
                        .lineLimit(1)

                    if let category = agent.category {
                        Text(category)
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(textTertiary)
                    }
                }
            }

            // Description
            if let description = agent.description {
                Text(description)
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(textSecondary)
                    .lineLimit(3)
            }

            // Rating and usage
            HStack(spacing: RaccoonSpacing.space3) {
                // Stars
                if agent.ratingCount > 0 {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(RaccoonColors.Semantic.warning)
                        Text(String(format: "%.1f", agent.averageRating))
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(textSecondary)
                        Text("(\(agent.ratingCount))")
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(textTertiary)
                    }
                }

                Spacer()

                // Usage count
                HStack(spacing: RaccoonSpacing.space1) {
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 10))
                        .foregroundStyle(textTertiary)
                    Text("\(agent.usageCount)")
                        .font(RaccoonTypography.caption)
                        .foregroundStyle(textTertiary)
                }
            }
        }
        .padding(RaccoonSpacing.space4)
        .background(bgSecondary)
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: RaccoonRadius.xl)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var filteredAgents: [Agent] {
        var result = agents
        if let category = selectedCategory {
            result = result.filter { $0.category == category }
        }
        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                ($0.description?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        return result
    }

    private var emptyState: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            Image(systemName: "cpu")
                .font(.system(size: 36))
                .foregroundStyle(textTertiary)
            Text("No agents found")
                .font(RaccoonTypography.textLg)
                .foregroundStyle(textSecondary)
            Text("Try a different search or category")
                .font(RaccoonTypography.bodySmall)
                .foregroundStyle(textTertiary)
        }
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
