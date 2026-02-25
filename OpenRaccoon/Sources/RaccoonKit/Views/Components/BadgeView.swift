import SwiftUI

/// Unread count badge: 20px circle, accent bg, white text, text-2xs (10px), Semibold.
public struct BadgeView: View {
    public let count: Int

    public init(count: Int) {
        self.count = count
    }

    public var body: some View {
        if count > 0 {
            Text(displayText)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(RaccoonColors.Light.textInverse)
                .frame(minWidth: 20, minHeight: 20)
                .padding(.horizontal, count > 9 ? 4 : 0)
                .background(RaccoonColors.accentPrimary)
                .clipShape(Capsule())
        }
    }

    private var displayText: String {
        count > 99 ? "99+" : "\(count)"
    }
}
