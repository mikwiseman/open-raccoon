import SwiftUI

public struct AvatarView: View {
    public let name: String
    public let imageURL: URL?
    public let size: CGFloat
    public var isOnline: Bool = false
    public var isAgent: Bool = false
    public var agentAccentColor: Color = RaccoonColors.AgentAccent.default
    public var platformBadge: String?

    @Environment(\.colorScheme) private var colorScheme

    public init(
        name: String,
        imageURL: URL? = nil,
        size: CGFloat = 40,
        isOnline: Bool = false,
        isAgent: Bool = false,
        agentAccentColor: Color = RaccoonColors.AgentAccent.default,
        platformBadge: String? = nil
    ) {
        self.name = name
        self.imageURL = imageURL
        self.size = size
        self.isOnline = isOnline
        self.isAgent = isAgent
        self.agentAccentColor = agentAccentColor
        self.platformBadge = platformBadge
    }

    public var body: some View {
        ZStack(alignment: .bottomTrailing) {
            initialsView
                .frame(width: size, height: size)
                .clipShape(Circle())
                .overlay {
                    if isAgent {
                        Circle()
                            .strokeBorder(agentAccentColor, lineWidth: 2)
                    }
                }

            if isOnline {
                Circle()
                    .fill(RaccoonColors.Semantic.success)
                    .frame(width: onlineIndicatorSize, height: onlineIndicatorSize)
                    .overlay {
                        Circle()
                            .strokeBorder(
                                colorScheme == .dark
                                    ? RaccoonColors.Dark.bgPrimary
                                    : RaccoonColors.Light.bgPrimary,
                                lineWidth: 2
                            )
                    }
                    .offset(x: 1, y: 1)
            }
        }
    }

    private var onlineIndicatorSize: CGFloat {
        max(10, size * 0.25)
    }

    private var initialsView: some View {
        ZStack {
            RaccoonColors.accentPrimary
            Text(initials)
                .font(.system(size: size * 0.4, weight: .medium))
                .foregroundStyle(RaccoonColors.Light.textInverse)
        }
    }

    private var initials: String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}
