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
        VStack(alignment: .leading, spacing: RaccoonSpacing.space4) {
            // Header
            HStack(spacing: RaccoonSpacing.space2) {
                Image(systemName: "shield.lefthalf.filled")
                    .font(.system(size: 16))
                    .foregroundStyle(RaccoonColors.Semantic.warning)

                Text("Tool Approval Required")
                    .font(RaccoonTypography.textLg)
                    .foregroundStyle(textPrimary)
            }

            // Tool info
            VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
                HStack(spacing: RaccoonSpacing.space2) {
                    Text("Tool:")
                        .font(RaccoonTypography.bodySmall)
                        .foregroundStyle(textSecondary)
                    Text(toolName)
                        .font(RaccoonTypography.agentStatus)
                        .foregroundStyle(textPrimary)
                }

                Text(toolDescription)
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(textSecondary)
                    .lineLimit(3)

                if !parametersPreview.isEmpty {
                    Text(parametersPreview)
                        .font(RaccoonTypography.codeInline)
                        .foregroundStyle(textSecondary)
                        .padding(RaccoonSpacing.space2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(bgTertiary)
                        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.md))
                        .lineLimit(5)
                }
            }

            // Action buttons
            HStack(spacing: RaccoonSpacing.space2) {
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
        .padding(RaccoonSpacing.space4)
        .background(bgSecondary)
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: RaccoonRadius.xl)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
        .raccoonShadow(RaccoonShadows.md)
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
                .font(RaccoonTypography.bodySmall)
                .foregroundStyle(style == .primary ? RaccoonColors.Light.textInverse : textPrimary)
                .padding(.horizontal, RaccoonSpacing.space3)
                .frame(height: 36)
                .background(
                    style == .primary
                        ? RaccoonColors.accentPrimary
                        : bgTertiary
                )
                .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
        }
        .buttonStyle(.plain)
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

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
