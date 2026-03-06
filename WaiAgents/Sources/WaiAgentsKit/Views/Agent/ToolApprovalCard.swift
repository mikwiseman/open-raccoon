import SwiftUI

/// Card showing a tool call that requires user approval.
/// Per spec: exactly three approval options - Allow Once, Allow for Session, Always Allow.
public struct ToolApprovalCard: View {
    public let toolName: String
    public let toolDescription: String
    public let parametersPreview: String
    public let onDecision: (ApprovalScope) -> Void

    @Environment(\.colorScheme) private var colorScheme

    public enum ApprovalScope: String, Sendable {
        case allowOnce = "allow_once"
        case allowForSession = "allow_for_session"
        case alwaysForAgentTool = "always_for_agent_tool"
    }

    public init(
        toolName: String,
        toolDescription: String,
        parametersPreview: String,
        onDecision: @escaping (ApprovalScope) -> Void
    ) {
        self.toolName = toolName
        self.toolDescription = toolDescription
        self.parametersPreview = parametersPreview
        self.onDecision = onDecision
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space4) {
            // Header
            HStack(spacing: WaiAgentsSpacing.space2) {
                Image(systemName: "shield.lefthalf.filled")
                    .font(.system(size: 16))
                    .foregroundStyle(WaiAgentsColors.Semantic.warning)

                Text("Tool Approval Required")
                    .font(WaiAgentsTypography.textLg)
                    .foregroundStyle(textPrimary)
            }

            // Tool info
            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                HStack(spacing: WaiAgentsSpacing.space2) {
                    Text("Tool:")
                        .font(WaiAgentsTypography.bodySmall)
                        .foregroundStyle(textSecondary)
                    Text(toolName)
                        .font(WaiAgentsTypography.agentStatus)
                        .foregroundStyle(textPrimary)
                }

                Text(toolDescription)
                    .font(WaiAgentsTypography.bodySmall)
                    .foregroundStyle(textSecondary)
                    .lineLimit(3)

                if !parametersPreview.isEmpty {
                    Text(parametersPreview)
                        .font(WaiAgentsTypography.codeInline)
                        .foregroundStyle(textSecondary)
                        .padding(WaiAgentsSpacing.space2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(bgTertiary)
                        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.md))
                        .lineLimit(5)
                }
            }

            // Action buttons
            HStack(spacing: WaiAgentsSpacing.space2) {
                approvalButton(
                    title: "Allow Once",
                    scope: .allowOnce,
                    style: .secondary
                )

                approvalButton(
                    title: "Allow for Session",
                    scope: .allowForSession,
                    style: .secondary
                )

                approvalButton(
                    title: "Always Allow",
                    scope: .alwaysForAgentTool,
                    style: .primary
                )
            }
        }
        .padding(WaiAgentsSpacing.space4)
        .background(bgSecondary)
        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: WaiAgentsRadius.xl)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
        .raccoonShadow(WaiAgentsShadows.md)
    }

    private enum ButtonStyle {
        case primary
        case secondary
    }

    @ViewBuilder
    private func approvalButton(title: String, scope: ApprovalScope, style: ButtonStyle) -> some View {
        Button {
            onDecision(scope)
        } label: {
            Text(title)
                .font(WaiAgentsTypography.bodySmall)
                .foregroundStyle(style == .primary ? WaiAgentsColors.Light.textInverse : textPrimary)
                .padding(.horizontal, WaiAgentsSpacing.space3)
                .frame(height: 36)
                .background(
                    style == .primary
                        ? WaiAgentsColors.accentPrimary
                        : bgTertiary
                )
                .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
        }
        .buttonStyle(.plain)
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

    private var borderPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.borderPrimary : WaiAgentsColors.Light.borderPrimary
    }
}
