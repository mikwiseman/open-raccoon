import SwiftUI

public enum RaccoonColors {
    // MARK: - Light Mode
    public enum Light {
        public static let bgPrimary = Color(hex: 0xFFFFFF)
        public static let bgSecondary = Color(hex: 0xFAFAFA)
        public static let bgTertiary = Color(hex: 0xF5F5F5)
        public static let bgElevated = Color(hex: 0xFFFFFF)
        public static let bgInput = Color(hex: 0xF5F5F5)
        public static let bgMessageSent = Color(hex: 0xF0F0F0)
        public static let bgMessageReceived = Color(hex: 0xFFFFFF)
        public static let borderPrimary = Color(hex: 0xE5E5E5)
        public static let borderSecondary = Color(hex: 0xEBEBEB)
        public static let borderFocus = Color(hex: 0x171717)
        public static let textPrimary = Color(hex: 0x171717)
        public static let textSecondary = Color(hex: 0x737373)
        public static let textTertiary = Color(hex: 0xA3A3A3)
        public static let textInverse = Color(hex: 0xFFFFFF)
    }

    // MARK: - Dark Mode
    public enum Dark {
        public static let bgPrimary = Color(hex: 0x161616)
        public static let bgSecondary = Color(hex: 0x1C1C1C)
        public static let bgTertiary = Color(hex: 0x232323)
        public static let bgElevated = Color(hex: 0x1C1C1C)
        public static let bgInput = Color(hex: 0x232323)
        public static let bgMessageSent = Color(hex: 0x2A2A2A)
        public static let bgMessageReceived = Color(hex: 0x1C1C1C)
        public static let borderPrimary = Color(hex: 0x2A2A2A)
        public static let borderSecondary = Color(hex: 0x333333)
        public static let borderFocus = Color(hex: 0xE5E5E5)
        public static let textPrimary = Color(hex: 0xEDEDED)
        public static let textSecondary = Color(hex: 0x8C8C8C)
        public static let textTertiary = Color(hex: 0x5C5C5C)
        public static let textInverse = Color(hex: 0x171717)
    }

    // MARK: - Accent
    public static let accentPrimary = Color(hex: 0x6E56CF)
    public static let accentPrimaryHover = Color(hex: 0x5B44B2)
    public static let accentSubtleLight = Color(hex: 0xF3F0FF)
    public static let accentSubtleDark = Color(hex: 0x251F3A)

    // MARK: - Semantic
    public enum Semantic {
        public static let success = Color(hex: 0x2D7D46)
        public static let successDark = Color(hex: 0x3DB95E)
        public static let successBg = Color(hex: 0xEDFBF0)
        public static let successBgDark = Color(hex: 0x1A2E1F)
        public static let warning = Color(hex: 0xC17A1A)
        public static let warningDark = Color(hex: 0xE5A236)
        public static let warningBg = Color(hex: 0xFFF8EB)
        public static let warningBgDark = Color(hex: 0x2E2515)
        public static let error = Color(hex: 0xCD3131)
        public static let errorDark = Color(hex: 0xF14C4C)
        public static let errorBg = Color(hex: 0xFDECEC)
        public static let errorBgDark = Color(hex: 0x2E1717)
        public static let info = Color(hex: 0x3B82F6)
        public static let infoDark = Color(hex: 0x60A5FA)
        public static let infoBg = Color(hex: 0xEFF6FF)
        public static let infoBgDark = Color(hex: 0x172035)
    }

    // MARK: - Agent Accent
    public enum AgentAccent {
        public static let `default` = Color(hex: 0x6E56CF)
        public static let code = Color(hex: 0x3B82F6)
        public static let research = Color(hex: 0x0EA5E9)
        public static let creative = Color(hex: 0xD946EF)
        public static let deploy = Color(hex: 0x22C55E)
        public static let custom1 = Color(hex: 0xF59E0B)
        public static let custom2 = Color(hex: 0xEC4899)
        public static let custom3 = Color(hex: 0x14B8A6)
    }

    // MARK: - Platform Badge
    public enum Platform {
        public static let telegram = Color(hex: 0x2AABEE)
        public static let whatsapp = Color(hex: 0x25D366)
        public static let signal = Color(hex: 0x3A76F0)
        public static let discord = Color(hex: 0x5865F2)
        public static let slack = Color(hex: 0x4A154B)
        public static let email = Color(hex: 0x737373)
        public static let sms = Color(hex: 0x8C8C8C)
        public static let iMessage = Color(hex: 0x34C759)
        public static let matrix = Color(hex: 0x0DBD8B)
    }

    // MARK: - Syntax Highlighting Light
    public enum SyntaxLight {
        public static let keyword = Color(hex: 0x6E56CF)
        public static let string = Color(hex: 0x2D7D46)
        public static let number = Color(hex: 0xC17A1A)
        public static let function = Color(hex: 0x3B82F6)
        public static let comment = Color(hex: 0xA3A3A3)
        public static let variable = Color(hex: 0x171717)
        public static let type = Color(hex: 0x0EA5E9)
        public static let `operator` = Color(hex: 0x737373)
    }

    // MARK: - Syntax Highlighting Dark
    public enum SyntaxDark {
        public static let keyword = Color(hex: 0xB4A0E5)
        public static let string = Color(hex: 0x3DB95E)
        public static let number = Color(hex: 0xE5A236)
        public static let function = Color(hex: 0x60A5FA)
        public static let comment = Color(hex: 0x5C5C5C)
        public static let variable = Color(hex: 0xEDEDED)
        public static let type = Color(hex: 0x38BDF8)
        public static let `operator` = Color(hex: 0x8C8C8C)
    }
}

// MARK: - Color Hex Initializer
extension Color {
    init(hex: UInt, opacity: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: opacity
        )
    }
}
