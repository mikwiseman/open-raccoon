import SwiftUI

/// Displays text that appears token-by-token with a blinking cursor at the end.
/// Used for streaming AI agent responses.
public struct StreamingTextView: View {
    public let text: String
    public var isStreaming: Bool

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var cursorVisible = true

    public init(text: String, isStreaming: Bool = true) {
        self.text = text
        self.isStreaming = isStreaming
    }

    public var body: some View {
        HStack(alignment: .lastTextBaseline, spacing: 0) {
            Text(text)
                .font(RaccoonTypography.body)
                .foregroundStyle(textPrimary)
                .textSelection(.enabled)

            if isStreaming {
                cursor
            }
        }
        .onAppear {
            guard !reduceMotion else { return }
            startCursorBlink()
        }
        .onChange(of: isStreaming) {
            if !isStreaming {
                cursorVisible = false
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isStreaming ? .updatesFrequently : [])
    }

    private var cursor: some View {
        Rectangle()
            .fill(RaccoonColors.accentPrimary)
            .frame(width: 2, height: 16)
            .opacity(cursorVisible ? 1.0 : 0.0)
    }

    private func startCursorBlink() {
        withAnimation(
            .easeInOut(duration: 0.6)
            .repeatForever(autoreverses: true)
        ) {
            cursorVisible.toggle()
        }
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }
}
