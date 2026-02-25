import SwiftUI

public struct ConversationDetailView: View {
    public let conversationID: String
    @State private var viewModel: ConversationDetailViewModel
    @State private var showScrollToBottom = false

    @Environment(\.colorScheme) private var colorScheme

    public init(conversationID: String) {
        self.conversationID = conversationID
        self._viewModel = State(initialValue: ConversationDetailViewModel(conversationID: conversationID))
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.groupedMessages) { group in
                            if group.showDateSeparator {
                                DateSeparatorView(date: group.date)
                            }

                            ForEach(group.messages) { message in
                                MessageBubbleView(
                                    message: message,
                                    isFirstInGroup: message.id == group.messages.first?.id,
                                    isLastInGroup: message.id == group.messages.last?.id
                                )
                                .id(message.id)
                            }
                        }

                        if viewModel.isTyping {
                            TypingIndicatorView()
                                .padding(.top, RaccoonSpacing.space2)
                        }
                    }
                    .padding(.vertical, RaccoonSpacing.space2)
                }
                .onChange(of: viewModel.messages.count) {
                    if !showScrollToBottom {
                        withAnimation(RaccoonMotion.easeOut) {
                            proxy.scrollTo(viewModel.messages.last?.id, anchor: .bottom)
                        }
                    }
                }
                .overlay(alignment: .bottom) {
                    if showScrollToBottom {
                        ScrollToBottomPill {
                            withAnimation(RaccoonMotion.easeOut) {
                                proxy.scrollTo(viewModel.messages.last?.id, anchor: .bottom)
                                showScrollToBottom = false
                            }
                        }
                        .padding(.bottom, RaccoonSpacing.space4)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }
                }
            }

            Divider()
                .foregroundStyle(borderPrimary)

            // Input bar
            InputBarView(
                onSend: { content in
                    viewModel.sendMessage(content: content)
                },
                isAgentGenerating: viewModel.isAgentGenerating
            )
        }
        .background(bgPrimary)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(conversationID)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(textPrimary)
            }
        }
        #endif
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }
}
