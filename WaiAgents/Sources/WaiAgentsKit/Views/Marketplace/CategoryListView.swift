import SwiftUI

/// List of agent categories with icon, name, count.
/// Tap to filter marketplace.
public struct CategoryListView: View {
    public let categories: [AgentCategory]
    public let onCategorySelected: (AgentCategory) -> Void

    @Environment(\.colorScheme) private var colorScheme

    public struct AgentCategory: Identifiable, Sendable {
        public let id: String
        public let name: String
        public let icon: String
        public let count: Int

        public init(id: String = UUID().uuidString, name: String, icon: String, count: Int) {
            self.id = id
            self.name = name
            self.icon = icon
            self.count = count
        }
    }

    public init(categories: [AgentCategory], onCategorySelected: @escaping (AgentCategory) -> Void) {
        self.categories = categories
        self.onCategorySelected = onCategorySelected
    }

    public var body: some View {
        List {
            ForEach(categories) { category in
                Button {
                    onCategorySelected(category)
                } label: {
                    HStack(spacing: WaiAgentsSpacing.space3) {
                        Image(systemName: category.icon)
                            .font(.system(size: 16))
                            .foregroundStyle(WaiAgentsColors.accentPrimary)
                            .frame(width: 36, height: 36)
                            .background(
                                colorScheme == .dark
                                    ? WaiAgentsColors.accentSubtleDark
                                    : WaiAgentsColors.accentSubtleLight
                            )
                            .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))

                        Text(category.name)
                            .font(WaiAgentsTypography.body)
                            .foregroundStyle(textPrimary)

                        Spacer()

                        Text("\(category.count)")
                            .font(WaiAgentsTypography.bodySmall)
                            .foregroundStyle(textTertiary)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                            .foregroundStyle(textTertiary)
                    }
                    .padding(.vertical, WaiAgentsSpacing.space1)
                }
                .buttonStyle(.plain)
                .listRowBackground(bgPrimary)
            }
        }
        .listStyle(.plain)
        .background(bgPrimary)
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }
}
