import SwiftUI

public struct SearchBarView: View {
    @Binding public var text: String
    public let placeholder: String

    @Environment(\.colorScheme) private var colorScheme

    public init(text: Binding<String> = .constant(""), placeholder: String = "Search...") {
        self._text = text
        self.placeholder = placeholder
    }

    public var body: some View {
        HStack(spacing: WaiAgentsSpacing.space2) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 13))
                .foregroundStyle(textTertiary)

            TextField(placeholder, text: $text)
                .textFieldStyle(.plain)
                .font(WaiAgentsTypography.textBase)
                .foregroundStyle(textPrimary)

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(textTertiary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, WaiAgentsSpacing.space3)
        .frame(height: 36)
        .background(bgInput)
        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
    }

    private var bgInput: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgInput : WaiAgentsColors.Light.bgInput
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}
