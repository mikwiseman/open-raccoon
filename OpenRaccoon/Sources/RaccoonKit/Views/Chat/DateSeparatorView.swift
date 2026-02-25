import SwiftUI

/// Date separator: centered text, text-xs, text-tertiary, horizontal rules on both sides.
public struct DateSeparatorView: View {
    public let date: Date

    @Environment(\.colorScheme) private var colorScheme

    public init(date: Date) {
        self.date = date
    }

    public var body: some View {
        HStack(spacing: RaccoonSpacing.space3) {
            separator
            Text(formattedDate)
                .font(RaccoonTypography.textXs)
                .foregroundStyle(textTertiary)
            separator
        }
        .padding(.horizontal, RaccoonSpacing.space4)
        .padding(.vertical, RaccoonSpacing.space3)
    }

    private var separator: some View {
        Rectangle()
            .fill(borderPrimary)
            .frame(height: 1)
    }

    private var formattedDate: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            if calendar.isDate(date, equalTo: Date(), toGranularity: .year) {
                formatter.dateFormat = "MMMM d"
            } else {
                formatter.dateFormat = "MMMM d, yyyy"
            }
            return formatter.string(from: date)
        }
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
