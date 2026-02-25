import SwiftUI

/// Star rating input (1-5) with review text field and submit button.
public struct AgentRatingView: View {
    public let agentName: String
    public let onSubmit: (Int, String) -> Void

    @State private var selectedRating: Int = 0
    @State private var reviewText = ""
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

    public init(agentName: String, onSubmit: @escaping (Int, String) -> Void) {
        self.agentName = agentName
        self.onSubmit = onSubmit
    }

    public var body: some View {
        VStack(spacing: RaccoonSpacing.space5) {
            // Header
            VStack(spacing: RaccoonSpacing.space2) {
                Text("Rate \(agentName)")
                    .font(RaccoonTypography.h3)
                    .foregroundStyle(textPrimary)

                Text("Share your experience with this agent")
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(textSecondary)
            }

            // Star rating
            HStack(spacing: RaccoonSpacing.space3) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        withAnimation(RaccoonMotion.spring) {
                            selectedRating = star
                        }
                    } label: {
                        Image(systemName: star <= selectedRating ? "star.fill" : "star")
                            .font(.system(size: 32))
                            .foregroundStyle(
                                star <= selectedRating
                                    ? RaccoonColors.Semantic.warning
                                    : textTertiary
                            )
                    }
                    .buttonStyle(.plain)
                    .frame(width: 44, height: 44)
                }
            }
            .padding(.vertical, RaccoonSpacing.space2)

            // Review text
            VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
                Text("Review (optional)")
                    .font(RaccoonTypography.bodySmall)
                    .foregroundStyle(textSecondary)

                TextEditor(text: $reviewText)
                    .font(RaccoonTypography.body)
                    .foregroundStyle(textPrimary)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 100, maxHeight: 200)
                    .padding(RaccoonSpacing.space3)
                    .background(bgInput)
                    .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
                    .overlay {
                        RoundedRectangle(cornerRadius: RaccoonRadius.lg)
                            .strokeBorder(borderPrimary, lineWidth: 1)
                    }
            }

            // Submit button
            Button {
                onSubmit(selectedRating, reviewText)
            } label: {
                Text("Submit Review")
                    .font(RaccoonTypography.textLg)
                    .foregroundStyle(
                        selectedRating > 0
                            ? RaccoonColors.Light.textInverse
                            : textTertiary
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(
                        selectedRating > 0
                            ? RaccoonColors.accentPrimary
                            : bgTertiary
                    )
                    .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
            }
            .buttonStyle(.plain)
            .disabled(selectedRating == 0)

            Spacer()
        }
        .padding(.horizontal, RaccoonSpacing.space4)
        .padding(.top, RaccoonSpacing.space5)
        .background(bgPrimary)
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var bgInput: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgInput : RaccoonColors.Light.bgInput
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgTertiary : RaccoonColors.Light.bgTertiary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}
