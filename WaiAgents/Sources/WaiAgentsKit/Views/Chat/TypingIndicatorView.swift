import SwiftUI

/// Three dots typing indicator per DESIGN_SYSTEM.md Section 7.4:
/// - 6px dots, text-tertiary color
/// - Sequential opacity pulse: 0.4 -> 1.0 -> 0.4
/// - 150ms stagger between dots
/// - 1200ms full cycle
/// - Inside received message bubble style, 40px width
public struct TypingIndicatorView: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var animating = false

    public init() {}

    public var body: some View {
        HStack(spacing: 0) {
            // 28px avatar space placeholder for alignment
            Color.clear
                .frame(width: 28, height: 28)

            Spacer().frame(width: WaiAgentsSpacing.space2)

            bubbleContent
                .padding(.vertical, 10)
                .padding(.horizontal, 14)
                .frame(width: 52)
                .background(bubbleBg)
                .overlay {
                    RoundedRectangle(cornerRadius: WaiAgentsRadius.xl)
                        .strokeBorder(bubbleBorder, lineWidth: 1)
                }
                .clipShape(bubbleShape)

            Spacer()
        }
        .padding(.horizontal, WaiAgentsSpacing.space4)
        .onAppear {
            guard !reduceMotion else { return }
            animating = true
        }
    }

    @ViewBuilder
    private var bubbleContent: some View {
        if reduceMotion {
            Text("...")
                .font(WaiAgentsTypography.textMd)
                .foregroundStyle(textTertiary)
        } else {
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(textTertiary)
                        .frame(width: 6, height: 6)
                        .opacity(animating ? 1.0 : 0.4)
                        .animation(
                            .easeInOut(duration: 0.6)
                            .repeatForever(autoreverses: true)
                            .delay(Double(index) * 0.15),
                            value: animating
                        )
                }
            }
        }
    }

    private var bubbleShape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            topLeadingRadius: WaiAgentsRadius.xl,
            bottomLeadingRadius: WaiAgentsRadius.sm,
            bottomTrailingRadius: WaiAgentsRadius.xl,
            topTrailingRadius: WaiAgentsRadius.xl
        )
    }

    private var bubbleBg: Color {
        colorScheme == .dark
            ? WaiAgentsColors.Dark.bgMessageReceived
            : WaiAgentsColors.Light.bgMessageReceived
    }

    private var bubbleBorder: Color {
        colorScheme == .dark
            ? WaiAgentsColors.Dark.borderPrimary
            : WaiAgentsColors.Light.borderSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}
