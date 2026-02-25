import SwiftUI

/// Extends ConversationDetailView for agent conversations.
/// Shows agent status indicator (streaming, thinking, tool use),
/// tool approval cards, and token-by-token streaming text.
public struct AgentChatView: View {
    public let conversationID: String
    public let agentName: String

    @State private var viewModel: ConversationDetailViewModel
    @State private var showScrollToBottom = false
    @State private var agentStatus: String = ""
    @State private var isAgentStreaming = false
    @State private var streamingText = ""
    @State private var pendingApproval: PendingApproval?
    @State private var toolExecutions: [ToolExecutionLog.ToolExecution] = []
    @State private var showToolLog = false

    @Environment(\.colorScheme) private var colorScheme

    private struct PendingApproval: Sendable {
        let toolName: String
        let description: String
        let parametersPreview: String
    }

    public init(conversationID: String, agentName: String) {
        self.conversationID = conversationID
        self.agentName = agentName
        self._viewModel = State(initialValue: ConversationDetailViewModel(conversationID: conversationID))
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Messages area
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

                        // Streaming response
                        if isAgentStreaming, !streamingText.isEmpty {
                            HStack(alignment: .top, spacing: RaccoonSpacing.space2) {
                                AvatarView(
                                    name: agentName,
                                    size: 28,
                                    isAgent: true
                                )
                                StreamingTextView(text: streamingText, isStreaming: true)
                                    .padding(.vertical, 10)
                                    .padding(.horizontal, 14)
                                    .background(bgMessageReceived)
                                    .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
                                    .overlay {
                                        RoundedRectangle(cornerRadius: RaccoonRadius.xl)
                                            .strokeBorder(borderPrimary, lineWidth: 1)
                                    }
                                    .frame(maxWidth: 520, alignment: .leading)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, RaccoonSpacing.space4)
                            .padding(.top, RaccoonSpacing.space2)
                        }

                        // Tool approval card
                        if let approval = pendingApproval {
                            ToolApprovalCard(
                                toolName: approval.toolName,
                                toolDescription: approval.description,
                                parametersPreview: approval.parametersPreview,
                                onDecision: { _ in
                                    pendingApproval = nil
                                }
                            )
                            .padding(.horizontal, RaccoonSpacing.space4)
                            .padding(.top, RaccoonSpacing.space3)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                        }

                        // Agent status
                        if !agentStatus.isEmpty {
                            AgentStatusView(statusText: agentStatus, isActive: isAgentStreaming)
                                .padding(.horizontal, RaccoonSpacing.space4)
                                .padding(.top, RaccoonSpacing.space2)
                                .frame(maxWidth: .infinity, alignment: .leading)
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

            // Tool execution log
            if showToolLog, !toolExecutions.isEmpty {
                ToolExecutionLog(executions: toolExecutions)
                    .padding(.horizontal, RaccoonSpacing.space3)
                    .padding(.bottom, RaccoonSpacing.space2)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            Divider()
                .foregroundStyle(borderPrimary)

            // Input bar with tool log toggle
            HStack(spacing: 0) {
                InputBarView(
                    onSend: { content in
                        viewModel.sendMessage(content: content)
                    },
                    isAgentGenerating: isAgentStreaming
                )

                if !toolExecutions.isEmpty {
                    Button {
                        withAnimation(RaccoonMotion.easeDefault) {
                            showToolLog.toggle()
                        }
                    } label: {
                        Image(systemName: "terminal")
                            .font(.system(size: 14))
                            .foregroundStyle(textSecondary)
                            .frame(width: 32, height: 32)
                    }
                    .buttonStyle(.plain)
                    .padding(.trailing, RaccoonSpacing.space2)
                }
            }
        }
        .background(bgPrimary)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: RaccoonSpacing.space2) {
                    AvatarView(name: agentName, size: 24, isAgent: true)
                    Text(agentName)
                        .font(RaccoonTypography.textLg)
                        .foregroundStyle(textPrimary)
                }
            }
        }
        #endif
    }

    private var bgPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var bgMessageReceived: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgMessageReceived : RaccoonColors.Light.bgMessageReceived
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }

    private var textPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textPrimary : RaccoonColors.Light.textPrimary
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }
}
