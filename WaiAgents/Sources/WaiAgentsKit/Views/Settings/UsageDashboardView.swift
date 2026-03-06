import SwiftUI

/// Usage dashboard with token usage charts (placeholder),
/// cost breakdown by agent, usage limits, current billing period info.
public struct UsageDashboardView: View {
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(spacing: WaiAgentsSpacing.space5) {
                // Current period overview
                currentPeriodCard

                // Usage chart placeholder
                usageChartPlaceholder

                // Cost breakdown by agent
                costBreakdownSection

                // Usage limits
                usageLimitsSection
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.vertical, WaiAgentsSpacing.space4)
        }
        .background(bgPrimary)
        #if os(iOS)
        .navigationTitle("Usage & Billing")
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    private var currentPeriodCard: some View {
        VStack(spacing: WaiAgentsSpacing.space4) {
            HStack {
                VStack(alignment: .leading, spacing: WaiAgentsSpacing.space1) {
                    Text("Current Period")
                        .font(WaiAgentsTypography.bodySmall)
                        .foregroundStyle(textSecondary)
                    Text("Feb 1 - Feb 28, 2026")
                        .font(WaiAgentsTypography.agentStatus)
                        .foregroundStyle(textPrimary)
                }
                Spacer()
            }

            HStack(spacing: WaiAgentsSpacing.space6) {
                usageStat(value: "0", label: "Tokens Used", icon: "text.bubble")
                usageStat(value: "$0.00", label: "Cost", icon: "dollarsign.circle")
                usageStat(value: "0", label: "Conversations", icon: "bubble.left.and.bubble.right")
            }
        }
        .padding(WaiAgentsSpacing.space4)
        .background(bgSecondary)
        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: WaiAgentsRadius.xl)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private func usageStat(value: String, label: String, icon: String) -> some View {
        VStack(spacing: WaiAgentsSpacing.space2) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(WaiAgentsColors.accentPrimary)
            Text(value)
                .font(WaiAgentsTypography.text2xl)
                .foregroundStyle(textPrimary)
            Text(label)
                .font(WaiAgentsTypography.caption)
                .foregroundStyle(textTertiary)
        }
        .frame(maxWidth: .infinity)
    }

    private var usageChartPlaceholder: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space3) {
            Text("Token Usage")
                .font(WaiAgentsTypography.h3)
                .foregroundStyle(textPrimary)

            // Chart placeholder
            RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                .fill(bgSecondary)
                .frame(height: 200)
                .overlay {
                    VStack(spacing: WaiAgentsSpacing.space2) {
                        Image(systemName: "chart.bar")
                            .font(.system(size: 28))
                            .foregroundStyle(textTertiary)
                        Text("Usage chart will appear here")
                            .font(WaiAgentsTypography.bodySmall)
                            .foregroundStyle(textTertiary)
                    }
                }
                .overlay {
                    RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                        .strokeBorder(borderPrimary, lineWidth: 1)
                }
        }
    }

    private var costBreakdownSection: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space3) {
            Text("Cost by Agent")
                .font(WaiAgentsTypography.h3)
                .foregroundStyle(textPrimary)

            VStack(spacing: 0) {
                costRow(agentName: "Code Agent", tokens: "0", cost: "$0.00")
                Divider().foregroundStyle(borderPrimary)
                costRow(agentName: "Research Agent", tokens: "0", cost: "$0.00")
                Divider().foregroundStyle(borderPrimary)
                costRow(agentName: "Creative Agent", tokens: "0", cost: "$0.00")
            }
            .background(bgSecondary)
            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
            .overlay {
                RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                    .strokeBorder(borderPrimary, lineWidth: 1)
            }
        }
    }

    private func costRow(agentName: String, tokens: String, cost: String) -> some View {
        HStack(spacing: WaiAgentsSpacing.space3) {
            AvatarView(name: agentName, size: 28, isAgent: true)

            Text(agentName)
                .font(WaiAgentsTypography.bodySmall)
                .foregroundStyle(textPrimary)

            Spacer()

            VStack(alignment: .trailing, spacing: 0) {
                Text(cost)
                    .font(WaiAgentsTypography.agentStatus)
                    .foregroundStyle(textPrimary)
                Text("\(tokens) tokens")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }
        }
        .padding(.horizontal, WaiAgentsSpacing.space3)
        .padding(.vertical, WaiAgentsSpacing.space3)
    }

    private var usageLimitsSection: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space3) {
            Text("Usage Limits")
                .font(WaiAgentsTypography.h3)
                .foregroundStyle(textPrimary)

            VStack(spacing: WaiAgentsSpacing.space3) {
                limitRow(label: "Monthly Token Budget", current: 0, max: 100000)
                limitRow(label: "Daily Agent Calls", current: 0, max: 500)
            }
            .padding(WaiAgentsSpacing.space4)
            .background(bgSecondary)
            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
            .overlay {
                RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                    .strokeBorder(borderPrimary, lineWidth: 1)
            }
        }
    }

    private func limitRow(label: String, current: Int, max: Int) -> some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
            HStack {
                Text(label)
                    .font(WaiAgentsTypography.bodySmall)
                    .foregroundStyle(textSecondary)
                Spacer()
                Text("\(current) / \(formatNumber(max))")
                    .font(WaiAgentsTypography.bodySmall)
                    .foregroundStyle(textPrimary)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(bgTertiary)
                        .frame(height: 4)

                    RoundedRectangle(cornerRadius: 2)
                        .fill(WaiAgentsColors.accentPrimary)
                        .frame(
                            width: max > 0 ? geometry.size.width * CGFloat(current) / CGFloat(max) : 0,
                            height: 4
                        )
                }
            }
            .frame(height: 4)
        }
    }

    private func formatNumber(_ n: Int) -> String {
        if n >= 1_000_000 {
            return String(format: "%.1fM", Double(n) / 1_000_000)
        } else if n >= 1_000 {
            return String(format: "%.0fK", Double(n) / 1_000)
        }
        return "\(n)"
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
