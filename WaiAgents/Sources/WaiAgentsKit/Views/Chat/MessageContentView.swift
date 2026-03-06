import SwiftUI

/// Renders the content of a message depending on its type.
public struct MessageContentView: View {
    public let message: Message

    @Environment(\.colorScheme) private var colorScheme

    public init(message: Message) {
        self.message = message
    }

    public var body: some View {
        switch message.type {
        case .text:
            textContent
        case .code:
            codeContent
        case .media:
            mediaContent
        case .embed:
            embedContent
        case .system:
            systemContent
        case .agentStatus:
            agentStatusContent
        }
    }

    @ViewBuilder
    private var textContent: some View {
        if let text = message.content.text {
            Text(text)
                .font(WaiAgentsTypography.textMd)
                .foregroundStyle(textPrimary)
                .textSelection(.enabled)
        }
    }

    @ViewBuilder
    private var codeContent: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
            if let text = message.content.text {
                Text(text)
                    .font(WaiAgentsTypography.textMd)
                    .foregroundStyle(textPrimary)
                    .textSelection(.enabled)
            }
            if let code = message.content.code {
                CodeBlockView(code: code, language: message.content.language)
            }
        }
    }

    @ViewBuilder
    private var mediaContent: some View {
        VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
            if message.content.mediaURL != nil {
                RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                    .fill(bgTertiary)
                    .frame(maxWidth: 300, maxHeight: 200)
                    .overlay {
                        Image(systemName: "photo")
                            .font(.system(size: 32))
                            .foregroundStyle(textTertiary)
                    }
            }
            if let text = message.content.text {
                Text(text)
                    .font(WaiAgentsTypography.textMd)
                    .foregroundStyle(textPrimary)
            }
        }
    }

    @ViewBuilder
    private var embedContent: some View {
        if let embed = message.content.embed {
            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space1) {
                if let title = embed.title {
                    Text(title)
                        .font(WaiAgentsTypography.textBase)
                        .fontWeight(.medium)
                        .foregroundStyle(WaiAgentsColors.accentPrimary)
                }
                if let description = embed.description {
                    Text(description)
                        .font(WaiAgentsTypography.textSm)
                        .foregroundStyle(textSecondary)
                        .lineLimit(3)
                }
            }
            .padding(WaiAgentsSpacing.space3)
            .background(bgTertiary)
            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
        }
    }

    @ViewBuilder
    private var systemContent: some View {
        if let text = message.content.text {
            Text(text)
                .font(WaiAgentsTypography.textSm)
                .foregroundStyle(textTertiary)
                .italic()
        }
    }

    @ViewBuilder
    private var agentStatusContent: some View {
        if let text = message.content.text {
            HStack(spacing: WaiAgentsSpacing.space2) {
                Circle()
                    .fill(WaiAgentsColors.accentPrimary)
                    .frame(width: 6, height: 6)
                Text(text)
                    .font(WaiAgentsTypography.agentStatus)
                    .foregroundStyle(textSecondary)
            }
        }
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

    private var bgTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgTertiary : WaiAgentsColors.Light.bgTertiary
    }
}
