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
        VStack(spacing: WaiAgentsSpacing.space5) {
            // Header
            VStack(spacing: WaiAgentsSpacing.space2) {
                Text("Rate \(agentName)")
                    .font(WaiAgentsTypography.h3)
                    .foregroundStyle(textPrimary)

                Text("Share your experience with this agent")
                    .font(WaiAgentsTypography.bodySmall)
                    .foregroundStyle(textSecondary)
            }

            // Star rating
            HStack(spacing: WaiAgentsSpacing.space3) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        withAnimation(WaiAgentsMotion.spring) {
                            selectedRating = star
                        }
                    } label: {
                        Image(systemName: star <= selectedRating ? "star.fill" : "star")
                            .font(.system(size: 32))
                            .foregroundStyle(
                                star <= selectedRating
                                    ? WaiAgentsColors.Semantic.warning
                                    : textTertiary
                            )
                    }
                    .buttonStyle(.plain)
                    .frame(width: 44, height: 44)
                }
            }
            .padding(.vertical, WaiAgentsSpacing.space2)

            // Review text
            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                Text("Review (optional)")
                    .font(WaiAgentsTypography.bodySmall)
                    .foregroundStyle(textSecondary)

                TextEditor(text: $reviewText)
                    .font(WaiAgentsTypography.body)
                    .foregroundStyle(textPrimary)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 100, maxHeight: 200)
                    .padding(WaiAgentsSpacing.space3)
                    .background(bgInput)
                    .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
                    .overlay {
                        RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                            .strokeBorder(borderPrimary, lineWidth: 1)
                    }
            }

            // Submit button
            Button {
                onSubmit(selectedRating, reviewText)
            } label: {
                Text("Submit Review")
                    .font(WaiAgentsTypography.textLg)
                    .foregroundStyle(
                        selectedRating > 0
                            ? WaiAgentsColors.Light.textInverse
                            : textTertiary
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(
                        selectedRating > 0
                            ? WaiAgentsColors.accentPrimary
                            : bgTertiary
                    )
                    .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
            }
            .buttonStyle(.plain)
            .disabled(selectedRating == 0)

            Spacer()
        }
        .padding(.horizontal, WaiAgentsSpacing.space4)
        .padding(.top, WaiAgentsSpacing.space5)
        .background(bgPrimary)
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var bgInput: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgInput : WaiAgentsColors.Light.bgInput
    }

    private var bgTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgTertiary : WaiAgentsColors.Light.bgTertiary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.borderPrimary : WaiAgentsColors.Light.borderPrimary
    }
}
