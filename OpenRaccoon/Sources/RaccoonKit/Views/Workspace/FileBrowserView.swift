import SwiftUI

/// Tree-style file browser with folder expand/collapse,
/// file icons by type, and selection callback.
public struct FileBrowserView: View {
    public let rootNode: FileNode
    public let onFileSelected: (FileNode) -> Void

    @Environment(\.colorScheme) private var colorScheme

    public struct FileNode: Identifiable, Sendable {
        public let id: String
        public let name: String
        public let isDirectory: Bool
        public let children: [FileNode]

        public init(id: String = UUID().uuidString, name: String, isDirectory: Bool, children: [FileNode] = []) {
            self.id = id
            self.name = name
            self.isDirectory = isDirectory
            self.children = children
        }
    }

    public init(rootNode: FileNode, onFileSelected: @escaping (FileNode) -> Void) {
        self.rootNode = rootNode
        self.onFileSelected = onFileSelected
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: RaccoonSpacing.space2) {
                Image(systemName: "folder")
                    .font(.system(size: 12))
                    .foregroundStyle(textSecondary)
                Text("Files")
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(textSecondary)
                Spacer()
            }
            .padding(.horizontal, RaccoonSpacing.space3)
            .padding(.vertical, RaccoonSpacing.space2)

            Divider()
                .foregroundStyle(borderPrimary)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(rootNode.children) { node in
                        FileNodeRow(node: node, depth: 0, onFileSelected: onFileSelected)
                    }
                }
                .padding(.vertical, RaccoonSpacing.space1)
            }
        }
        .background(bgSecondary)
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: RaccoonRadius.lg)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}

struct FileNodeRow: View {
    let node: FileBrowserView.FileNode
    let depth: Int
    let onFileSelected: (FileBrowserView.FileNode) -> Void

    @State private var isExpanded = false
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                if node.isDirectory {
                    withAnimation(RaccoonMotion.easeDefault) {
                        isExpanded.toggle()
                    }
                } else {
                    onFileSelected(node)
                }
            } label: {
                HStack(spacing: RaccoonSpacing.space2) {
                    if node.isDirectory {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.system(size: 9))
                            .foregroundStyle(textTertiary)
                            .frame(width: 12)
                    } else {
                        Color.clear.frame(width: 12)
                    }

                    Image(systemName: iconForNode(node))
                        .font(.system(size: 13))
                        .foregroundStyle(colorForNode(node))

                    Text(node.name)
                        .font(RaccoonTypography.bodySmall)
                        .foregroundStyle(textPrimary)
                        .lineLimit(1)

                    Spacer()
                }
                .padding(.leading, CGFloat(depth) * RaccoonSpacing.space4 + RaccoonSpacing.space2)
                .padding(.trailing, RaccoonSpacing.space3)
                .frame(height: 28)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if isExpanded {
                ForEach(node.children) { child in
                    FileNodeRow(node: child, depth: depth + 1, onFileSelected: onFileSelected)
                }
            }
        }
    }

    private func iconForNode(_ node: FileBrowserView.FileNode) -> String {
        if node.isDirectory {
            return isExpanded ? "folder.fill" : "folder"
        }
        let ext = (node.name as NSString).pathExtension.lowercased()
        switch ext {
        case "swift": return "swift"
        case "js", "jsx": return "doc.text"
        case "ts", "tsx": return "doc.text"
        case "html", "htm": return "globe"
        case "css": return "paintpalette"
        case "json": return "curlybraces"
        case "py": return "doc.text"
        case "md": return "text.alignleft"
        case "png", "jpg", "jpeg", "gif", "svg": return "photo"
        default: return "doc"
        }
    }

    private func colorForNode(_ node: FileBrowserView.FileNode) -> Color {
        if node.isDirectory {
            return RaccoonColors.accentPrimary
        }
        let ext = (node.name as NSString).pathExtension.lowercased()
        switch ext {
        case "swift": return Color(hex: 0xF05138)
        case "js", "jsx": return Color(hex: 0xF7DF1E)
        case "ts", "tsx": return Color(hex: 0x3178C6)
        case "html", "htm": return Color(hex: 0xE34F26)
        case "css": return Color(hex: 0x1572B6)
        case "json": return Color(hex: 0xCBCB41)
        case "py": return Color(hex: 0x3776AB)
        default: return textSecondary
        }
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
}
