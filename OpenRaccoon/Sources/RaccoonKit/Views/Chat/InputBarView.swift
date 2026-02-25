import SwiftUI

/// Input bar per DESIGN_SYSTEM.md Section 5.3:
/// - 48px min height, grows to 160px
/// - bg-input field with radius-lg
/// - Attachment [+] button left
/// - Text field with "Message..." placeholder
/// - Send button (accent circle, white arrow) appears when has content
/// - Stop button (error circle, white square) when agent generating
public struct InputBarView: View {
    public let onSend: (String) -> Void
    public var onTyping: (() -> Void)?
    public var isAgentGenerating: Bool

    @State private var text = ""
    @FocusState private var isFocused: Bool
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(
        onSend: @escaping (String) -> Void,
        onTyping: (() -> Void)? = nil,
        isAgentGenerating: Bool = false
    ) {
        self.onSend = onSend
        self.onTyping = onTyping
        self.isAgentGenerating = isAgentGenerating
    }

    public var body: some View {
        HStack(alignment: .bottom, spacing: RaccoonSpacing.space2) {
            // Attachment button
            Button {
                // Attachment action placeholder
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(textSecondary)
                    .frame(width: 32, height: 32)
            }
            .buttonStyle(.plain)

            // Text field
            inputField

            // Send / Stop button
            if isAgentGenerating {
                stopButton
            } else if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                sendButton
            }
        }
        .padding(.horizontal, RaccoonSpacing.space2)
        .padding(.vertical, RaccoonSpacing.space2)
        .frame(minHeight: 48)
        .background(bgPrimary)
    }

    private var inputField: some View {
        TextField("Message...", text: $text, axis: .vertical)
            .textFieldStyle(.plain)
            .font(RaccoonTypography.textBase)
            .foregroundStyle(textPrimary)
            .lineLimit(1...8)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .background(bgInput)
            .clipShape(RoundedRectangle(cornerRadius: isMultiLine ? RaccoonRadius.xl : RaccoonRadius.lg))
            .focused($isFocused)
            .onChange(of: text) {
                onTyping?()
            }
            .onSubmit {
                #if os(macOS)
                performSend()
                #endif
            }
    }

    private var sendButton: some View {
        Button {
            performSend()
        } label: {
            Image(systemName: "arrow.up")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(textInverse)
                .frame(width: 32, height: 32)
                .background(RaccoonColors.accentPrimary)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .transition(.scale.combined(with: .opacity))
    }

    private var stopButton: some View {
        Button {
            // Stop generation placeholder
        } label: {
            Image(systemName: "stop.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(textInverse)
                .frame(width: 32, height: 32)
                .background(RaccoonColors.Semantic.error)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    private func performSend() {
        let content = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }
        onSend(content)
        text = ""
    }

    private var isMultiLine: Bool {
        text.contains("\n") || text.count > 80
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var bgInput: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgInput : RaccoonColors.Light.bgInput
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textInverse: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textInverse : RaccoonColors.Light.textInverse
    }
}
