import SwiftUI

public enum RaccoonTypography {
    // MARK: - Text Sizes
    public static let text2xs = Font.system(size: 10, weight: .regular)
    public static let textXs = Font.system(size: 11, weight: .regular)
    public static let textSm = Font.system(size: 12, weight: .regular)
    public static let textBase = Font.system(size: 14, weight: .regular)
    public static let textMd = Font.system(size: 15, weight: .regular)
    public static let textLg = Font.system(size: 16, weight: .medium)
    public static let textXl = Font.system(size: 18, weight: .semibold)
    public static let text2xl = Font.system(size: 20, weight: .semibold)
    public static let text3xl = Font.system(size: 24, weight: .semibold)
    public static let text4xl = Font.system(size: 30, weight: .bold)

    // MARK: - Heading Fonts (SF Pro Display equivalents)
    public static let h1 = Font.system(size: 28, weight: .semibold)
    public static let h2 = Font.system(size: 22, weight: .semibold)
    public static let h3 = Font.system(size: 18, weight: .medium)

    // MARK: - Body Fonts (SF Pro Text equivalents)
    public static let body = Font.system(size: 15, weight: .regular)
    public static let bodySmall = Font.system(size: 13, weight: .regular)
    public static let caption = Font.system(size: 11, weight: .regular)
    public static let agentStatus = Font.system(size: 13, weight: .medium)

    // MARK: - Code Fonts (SF Mono equivalents)
    public static let codeInline = Font.system(size: 13, weight: .regular, design: .monospaced)
    public static let codeBlock = Font.system(size: 13, weight: .regular, design: .monospaced)
    public static let codeBlockLg = Font.system(size: 14, weight: .regular, design: .monospaced)

    // MARK: - Line Height Multipliers
    public enum LineHeight {
        public static let h1: CGFloat = 1.2
        public static let h2: CGFloat = 1.25
        public static let h3: CGFloat = 1.3
        public static let body: CGFloat = 1.5
        public static let bodySmall: CGFloat = 1.4
        public static let caption: CGFloat = 1.4
        public static let code: CGFloat = 1.5
        public static let agentStatus: CGFloat = 1.4
    }
}
