import Testing
@testable import RaccoonKit

@Suite("Design System Colors")
struct ColorTests {
    @Test("Accent is muted violet")
    func accentColor() {
        let _ = RaccoonColors.accentPrimary
        let _ = RaccoonColors.accentPrimaryHover
        let _ = RaccoonColors.accentSubtleLight
        let _ = RaccoonColors.accentSubtleDark
    }

    @Test("All light mode colors exist")
    func lightModeColors() {
        let _ = RaccoonColors.Light.bgPrimary
        let _ = RaccoonColors.Light.bgSecondary
        let _ = RaccoonColors.Light.bgTertiary
        let _ = RaccoonColors.Light.bgElevated
        let _ = RaccoonColors.Light.bgInput
        let _ = RaccoonColors.Light.bgMessageSent
        let _ = RaccoonColors.Light.bgMessageReceived
        let _ = RaccoonColors.Light.borderPrimary
        let _ = RaccoonColors.Light.borderSecondary
        let _ = RaccoonColors.Light.borderFocus
        let _ = RaccoonColors.Light.textPrimary
        let _ = RaccoonColors.Light.textSecondary
        let _ = RaccoonColors.Light.textTertiary
        let _ = RaccoonColors.Light.textInverse
    }

    @Test("All dark mode colors exist")
    func darkModeColors() {
        let _ = RaccoonColors.Dark.bgPrimary
        let _ = RaccoonColors.Dark.bgSecondary
        let _ = RaccoonColors.Dark.bgTertiary
        let _ = RaccoonColors.Dark.bgElevated
        let _ = RaccoonColors.Dark.bgInput
        let _ = RaccoonColors.Dark.bgMessageSent
        let _ = RaccoonColors.Dark.bgMessageReceived
        let _ = RaccoonColors.Dark.borderPrimary
        let _ = RaccoonColors.Dark.borderSecondary
        let _ = RaccoonColors.Dark.borderFocus
        let _ = RaccoonColors.Dark.textPrimary
        let _ = RaccoonColors.Dark.textSecondary
        let _ = RaccoonColors.Dark.textTertiary
        let _ = RaccoonColors.Dark.textInverse
    }

    @Test("Semantic colors exist")
    func semanticColors() {
        let _ = RaccoonColors.Semantic.success
        let _ = RaccoonColors.Semantic.successDark
        let _ = RaccoonColors.Semantic.successBg
        let _ = RaccoonColors.Semantic.warning
        let _ = RaccoonColors.Semantic.warningDark
        let _ = RaccoonColors.Semantic.error
        let _ = RaccoonColors.Semantic.errorDark
        let _ = RaccoonColors.Semantic.info
        let _ = RaccoonColors.Semantic.infoDark
    }

    @Test("Platform badge colors exist")
    func platformColors() {
        let _ = RaccoonColors.Platform.telegram
        let _ = RaccoonColors.Platform.whatsapp
        let _ = RaccoonColors.Platform.signal
        let _ = RaccoonColors.Platform.discord
        let _ = RaccoonColors.Platform.slack
        let _ = RaccoonColors.Platform.email
        let _ = RaccoonColors.Platform.sms
        let _ = RaccoonColors.Platform.iMessage
        let _ = RaccoonColors.Platform.matrix
    }

    @Test("Agent accent colors exist")
    func agentAccentColors() {
        let _ = RaccoonColors.AgentAccent.default
        let _ = RaccoonColors.AgentAccent.code
        let _ = RaccoonColors.AgentAccent.research
        let _ = RaccoonColors.AgentAccent.creative
        let _ = RaccoonColors.AgentAccent.deploy
        let _ = RaccoonColors.AgentAccent.custom1
        let _ = RaccoonColors.AgentAccent.custom2
        let _ = RaccoonColors.AgentAccent.custom3
    }

    @Test("Syntax highlighting colors exist for both modes")
    func syntaxColors() {
        // Light mode
        let _ = RaccoonColors.SyntaxLight.keyword
        let _ = RaccoonColors.SyntaxLight.string
        let _ = RaccoonColors.SyntaxLight.number
        let _ = RaccoonColors.SyntaxLight.function
        let _ = RaccoonColors.SyntaxLight.comment
        let _ = RaccoonColors.SyntaxLight.variable
        let _ = RaccoonColors.SyntaxLight.type
        let _ = RaccoonColors.SyntaxLight.operator

        // Dark mode
        let _ = RaccoonColors.SyntaxDark.keyword
        let _ = RaccoonColors.SyntaxDark.string
        let _ = RaccoonColors.SyntaxDark.number
        let _ = RaccoonColors.SyntaxDark.function
        let _ = RaccoonColors.SyntaxDark.comment
        let _ = RaccoonColors.SyntaxDark.variable
        let _ = RaccoonColors.SyntaxDark.type
        let _ = RaccoonColors.SyntaxDark.operator
    }
}
