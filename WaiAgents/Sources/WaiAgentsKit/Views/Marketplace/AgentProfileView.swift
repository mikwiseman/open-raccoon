import SwiftUI

/// Agent detail page with avatar, name, description, creator info,
/// rating display, "Start Conversation" button, tool list, and reviews.
public struct AgentProfileView: View {
    public let agent: Agent
    public let creatorName: String
    public let onStartConversation: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    public init(
        agent: Agent,
        creatorName: String,
        onStartConversation: @escaping () -> Void
    ) {
        self.agent = agent
        self.creatorName = creatorName
        self.onStartConversation = onStartConversation
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space5) {
                // Header
                headerSection

                // Start conversation button
                Button(action: onStartConversation) {
                    Text("Start Conversation")
                        .font(WaiAgentsTypography.textLg)
                        .foregroundStyle(WaiAgentsColors.Light.textInverse)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(WaiAgentsColors.accentPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
                }
                .buttonStyle(.plain)

                // Description
                if let description = agent.description {
                    VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                        Text("About")
                            .font(WaiAgentsTypography.h3)
                            .foregroundStyle(textPrimary)
                        Text(description)
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textSecondary)
                    }
                }

                Divider()
                    .foregroundStyle(borderPrimary)

                // Tools
                if let tools = agent.tools, !tools.isEmpty {
                    toolsSection(tools)
                }

                Divider()
                    .foregroundStyle(borderPrimary)

                // Details
                detailsSection

                Divider()
                    .foregroundStyle(borderPrimary)

                // Reviews placeholder
                reviewsSection
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.vertical, WaiAgentsSpacing.space4)
        }
        .background(bgPrimary)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    private var headerSection: some View {
        HStack(spacing: WaiAgentsSpacing.space4) {
            AvatarView(
                name: agent.name,
                size: 72,
                isAgent: true,
                agentAccentColor: WaiAgentsColors.AgentAccent.default
            )

            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                Text(agent.name)
                    .font(WaiAgentsTypography.h2)
                    .foregroundStyle(textPrimary)

                HStack(spacing: WaiAgentsSpacing.space2) {
                    Text("by \(creatorName)")
                        .font(WaiAgentsTypography.bodySmall)
                        .foregroundStyle(textSecondary)

                    if let category = agent.category {
                        Text(category)
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
                    }
                }

                // Rating
                HStack(spacing: WaiAgentsSpacing.space2) {
                    ratingStars(rating: agent.averageRating)

                    Text(String(format: "%.1f", agent.averageRating))
                        .font(WaiAgentsTypography.bodySmall)
                        .foregroundStyle(textSecondary)

                    Text("(\(agent.ratingCount ?? 0) reviews)")
                        .font(WaiAgentsTypography.caption)
                        .foregroundStyle(textTertiary)
                }
            }
        }
    }

    private func ratingStars(rating: Double) -> some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: starImage(for: star, rating: rating))
                    .font(.system(size: 14))
                    .foregroundStyle(WaiAgentsColors.Semantic.warning)
            }
        }
    }

    private func starImage(for star: Int, rating: Double) -> String {
        if Double(star) <= rating {
            return "star.fill"
        } else if Double(star) - 0.5 <= rating {
            return "star.leadinghalf.filled"
        }
        return "star"
    }

    private func toolsSection(_ tools: [Agent.ToolConfig]) -> some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space3) {
            Text("Tools")
                .font(WaiAgentsTypography.h3)
                .foregroundStyle(textPrimary)

            ForEach(tools, id: \.name) { tool in
                HStack(spacing: WaiAgentsSpacing.space3) {
                    Image(systemName: "wrench.and.screwdriver")
                        .font(.system(size: 14))
                        .foregroundStyle(WaiAgentsColors.accentPrimary)
                        .frame(width: 28, height: 28)
                        .background(
                            colorScheme == .dark
                                ? WaiAgentsColors.accentSubtleDark
                                : WaiAgentsColors.accentSubtleLight
                        )
                        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.md))

                    VStack(alignment: .leading, spacing: 0) {
                        Text(tool.name)
                            .font(WaiAgentsTypography.agentStatus)
                            .foregroundStyle(textPrimary)
                    }

                    Spacer()

                    if tool.enabled {
                        Text("Enabled")
                            .font(WaiAgentsTypography.caption)
                            .foregroundStyle(WaiAgentsColors.Semantic.success)
                    }
                }
                .padding(.vertical, WaiAgentsSpacing.space1)
            }
        }
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space3) {
            Text("Details")
                .font(WaiAgentsTypography.h3)
                .foregroundStyle(textPrimary)

            if let model = agent.model {
                detailRow(label: "Model", value: model)
            }
            if let temperature = agent.temperature {
                detailRow(label: "Temperature", value: String(format: "%.1f", temperature))
            }
            if let maxTokens = agent.maxTokens {
                detailRow(label: "Max Tokens", value: "\(maxTokens)")
            }
            detailRow(label: "Usage", value: "\(agent.usageCount ?? 0) conversations")
            if let visibility = agent.visibility {
                detailRow(label: "Visibility", value: visibility.rawValue.capitalized)
            }
        }
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(WaiAgentsTypography.bodySmall)
                .foregroundStyle(textSecondary)
            Spacer()
            Text(value)
                .font(WaiAgentsTypography.bodySmall)
                .foregroundStyle(textPrimary)
        }
    }

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space3) {
            Text("Reviews")
                .font(WaiAgentsTypography.h3)
                .foregroundStyle(textPrimary)

            Text("No reviews yet")
                .font(WaiAgentsTypography.bodySmall)
                .foregroundStyle(textTertiary)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, WaiAgentsSpacing.space8)
        }
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
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
