import SwiftUI

/// Code block display: bg-secondary background, 12px padding, 8px border-radius,
/// left border 2px accent-primary, copy button top-right.
public struct CodeBlockView: View {
    public let code: String
    public let language: String?

    @Environment(\.colorScheme) private var colorScheme
    @State private var copied = false

    public init(code: String, language: String? = nil) {
        self.code = code
        self.language = language
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with language label and copy button
            if language != nil {
                HStack {
                    if let language {
                        Text(language)
                            .font(RaccoonTypography.textXs)
                            .foregroundStyle(textTertiary)
                    }
                    Spacer()
                    Button {
                        copyToClipboard()
                    } label: {
                        HStack(spacing: RaccoonSpacing.space1) {
                            Image(systemName: copied ? "checkmark" : "doc.on.doc")
                                .font(.system(size: 11))
                            Text(copied ? "Copied" : "Copy")
                                .font(RaccoonTypography.textXs)
                        }
                        .foregroundStyle(textTertiary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, RaccoonSpacing.space3)
                .padding(.top, RaccoonSpacing.space2)
                .padding(.bottom, RaccoonSpacing.space1)
            }

            // Code content
            ScrollView(.horizontal, showsIndicators: false) {
                Text(code)
                    .font(RaccoonTypography.codeBlock)
                    .foregroundStyle(textPrimary)
                    .textSelection(.enabled)
            }
            .padding(.horizontal, RaccoonSpacing.space3)
            .padding(.bottom, RaccoonSpacing.space3)
        }
        .background(bgSecondary)
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(RaccoonColors.accentPrimary)
                .frame(width: 2)
        }
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
    }

    private func copyToClipboard() {
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(code, forType: .string)
        #else
        UIPasteboard.general.string = code
        #endif
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copied = false
        }
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }
}
