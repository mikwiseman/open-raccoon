import SwiftUI

public struct ShadowStyle: Sendable {
    public let color: Color
    public let radius: CGFloat
    public let y: CGFloat

    public init(color: Color, radius: CGFloat, y: CGFloat) {
        self.color = color
        self.radius = radius
        self.y = y
    }
}

public enum RaccoonShadows {
    public static let sm = ShadowStyle(color: .black.opacity(0.05), radius: 1, y: 1)
    public static let md = ShadowStyle(color: .black.opacity(0.08), radius: 4, y: 2)
    public static let lg = ShadowStyle(color: .black.opacity(0.12), radius: 8, y: 4)
    public static let xl = ShadowStyle(color: .black.opacity(0.16), radius: 16, y: 8)
}

// MARK: - View Extension for applying ShadowStyle
extension View {
    public func raccoonShadow(_ style: ShadowStyle) -> some View {
        self.shadow(color: style.color, radius: style.radius, x: 0, y: style.y)
    }
}
