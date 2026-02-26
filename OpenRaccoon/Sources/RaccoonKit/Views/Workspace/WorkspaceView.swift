import SwiftUI

/// Slide-over panel from the right edge containing code editor area,
/// preview area, file browser, and terminal. Resizable split panes.
public struct WorkspaceView: View {
    @Binding public var isPresented: Bool

    @State private var selectedTab: WorkspaceTab = .preview
    @State private var bottomTab: BottomTab = .files
    @State private var splitRatio: CGFloat = 0.55
    @State private var selectedCode: String = ""
    @State private var selectedFileName: String?
    @State private var previewHTML: String?
    @State private var terminalLines: [TerminalView.TerminalLine] = []
    @State private var dragStartRatio: CGFloat = 0.55
    @State private var containerHeight: CGFloat = 600

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    enum WorkspaceTab: String, CaseIterable, Sendable {
        case preview = "Preview"
        case code = "Code"
    }

    enum BottomTab: String, CaseIterable, Sendable {
        case files = "Files"
        case terminal = "Terminal"
    }

    public init(isPresented: Binding<Bool>) {
        self._isPresented = isPresented
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Top toolbar
            toolbar

            Divider()
                .foregroundStyle(borderPrimary)

            // Content area - vertical split
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    // Top pane: Preview or Code editor
                    topPane
                        .frame(height: geometry.size.height * splitRatio)

                    // Resize handle
                    resizeHandle

                    // Bottom pane: Files or Terminal
                    bottomPane
                        .frame(maxHeight: .infinity)
                }
                .onChange(of: geometry.size.height, initial: true) { _, newHeight in
                    containerHeight = newHeight
                }
            }
        }
        .background(bgPrimary)
        .transition(.move(edge: .trailing))
    }

    private var toolbar: some View {
        HStack(spacing: RaccoonSpacing.space2) {
            // Top pane tabs
            ForEach(WorkspaceTab.allCases, id: \.rawValue) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    Text(tab.rawValue)
                        .font(RaccoonTypography.bodySmall)
                        .foregroundStyle(selectedTab == tab ? textPrimary : textTertiary)
                        .padding(.horizontal, RaccoonSpacing.space3)
                        .padding(.vertical, RaccoonSpacing.space1)
                        .background(
                            selectedTab == tab
                                ? RaccoonColors.accentSubtleLight
                                : Color.clear
                        )
                        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.md))
                }
                .buttonStyle(.plain)
            }

            Spacer()

            // Bottom pane tabs
            ForEach(BottomTab.allCases, id: \.rawValue) { tab in
                Button {
                    bottomTab = tab
                } label: {
                    Text(tab.rawValue)
                        .font(RaccoonTypography.caption)
                        .foregroundStyle(bottomTab == tab ? textSecondary : textTertiary)
                }
                .buttonStyle(.plain)
            }

            // Close button
            Button {
                withAnimation(RaccoonMotion.panelTransition) {
                    isPresented = false
                }
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(textSecondary)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, RaccoonSpacing.space3)
        .padding(.vertical, RaccoonSpacing.space2)
        .background(bgSecondary)
    }

    @ViewBuilder
    private var topPane: some View {
        switch selectedTab {
        case .preview:
            PreviewView(htmlContent: previewHTML)
        case .code:
            if !selectedCode.isEmpty {
                CodeEditorView(code: selectedCode, fileName: selectedFileName)
            } else {
                emptyCodeState
            }
        }
    }

    @ViewBuilder
    private var bottomPane: some View {
        switch bottomTab {
        case .files:
            FileBrowserView(rootNode: sampleFileTree) { node in
                selectedFileName = node.name
                selectedCode = "// Contents of \(node.name)"
                selectedTab = .code
            }
        case .terminal:
            TerminalView(lines: terminalLines)
        }
    }

    private var resizeHandle: some View {
        Rectangle()
            .fill(borderPrimary)
            .frame(height: 4)
            .contentShape(Rectangle())
            .gesture(
                DragGesture()
                    .onChanged { value in
                        let delta = value.translation.height
                        let newRatio = dragStartRatio + delta / containerHeight
                        splitRatio = min(max(newRatio, 0.2), 0.8)
                    }
                    .onEnded { _ in
                        dragStartRatio = splitRatio
                    }
            )
            #if os(macOS)
            .onHover { hovering in
                if hovering {
                    NSCursor.resizeUpDown.push()
                } else {
                    NSCursor.pop()
                }
            }
            #endif
    }

    private var emptyCodeState: some View {
        VStack(spacing: RaccoonSpacing.space3) {
            Image(systemName: "doc.text")
                .font(.system(size: 28))
                .foregroundStyle(textTertiary)
            Text("Select a file to view code")
                .font(RaccoonTypography.bodySmall)
                .foregroundStyle(textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(bgPrimary)
    }

    private var sampleFileTree: FileBrowserView.FileNode {
        FileBrowserView.FileNode(name: "sandbox", isDirectory: true, children: [
            FileBrowserView.FileNode(name: "index.html", isDirectory: false),
            FileBrowserView.FileNode(name: "style.css", isDirectory: false),
            FileBrowserView.FileNode(name: "app.js", isDirectory: false),
        ])
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
