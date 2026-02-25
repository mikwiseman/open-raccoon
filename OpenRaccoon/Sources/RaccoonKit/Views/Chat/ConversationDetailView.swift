import SwiftUI

public struct ConversationDetailView: View {
    public let conversationID: String
    @State private var viewModel: ConversationDetailViewModel?
    @State private var showScrollToBottom = false
    @State private var typingResetTask: Task<Void, Never>?

    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme

    public init(conversationID: String) {
        self.conversationID = conversationID
    }

    public var body: some View {
        VStack(spacing: 0) {
            if appState.currentUserID == nil {
                VStack(spacing: RaccoonSpacing.space3) {
                    Image(systemName: "person.crop.circle.badge.exclamationmark")
                        .font(.system(size: 36))
                        .foregroundStyle(RaccoonColors.Semantic.error)
                    Text("Please log in to view this conversation.")
                        .font(RaccoonTypography.textSm)
                        .foregroundStyle(textPrimary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let viewModel {
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
                                        isLastInGroup: message.id == group.messages.last?.id,
                                        currentUserID: appState.currentUserID!
                                    )
                                    .id(message.id)
                                }
                            }

                            if viewModel.isTyping {
                                TypingIndicatorView()
                                    .padding(.top, RaccoonSpacing.space2)
                                    .onAppear {
                                        typingResetTask?.cancel()
                                        typingResetTask = Task {
                                            try? await Task.sleep(nanoseconds: 3_000_000_000)
                                            guard !Task.isCancelled else { return }
                                            viewModel.isTyping = false
                                        }
                                    }
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

                // Error display
                if let error = viewModel.error {
                    VStack(spacing: RaccoonSpacing.space3) {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundStyle(RaccoonColors.Semantic.error)
                        Text(error)
                            .font(RaccoonTypography.textSm)
                            .foregroundStyle(textPrimary)
                    }
                    .padding(RaccoonSpacing.space3)
                }

                Divider()
                    .foregroundStyle(borderPrimary)

                // Input bar
                InputBarView(
                    onSend: { content in
                        viewModel.sendMessage(content: content)
                    },
                    onTyping: {
                        viewModel.userDidType()
                    },
                    isAgentGenerating: viewModel.isAgentGenerating
                )
            } else {
                LoadingView()
                    .frame(maxHeight: .infinity)
            }
        }
        .background(bgPrimary)
        .task {
            guard let currentUserID = appState.currentUserID else { return }
            if viewModel == nil {
                let vm = ConversationDetailViewModel(
                    conversationID: conversationID,
                    apiClient: appState.apiClient,
                    currentUserID: currentUserID,
                    webSocketClient: appState.webSocketClient
                )
                viewModel = vm
                await vm.loadMessages()
                vm.subscribeToChannel()
            }
        }
        .onDisappear {
            viewModel?.unsubscribeFromChannel()
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(conversationTitle)
                    .font(RaccoonTypography.textLg)
                    .fontWeight(.semibold)
                    .foregroundStyle(textPrimary)
            }
        }
        #endif
    }

    private var conversationTitle: String {
        appState.conversationStore.conversation(byID: conversationID)?.title ?? "Conversation"
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
