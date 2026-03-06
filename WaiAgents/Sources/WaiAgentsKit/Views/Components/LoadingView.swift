import SwiftUI

/// Skeleton/shimmer animation for loading states.
public struct LoadingView: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shimmerOffset: CGFloat = -1

    public init() {}

    public var body: some View {
        VStack(spacing: WaiAgentsSpacing.space3) {
            ForEach(0..<5, id: \.self) { _ in
                skeletonRow
            }
        }
        .padding(.horizontal, WaiAgentsSpacing.space3)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(
                .linear(duration: 1.5)
                .repeatForever(autoreverses: false)
            ) {
                shimmerOffset = 2
            }
        }
    }

    private var skeletonRow: some View {
        HStack(spacing: WaiAgentsSpacing.space3) {
            // Avatar skeleton
            Circle()
                .fill(skeletonColor)
                .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                // Title skeleton
                RoundedRectangle(cornerRadius: WaiAgentsRadius.sm)
                    .fill(skeletonColor)
                    .frame(width: 140, height: 14)

                // Preview skeleton
                RoundedRectangle(cornerRadius: WaiAgentsRadius.sm)
                    .fill(skeletonColor)
                    .frame(height: 12)
            }
        }
        .frame(height: 68)
        .overlay {
            if !reduceMotion {
                shimmerOverlay
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
    }

    private var shimmerOverlay: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            LinearGradient(
                gradient: Gradient(colors: [
                    .clear,
                    shimmerHighlight,
                    .clear,
                ]),
                startPoint: .leading,
                endPoint: .trailing
            )
            .frame(width: width * 0.4)
            .offset(x: shimmerOffset * width)
        }
    }

    private var skeletonColor: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgTertiary : WaiAgentsColors.Light.bgTertiary
    }

    private var shimmerHighlight: Color {
        colorScheme == .dark
            ? Color.white.opacity(0.05)
            : Color.white.opacity(0.6)
    }
}
