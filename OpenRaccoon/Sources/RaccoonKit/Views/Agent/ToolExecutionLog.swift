import SwiftUI

/// Expandable log of tool executions in the current conversation.
/// Shows tool name, status (running/completed/failed), duration.
/// Each entry has a collapsible detail view with input/output.
public struct ToolExecutionLog: View {
    public let executions: [ToolExecution]

    @Environment(\.colorScheme) private var colorScheme

    public struct ToolExecution: Identifiable, Sendable {
        public let id: String
        public let toolName: String
        public let status: Status
        public let duration: TimeInterval?
        public let input: String
        public let output: String

        public enum Status: String, Sendable {
            case running
            case completed
            case failed
        }

        public init(
            id: String,
            toolName: String,
            status: Status,
            duration: TimeInterval? = nil,
            input: String = "",
            output: String = ""
        ) {
            self.id = id
            self.toolName = toolName
            self.status = status
            self.duration = duration
            self.input = input
            self.output = output
        }
    }

    public init(executions: [ToolExecution]) {
        self.executions = executions
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: RaccoonSpacing.space1) {
            HStack(spacing: RaccoonSpacing.space2) {
                Image(systemName: "terminal")
                    .font(.system(size: 12))
                    .foregroundStyle(textSecondary)
                Text("Tool Executions")
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(textSecondary)
                Spacer()
                Text("\(executions.count)")
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(textTertiary)
            }
            .padding(.horizontal, RaccoonSpacing.space3)
            .padding(.vertical, RaccoonSpacing.space2)

            ForEach(executions) { execution in
                ToolExecutionRow(execution: execution)
            }
        }
        .background(bgSecondary)
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: RaccoonRadius.xl)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
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

struct ToolExecutionRow: View {
    let execution: ToolExecutionLog.ToolExecution

    @State private var isExpanded = false
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Summary row
            Button {
                withAnimation(RaccoonMotion.easeDefault) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: RaccoonSpacing.space2) {
                    statusIcon

                    Text(execution.toolName)
                        .font(RaccoonTypography.agentStatus)
                        .foregroundStyle(textPrimary)

                    Spacer()

                    if let duration = execution.duration {
                        Text(formatDuration(duration))
                            .font(RaccoonTypography.caption)
                            .foregroundStyle(textTertiary)
                    }

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10))
                        .foregroundStyle(textTertiary)
                }
                .padding(.horizontal, RaccoonSpacing.space3)
                .padding(.vertical, RaccoonSpacing.space2)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // Expandable detail
            if isExpanded {
                VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
                    if !execution.input.isEmpty {
                        detailSection(title: "Input", content: execution.input)
                    }
                    if !execution.output.isEmpty {
                        detailSection(title: "Output", content: execution.output)
                    }
                }
                .padding(.horizontal, RaccoonSpacing.space3)
                .padding(.bottom, RaccoonSpacing.space3)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch execution.status {
        case .running:
            ProgressView()
                .controlSize(.mini)
                .frame(width: 14, height: 14)
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 14))
                .foregroundStyle(RaccoonColors.Semantic.success)
        case .failed:
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 14))
                .foregroundStyle(RaccoonColors.Semantic.error)
        }
    }

    @ViewBuilder
    private func detailSection(title: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: RaccoonSpacing.space1) {
            Text(title)
                .font(RaccoonTypography.caption)
                .foregroundStyle(textTertiary)
            Text(content)
                .font(RaccoonTypography.codeInline)
                .foregroundStyle(textSecondary)
                .padding(RaccoonSpacing.space2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(bgTertiary)
                .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.md))
                .lineLimit(10)
                .textSelection(.enabled)
        }
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        if seconds < 1 {
            return String(format: "%.0fms", seconds * 1000)
        }
        return String(format: "%.1fs", seconds)
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

    private var bgTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgTertiary : RaccoonColors.Light.bgTertiary
    }
}
