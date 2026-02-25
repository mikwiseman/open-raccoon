import SwiftUI

public struct ConversationListView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = ConversationListViewModel()
    @State private var searchText = ""

    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView()
            } else if filteredConversations.isEmpty {
                emptyState
            } else {
                conversationList
            }
        }
        #if os(iOS)
        .navigationDestination(for: String.self) { conversationID in
            ConversationDetailView(conversationID: conversationID)
        }
        #endif
    }

    private var conversationList: some View {
        List(selection: Binding(
            get: { appState.selectedConversationID },
            set: { appState.selectedConversationID = $0 }
        )) {
            ForEach(filteredConversations) { conversation in
                #if os(iOS)
                NavigationLink(value: conversation.id) {
                    ConversationListItemView(conversation: conversation)
                }
                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                .listRowSeparator(.hidden)
                #else
                ConversationListItemView(conversation: conversation)
                    .tag(conversation.id)
                    .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                    .listRowSeparator(.hidden)
                #endif
            }
        }
        .listStyle(.plain)
        .searchable(text: $searchText, prompt: "Search conversations")
    }

    private var emptyState: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            Image(systemName: "bubble.left.and.text.bubble.right")
                .font(.system(size: 36))
                .foregroundStyle(textTertiary)
            Text("No conversations yet")
                .font(RaccoonTypography.textLg)
                .foregroundStyle(textSecondary)
            Text("Start a new conversation to get going")
                .font(RaccoonTypography.textSm)
                .foregroundStyle(textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var filteredConversations: [Conversation] {
        let conversations = appState.conversationStore.conversations
        guard !searchText.isEmpty else { return conversations }
        return conversations.filter { conversation in
            conversation.title?.localizedCaseInsensitiveContains(searchText) ?? false
        }
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }
}
