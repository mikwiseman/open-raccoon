import Testing
@testable import WaiAgentsKit

@Suite("Spacing System")
struct SpacingTests {
    @Test("All spacing values match the 4px base unit system")
    func spacingMultiples() {
        #expect(WaiAgentsSpacing.space0 == 0)
        #expect(WaiAgentsSpacing.space0_5 == 2)
        #expect(WaiAgentsSpacing.space1 == 4)
        #expect(WaiAgentsSpacing.space2 == 8)
        #expect(WaiAgentsSpacing.space3 == 12)
        #expect(WaiAgentsSpacing.space4 == 16)
        #expect(WaiAgentsSpacing.space5 == 20)
        #expect(WaiAgentsSpacing.space6 == 24)
        #expect(WaiAgentsSpacing.space8 == 32)
        #expect(WaiAgentsSpacing.space10 == 40)
        #expect(WaiAgentsSpacing.space12 == 48)
        #expect(WaiAgentsSpacing.space16 == 64)
        #expect(WaiAgentsSpacing.space20 == 80)
    }

    @Test("Border radius scale")
    func radiusScale() {
        #expect(WaiAgentsRadius.none == 0)
        #expect(WaiAgentsRadius.sm == 4)
        #expect(WaiAgentsRadius.md == 6)
        #expect(WaiAgentsRadius.lg == 8)
        #expect(WaiAgentsRadius.xl == 12)
        #expect(WaiAgentsRadius.xl2 == 16)
        #expect(WaiAgentsRadius.full == 9999)
    }

    @Test("Radius values are monotonically increasing")
    func radiusMonotonic() {
        #expect(WaiAgentsRadius.none < WaiAgentsRadius.sm)
        #expect(WaiAgentsRadius.sm < WaiAgentsRadius.md)
        #expect(WaiAgentsRadius.md < WaiAgentsRadius.lg)
        #expect(WaiAgentsRadius.lg < WaiAgentsRadius.xl)
        #expect(WaiAgentsRadius.xl < WaiAgentsRadius.xl2)
        #expect(WaiAgentsRadius.xl2 < WaiAgentsRadius.full)
    }

    @Test("Motion durations are ordered correctly")
    func motionDurations() {
        #expect(WaiAgentsMotion.durationInstant < WaiAgentsMotion.durationFast)
        #expect(WaiAgentsMotion.durationFast < WaiAgentsMotion.durationNormal)
        #expect(WaiAgentsMotion.durationNormal < WaiAgentsMotion.durationSlow)
        #expect(WaiAgentsMotion.durationSlow < WaiAgentsMotion.durationSlower)
    }
}
