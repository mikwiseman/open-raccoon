import SwiftUI

public enum RaccoonMotion {
    // MARK: - Durations (seconds)
    public static let durationInstant: Double = 0.1
    public static let durationFast: Double = 0.15
    public static let durationNormal: Double = 0.2
    public static let durationSlow: Double = 0.3
    public static let durationSlower: Double = 0.4

    // MARK: - Animations
    public static let easeDefault = Animation.timingCurve(0.25, 0.1, 0.25, 1.0, duration: durationNormal)
    public static let easeOut = Animation.timingCurve(0.0, 0.0, 0.2, 1.0, duration: durationNormal)
    public static let easeIn = Animation.timingCurve(0.4, 0.0, 1.0, 1.0, duration: durationFast)
    public static let easeInOut = Animation.timingCurve(0.4, 0.0, 0.2, 1.0, duration: durationNormal)
    public static let spring = Animation.timingCurve(0.34, 1.56, 0.64, 1.0, duration: durationFast)

    // MARK: - Specific Animations
    /// Message send: bubble slides up, scale 0.95 -> 1.0, 200ms ease-out
    public static let messageSend = Animation.timingCurve(0.0, 0.0, 0.2, 1.0, duration: 0.2)

    /// Agent status: text crossfade with opacity transition, 300ms
    public static let agentStatusCrossfade = Animation.timingCurve(0.25, 0.1, 0.25, 1.0, duration: 0.3)

    /// Panel transitions: slide-in from right, 250ms ease-out
    public static let panelTransition = Animation.timingCurve(0.0, 0.0, 0.2, 1.0, duration: 0.25)

    /// List item stagger delay
    public static let listItemStaggerDelay: Double = 0.05
}
