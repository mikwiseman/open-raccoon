import SwiftUI

/// Terminal-style output view with monospace font, dark background,
/// green/white text, and auto-scroll to bottom.
public struct TerminalView: View {
    public let lines: [TerminalLine]

    @Environment(\.colorScheme) private var colorScheme
    @State private var scrollProxy: ScrollViewProxy?

    public struct TerminalLine: Identifiable, Sendable {
        public let id: String
        public let text: String
        public let type: LineType

        public enum LineType: Sendable {
            case stdout
            case stderr
            case system
        }

        public init(id: String = UUID().uuidString, text: String, type: LineType = .stdout) {
            self.id = id
            self.text = text
            self.type = type
        }
    }

    public init(lines: [TerminalLine]) {
        self.lines = lines
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: RaccoonSpacing.space2) {
                // Window dots
                HStack(spacing: 6) {
                    Circle().fill(Color(hex: 0xFF5F57)).frame(width: 10, height: 10)
                    Circle().fill(Color(hex: 0xFEBC2E)).frame(width: 10, height: 10)
                    Circle().fill(Color(hex: 0x28C840)).frame(width: 10, height: 10)
                }

                Spacer()

                Text("Terminal")
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(Color.gray)

                Spacer()
            }
            .padding(.horizontal, RaccoonSpacing.space3)
            .padding(.vertical, RaccoonSpacing.space2)
            .background(Color(hex: 0x1E1E1E))

            // Terminal content
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(lines) { line in
                            Text(line.text)
                                .font(RaccoonTypography.codeBlock)
                                .foregroundStyle(colorForType(line.type))
                                .textSelection(.enabled)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .id(line.id)
                        }
                    }
                    .padding(RaccoonSpacing.space3)
                }
                .background(Color(hex: 0x0D0D0D))
                .onChange(of: lines.count) {
                    if let lastID = lines.last?.id {
                        withAnimation(RaccoonMotion.easeOut) {
                            proxy.scrollTo(lastID, anchor: .bottom)
                        }
                    }
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
    }

    private func colorForType(_ type: TerminalLine.LineType) -> Color {
        switch type {
        case .stdout:
            return Color(hex: 0xD4D4D4) // Light gray
        case .stderr:
            return Color(hex: 0xF14C4C) // Red
        case .system:
            return Color(hex: 0x28C840) // Green
        }
    }
}
