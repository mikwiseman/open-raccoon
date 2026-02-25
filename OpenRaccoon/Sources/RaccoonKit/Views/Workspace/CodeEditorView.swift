import SwiftUI

/// Read-only code display with syntax highlighting (monospace font),
/// line numbers, and a copy button.
public struct CodeEditorView: View {
    public let code: String
    public let language: String
    public let fileName: String?

    @Environment(\.colorScheme) private var colorScheme
    @State private var copied = false

    public init(code: String, language: String = "", fileName: String? = nil) {
        self.code = code
        self.language = language
        self.fileName = fileName
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header bar
            HStack(spacing: RaccoonSpacing.space2) {
                if let fileName {
                    Image(systemName: iconForFile(fileName))
                        .font(.system(size: 12))
                        .foregroundStyle(textSecondary)
                    Text(fileName)
                        .font(RaccoonTypography.bodySmall)
                        .foregroundStyle(textSecondary)
                }
                if !language.isEmpty {
                    Text(language)
                        .font(RaccoonTypography.caption)
                        .foregroundStyle(textTertiary)
                        .padding(.horizontal, RaccoonSpacing.space2)
                        .padding(.vertical, 2)
                        .background(bgTertiary)
                        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.sm))
                }

                Spacer()

                Button {
                    copyToClipboard()
                } label: {
                    HStack(spacing: RaccoonSpacing.space1) {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 12))
                        if copied {
                            Text("Copied")
                                .font(RaccoonTypography.caption)
                        }
                    }
                    .foregroundStyle(copied ? RaccoonColors.Semantic.success : textSecondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, RaccoonSpacing.space3)
            .padding(.vertical, RaccoonSpacing.space2)
            .background(bgSecondary)

            Divider()
                .foregroundStyle(borderPrimary)

            // Code area with line numbers
            ScrollView([.horizontal, .vertical]) {
                HStack(alignment: .top, spacing: 0) {
                    // Line numbers
                    VStack(alignment: .trailing, spacing: 0) {
                        ForEach(Array(lines.enumerated()), id: \.offset) { index, _ in
                            Text("\(index + 1)")
                                .font(RaccoonTypography.codeBlock)
                                .foregroundStyle(textTertiary)
                                .frame(minWidth: 32, alignment: .trailing)
                                .padding(.trailing, RaccoonSpacing.space2)
                        }
                    }
                    .padding(.vertical, RaccoonSpacing.space2)

                    Divider()
                        .foregroundStyle(borderPrimary)

                    // Code content
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                            Text(line.isEmpty ? " " : line)
                                .font(RaccoonTypography.codeBlock)
                                .foregroundStyle(textPrimary)
                                .textSelection(.enabled)
                        }
                    }
                    .padding(.horizontal, RaccoonSpacing.space3)
                    .padding(.vertical, RaccoonSpacing.space2)
                }
            }
            .background(bgPrimary)
        }
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: RaccoonRadius.lg)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var lines: [String] {
        code.components(separatedBy: "\n")
    }

    private func copyToClipboard() {
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(code, forType: .string)
        #else
        UIPasteboard.general.string = code
        #endif

        withAnimation(RaccoonMotion.easeDefault) {
            copied = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation(RaccoonMotion.easeDefault) {
                copied = false
            }
        }
    }

    private func iconForFile(_ name: String) -> String {
        let ext = (name as NSString).pathExtension.lowercased()
        switch ext {
        case "swift": return "swift"
        case "js", "jsx", "ts", "tsx": return "doc.text"
        case "html", "htm": return "globe"
        case "css": return "paintpalette"
        case "json": return "curlybraces"
        case "py": return "doc.text"
        default: return "doc"
        }
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
