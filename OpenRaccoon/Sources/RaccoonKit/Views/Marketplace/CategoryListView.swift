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
                    HStack(spacing: RaccoonSpacing.space3) {
                        Image(systemName: category.icon)
                            .font(.system(size: 16))
                            .foregroundStyle(RaccoonColors.accentPrimary)
                            .frame(width: 36, height: 36)
                            .background(
                                colorScheme == .dark
                                    ? RaccoonColors.accentSubtleDark
                                    : RaccoonColors.accentSubtleLight
                            )
                            .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))

                        Text(category.name)
                            .font(RaccoonTypography.body)
                            .foregroundStyle(textPrimary)

                        Spacer()

                        Text("\(category.count)")
                            .font(RaccoonTypography.bodySmall)
                            .foregroundStyle(textTertiary)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                            .foregroundStyle(textTertiary)
                    }
                    .padding(.vertical, RaccoonSpacing.space1)
                }
                .buttonStyle(.plain)
                .listRowBackground(bgPrimary)
            }
        }
        .listStyle(.plain)
        .background(bgPrimary)
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }
}
