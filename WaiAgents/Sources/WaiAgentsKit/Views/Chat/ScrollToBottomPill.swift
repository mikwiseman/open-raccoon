import SwiftUI

/// Scroll-to-bottom pill per DESIGN_SYSTEM.md Section 9.5:
/// - Pill shape, radius-full
/// - bg-elevated with shadow
/// - Down arrow icon, text-sm, text-secondary
public struct ScrollToBottomPill: View {
    public let action: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    public init(action: @escaping () -> Void) {
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: WaiAgentsSpacing.space1) {
                Image(systemName: "chevron.down")
                    .font(.system(size: 12, weight: .medium))
                Text("New messages")
                    .font(WaiAgentsTypography.textSm)
            }
            .foregroundStyle(textSecondary)
            .padding(.horizontal, WaiAgentsSpacing.space3)
            .padding(.vertical, WaiAgentsSpacing.space2)
            .background(bgElevated)
            .clipShape(Capsule())
            .raccoonShadow(WaiAgentsShadows.md)
        }
        .buttonStyle(.plain)
    }

    private var bgElevated: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgElevated : WaiAgentsColors.Light.bgElevated
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }
}
