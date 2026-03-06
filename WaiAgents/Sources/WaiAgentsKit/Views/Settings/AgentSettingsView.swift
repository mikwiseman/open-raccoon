import SwiftUI

/// Agent settings: default LLM provider selection,
/// token budget settings, auto-approve trusted tools toggle.
public struct AgentSettingsView: View {
    @State private var selectedProvider = "Anthropic"
    @State private var selectedModel = "Claude Sonnet"
    @State private var monthlyTokenBudget: Double = 100000
    @State private var autoApproveTrustedTools = false
    @State private var defaultTemperature: Double = 0.7

    @Environment(\.colorScheme) private var colorScheme

    private let providers = ["Anthropic", "OpenAI", "Custom (BYOK)"]
    private let anthropicModels = ["Claude Sonnet", "Claude Opus"]
    private let openAIModels = ["GPT-5.2", "GPT-5.2 Chat"]

    public init() {}

    public var body: some View {
        List {
            // LLM Provider
            Section {
                Picker("Provider", selection: $selectedProvider) {
                    ForEach(providers, id: \.self) { provider in
                        Text(provider).tag(provider)
                    }
                }
                .font(WaiAgentsTypography.body)

                Picker("Default Model", selection: $selectedModel) {
                    ForEach(currentModels, id: \.self) { model in
                        Text(model).tag(model)
                    }
                }
                .font(WaiAgentsTypography.body)

                VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                    HStack {
                        Text("Temperature")
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                        Spacer()
                        Text(String(format: "%.1f", defaultTemperature))
                            .font(WaiAgentsTypography.bodySmall)
                            .foregroundStyle(textSecondary)
                    }
                    Slider(value: $defaultTemperature, in: 0...1, step: 0.1)
                        .tint(WaiAgentsColors.accentPrimary)
                }
            } header: {
                Text("Default LLM")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Token Budget
            Section {
                VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                    HStack {
                        Text("Monthly Budget")
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                        Spacer()
                        Text(formatTokens(monthlyTokenBudget))
                            .font(WaiAgentsTypography.bodySmall)
                            .foregroundStyle(textSecondary)
                    }
                    Slider(value: $monthlyTokenBudget, in: 10000...1000000, step: 10000)
                        .tint(WaiAgentsColors.accentPrimary)
                }

                HStack {
                    Text("Warn at 80% usage")
                        .font(WaiAgentsTypography.body)
                        .foregroundStyle(textPrimary)
                    Spacer()
                    Toggle("", isOn: .constant(true))
                        .tint(WaiAgentsColors.accentPrimary)
                        .labelsHidden()
                }
            } header: {
                Text("Token Budget")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }

            // Tool Approvals
            Section {
                HStack {
                    VStack(alignment: .leading, spacing: WaiAgentsSpacing.space1) {
                        Text("Auto-approve Trusted Tools")
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)
                        Text("Automatically approve tools you've previously allowed")
                            .font(WaiAgentsTypography.caption)
                            .foregroundStyle(textTertiary)
                    }
                    Spacer()
                    Toggle("", isOn: $autoApproveTrustedTools)
                        .tint(WaiAgentsColors.accentPrimary)
                        .labelsHidden()
                }
            } header: {
                Text("Tool Approvals")
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(textTertiary)
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        .navigationTitle("Agents")
        .navigationBarTitleDisplayMode(.inline)
        #else
        .listStyle(.sidebar)
        #endif
    }

    private var currentModels: [String] {
        selectedProvider == "OpenAI" ? openAIModels : anthropicModels
    }

    private func formatTokens(_ tokens: Double) -> String {
        if tokens >= 1_000_000 {
            return String(format: "%.1fM tokens", tokens / 1_000_000)
        }
        return String(format: "%.0fK tokens", tokens / 1_000)
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
}
