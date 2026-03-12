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
    public var onStop: (() -> Void)?
    public var isAgentGenerating: Bool

    @State private var text = ""
    @FocusState private var isFocused: Bool
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(
        onSend: @escaping (String) -> Void,
        onTyping: (() -> Void)? = nil,
        onStop: (() -> Void)? = nil,
        isAgentGenerating: Bool = false
    ) {
        self.onSend = onSend
        self.onTyping = onTyping
        self.onStop = onStop
        self.isAgentGenerating = isAgentGenerating
    }

    public var body: some View {
        HStack(alignment: .bottom, spacing: WaiAgentsSpacing.space2) {
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
        .padding(.horizontal, WaiAgentsSpacing.space2)
        .padding(.vertical, WaiAgentsSpacing.space2)
        .frame(minHeight: 48)
        .background(bgPrimary)
    }

    private var inputField: some View {
        TextField("Message...", text: $text, axis: .vertical)
            .textFieldStyle(.plain)
            .font(WaiAgentsTypography.textBase)
            .foregroundStyle(textPrimary)
            .lineLimit(1...8)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .background(bgInput)
            .clipShape(RoundedRectangle(cornerRadius: isMultiLine ? WaiAgentsRadius.xl : WaiAgentsRadius.lg))
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
                .background(WaiAgentsColors.accentPrimary)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .transition(.scale.combined(with: .opacity))
    }

    private var stopButton: some View {
        Button {
            onStop?()
        } label: {
            Image(systemName: "stop.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(textInverse)
                .frame(width: 32, height: 32)
                .background(WaiAgentsColors.Semantic.error)
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
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var bgInput: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgInput : WaiAgentsColors.Light.bgInput
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textInverse: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textInverse : WaiAgentsColors.Light.textInverse
    }
}
