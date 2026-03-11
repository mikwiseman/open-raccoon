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
            #if os(macOS)
            // macOS header bar
            HStack {
                Text(conversationTitle)
                    .font(WaiAgentsTypography.textLg)
                    .fontWeight(.semibold)
                    .foregroundStyle(textPrimary)
                Spacer()
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.vertical, WaiAgentsSpacing.space3)
            Divider()
                .foregroundStyle(borderPrimary)
            #endif

            if appState.currentUserID == nil {
                VStack(spacing: WaiAgentsSpacing.space3) {
                    Image(systemName: "person.crop.circle.badge.exclamationmark")
                        .font(.system(size: 36))
                        .foregroundStyle(WaiAgentsColors.Semantic.error)
                    Text("Please log in to view this conversation.")
                        .font(WaiAgentsTypography.textSm)
                        .foregroundStyle(textPrimary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let viewModel, let currentUserID = appState.currentUserID {
                // Connection status banner
                if appState.connectionState != .connected {
                    connectionBanner
                }

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
                                        currentUserID: currentUserID
                                    )
                                    .id(message.id)
                                }
                            }

                            if viewModel.isTyping {
                                TypingIndicatorView()
                                    .padding(.top, WaiAgentsSpacing.space2)
                                    .onAppear {
                                        typingResetTask?.cancel()
                                        typingResetTask = Task {
                                            do {
                                                try await Task.sleep(nanoseconds: 3_000_000_000)
                                            } catch {
                                                return // Task was cancelled
                                            }
                                            viewModel.isTyping = false
                                        }
                                    }
                            }
                        }
                        .padding(.vertical, WaiAgentsSpacing.space2)
                    }
                    .onChange(of: viewModel.messages.count) {
                        if !showScrollToBottom {
                            withAnimation(WaiAgentsMotion.easeOut) {
                                proxy.scrollTo(viewModel.messages.last?.id, anchor: .bottom)
                            }
                        }
                    }
                    .overlay(alignment: .bottom) {
                        if showScrollToBottom {
                            ScrollToBottomPill {
                                withAnimation(WaiAgentsMotion.easeOut) {
                                    proxy.scrollTo(viewModel.messages.last?.id, anchor: .bottom)
                                    showScrollToBottom = false
                                }
                            }
                            .padding(.bottom, WaiAgentsSpacing.space4)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                        }
                    }
                }

                // Error display
                if let error = viewModel.error {
                    VStack(spacing: WaiAgentsSpacing.space3) {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundStyle(WaiAgentsColors.Semantic.error)
                        Text(error)
                            .font(WaiAgentsTypography.textSm)
                            .foregroundStyle(textPrimary)
                    }
                    .padding(WaiAgentsSpacing.space3)
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
            typingResetTask?.cancel()
            typingResetTask = nil
            viewModel?.unsubscribeFromChannel()
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(conversationTitle)
                    .font(WaiAgentsTypography.textLg)
                    .fontWeight(.semibold)
                    .foregroundStyle(textPrimary)
            }
        }
        #endif
    }

    private var connectionBanner: some View {
        HStack(spacing: WaiAgentsSpacing.space2) {
            if appState.connectionState == .connecting {
                ProgressView()
                    .controlSize(.small)
                Text("Connecting...")
                    .font(WaiAgentsTypography.textSm)
            } else {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 12))
                Text("Offline")
                    .font(WaiAgentsTypography.textSm)
            }
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, WaiAgentsSpacing.space2)
        .background(appState.connectionState == .connecting ? Color.orange : WaiAgentsColors.Semantic.error)
    }

    private var conversationTitle: String {
        appState.conversationStore.conversation(byID: conversationID)?.title ?? "Conversation"
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.borderPrimary : WaiAgentsColors.Light.borderPrimary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textPrimary : WaiAgentsColors.Light.textPrimary
    }
}
