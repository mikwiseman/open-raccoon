import Testing
@testable import RaccoonKit

@Suite("Spacing System")
struct SpacingTests {
    @Test("All spacing values match the 4px base unit system")
    func spacingMultiples() {
        #expect(RaccoonSpacing.space0 == 0)
        #expect(RaccoonSpacing.space0_5 == 2)
        #expect(RaccoonSpacing.space1 == 4)
        #expect(RaccoonSpacing.space2 == 8)
        #expect(RaccoonSpacing.space3 == 12)
        #expect(RaccoonSpacing.space4 == 16)
        #expect(RaccoonSpacing.space5 == 20)
        #expect(RaccoonSpacing.space6 == 24)
        #expect(RaccoonSpacing.space8 == 32)
        #expect(RaccoonSpacing.space10 == 40)
        #expect(RaccoonSpacing.space12 == 48)
        #expect(RaccoonSpacing.space16 == 64)
        #expect(RaccoonSpacing.space20 == 80)
    }

    @Test("Border radius scale")
    func radiusScale() {
        #expect(RaccoonRadius.none == 0)
        #expect(RaccoonRadius.sm == 4)
        #expect(RaccoonRadius.md == 6)
        #expect(RaccoonRadius.lg == 8)
        #expect(RaccoonRadius.xl == 12)
        #expect(RaccoonRadius.xl2 == 16)
        #expect(RaccoonRadius.full == 9999)
    }

    @Test("Radius values are monotonically increasing")
    func radiusMonotonic() {
        #expect(RaccoonRadius.none < RaccoonRadius.sm)
        #expect(RaccoonRadius.sm < RaccoonRadius.md)
        #expect(RaccoonRadius.md < RaccoonRadius.lg)
        #expect(RaccoonRadius.lg < RaccoonRadius.xl)
        #expect(RaccoonRadius.xl < RaccoonRadius.xl2)
        #expect(RaccoonRadius.xl2 < RaccoonRadius.full)
    }

    @Test("Motion durations are ordered correctly")
    func motionDurations() {
        #expect(RaccoonMotion.durationInstant < RaccoonMotion.durationFast)
        #expect(RaccoonMotion.durationFast < RaccoonMotion.durationNormal)
        #expect(RaccoonMotion.durationNormal < RaccoonMotion.durationSlow)
        #expect(RaccoonMotion.durationSlow < RaccoonMotion.durationSlower)
    }
}
