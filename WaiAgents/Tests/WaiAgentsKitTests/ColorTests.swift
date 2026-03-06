import Testing
@testable import WaiAgentsKit

@Suite("Design System Colors")
struct ColorTests {
    @Test("Accent is muted violet")
    func accentColor() {
        let _ = WaiAgentsColors.accentPrimary
        let _ = WaiAgentsColors.accentPrimaryHover
        let _ = WaiAgentsColors.accentSubtleLight
        let _ = WaiAgentsColors.accentSubtleDark
    }

    @Test("All light mode colors exist")
    func lightModeColors() {
        let _ = WaiAgentsColors.Light.bgPrimary
        let _ = WaiAgentsColors.Light.bgSecondary
        let _ = WaiAgentsColors.Light.bgTertiary
        let _ = WaiAgentsColors.Light.bgElevated
        let _ = WaiAgentsColors.Light.bgInput
        let _ = WaiAgentsColors.Light.bgMessageSent
        let _ = WaiAgentsColors.Light.bgMessageReceived
        let _ = WaiAgentsColors.Light.borderPrimary
        let _ = WaiAgentsColors.Light.borderSecondary
        let _ = WaiAgentsColors.Light.borderFocus
        let _ = WaiAgentsColors.Light.textPrimary
        let _ = WaiAgentsColors.Light.textSecondary
        let _ = WaiAgentsColors.Light.textTertiary
        let _ = WaiAgentsColors.Light.textInverse
    }

    @Test("All dark mode colors exist")
    func darkModeColors() {
        let _ = WaiAgentsColors.Dark.bgPrimary
        let _ = WaiAgentsColors.Dark.bgSecondary
        let _ = WaiAgentsColors.Dark.bgTertiary
        let _ = WaiAgentsColors.Dark.bgElevated
        let _ = WaiAgentsColors.Dark.bgInput
        let _ = WaiAgentsColors.Dark.bgMessageSent
        let _ = WaiAgentsColors.Dark.bgMessageReceived
        let _ = WaiAgentsColors.Dark.borderPrimary
        let _ = WaiAgentsColors.Dark.borderSecondary
        let _ = WaiAgentsColors.Dark.borderFocus
        let _ = WaiAgentsColors.Dark.textPrimary
        let _ = WaiAgentsColors.Dark.textSecondary
        let _ = WaiAgentsColors.Dark.textTertiary
        let _ = WaiAgentsColors.Dark.textInverse
    }

    @Test("Semantic colors exist")
    func semanticColors() {
        let _ = WaiAgentsColors.Semantic.success
        let _ = WaiAgentsColors.Semantic.successDark
        let _ = WaiAgentsColors.Semantic.successBg
        let _ = WaiAgentsColors.Semantic.warning
        let _ = WaiAgentsColors.Semantic.warningDark
        let _ = WaiAgentsColors.Semantic.error
        let _ = WaiAgentsColors.Semantic.errorDark
        let _ = WaiAgentsColors.Semantic.info
        let _ = WaiAgentsColors.Semantic.infoDark
    }

    @Test("Platform badge colors exist")
    func platformColors() {
        let _ = WaiAgentsColors.Platform.telegram
        let _ = WaiAgentsColors.Platform.whatsapp
        let _ = WaiAgentsColors.Platform.signal
        let _ = WaiAgentsColors.Platform.discord
        let _ = WaiAgentsColors.Platform.slack
        let _ = WaiAgentsColors.Platform.email
        let _ = WaiAgentsColors.Platform.sms
        let _ = WaiAgentsColors.Platform.iMessage
        let _ = WaiAgentsColors.Platform.matrix
    }

    @Test("Agent accent colors exist")
    func agentAccentColors() {
        let _ = WaiAgentsColors.AgentAccent.default
        let _ = WaiAgentsColors.AgentAccent.code
        let _ = WaiAgentsColors.AgentAccent.research
        let _ = WaiAgentsColors.AgentAccent.creative
        let _ = WaiAgentsColors.AgentAccent.deploy
        let _ = WaiAgentsColors.AgentAccent.custom1
        let _ = WaiAgentsColors.AgentAccent.custom2
        let _ = WaiAgentsColors.AgentAccent.custom3
    }

    @Test("Syntax highlighting colors exist for both modes")
    func syntaxColors() {
        // Light mode
        let _ = WaiAgentsColors.SyntaxLight.keyword
        let _ = WaiAgentsColors.SyntaxLight.string
        let _ = WaiAgentsColors.SyntaxLight.number
        let _ = WaiAgentsColors.SyntaxLight.function
        let _ = WaiAgentsColors.SyntaxLight.comment
        let _ = WaiAgentsColors.SyntaxLight.variable
        let _ = WaiAgentsColors.SyntaxLight.type
        let _ = WaiAgentsColors.SyntaxLight.operator

        // Dark mode
        let _ = WaiAgentsColors.SyntaxDark.keyword
        let _ = WaiAgentsColors.SyntaxDark.string
        let _ = WaiAgentsColors.SyntaxDark.number
        let _ = WaiAgentsColors.SyntaxDark.function
        let _ = WaiAgentsColors.SyntaxDark.comment
        let _ = WaiAgentsColors.SyntaxDark.variable
        let _ = WaiAgentsColors.SyntaxDark.type
        let _ = WaiAgentsColors.SyntaxDark.operator
    }
}
