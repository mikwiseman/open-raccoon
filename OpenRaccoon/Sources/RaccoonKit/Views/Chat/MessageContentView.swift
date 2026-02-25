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
                .font(RaccoonTypography.textMd)
                .foregroundStyle(textPrimary)
                .textSelection(.enabled)
        }
    }

    @ViewBuilder
    private var codeContent: some View {
        VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
            if let text = message.content.text {
                Text(text)
                    .font(RaccoonTypography.textMd)
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
        VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
            if message.content.mediaURL != nil {
                RoundedRectangle(cornerRadius: RaccoonRadius.lg)
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
                    .font(RaccoonTypography.textMd)
                    .foregroundStyle(textPrimary)
            }
        }
    }

    @ViewBuilder
    private var embedContent: some View {
        if let embed = message.content.embed {
            VStack(alignment: .leading, spacing: RaccoonSpacing.space1) {
                if let title = embed.title {
                    Text(title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(RaccoonColors.accentPrimary)
                }
                if let description = embed.description {
                    Text(description)
                        .font(RaccoonTypography.textSm)
                        .foregroundStyle(textSecondary)
                        .lineLimit(3)
                }
            }
            .padding(RaccoonSpacing.space3)
            .background(bgTertiary)
            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
        }
    }

    @ViewBuilder
    private var systemContent: some View {
        if let text = message.content.text {
            Text(text)
                .font(RaccoonTypography.textSm)
                .foregroundStyle(textTertiary)
                .italic()
        }
    }

    @ViewBuilder
    private var agentStatusContent: some View {
        if let text = message.content.text {
            HStack(spacing: RaccoonSpacing.space2) {
                Circle()
                    .fill(RaccoonColors.accentPrimary)
                    .frame(width: 6, height: 6)
                Text(text)
                    .font(RaccoonTypography.agentStatus)
                    .foregroundStyle(textSecondary)
            }
        }
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
