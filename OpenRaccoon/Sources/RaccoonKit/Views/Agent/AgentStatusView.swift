import SwiftUI

/// Displays agent status with a pulsing dot and rotating status messages.
/// Per DESIGN_SYSTEM.md: 13px medium weight, text-tertiary color,
/// subtle pulsing animation (opacity 0.5 -> 1.0, 1.5s ease).
public struct AgentStatusView: View {
    public let statusText: String
    public var isActive: Bool

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulseOpacity: Double = 0.5

    public init(statusText: String, isActive: Bool = true) {
        self.statusText = statusText
        self.isActive = isActive
    }

    public var body: some View {
        HStack(spacing: RaccoonSpacing.space2) {
            Circle()
                .fill(RaccoonColors.accentPrimary)
                .frame(width: 8, height: 8)
                .opacity(isActive ? pulseOpacity : 0.3)

            Text(statusText)
                .font(RaccoonTypography.agentStatus)
                .foregroundStyle(textTertiary)
                .transition(.opacity)
                .animation(RaccoonMotion.agentStatusCrossfade, value: statusText)
        }
        .onAppear {
            guard isActive, !reduceMotion else { return }
            withAnimation(
                .easeInOut(duration: 1.5)
                .repeatForever(autoreverses: true)
            ) {
                pulseOpacity = 1.0
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Agent status: \(statusText)")
        .accessibilityAddTraits(.updatesFrequently)
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }
}
