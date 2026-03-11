import SwiftUI

private struct IdentifiableString: Identifiable {
    let id = UUID()
    var value: String = ""
}

#if os(macOS)
public struct NewConversationSheet: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme

    @State private var selectedTab: Tab = .agent
    @State private var agents: [Agent] = []
    @State private var isLoadingAgents = true
    @State private var agentSearchText = ""
    @State private var dmUsername = ""
    @State private var groupTitle = ""
    @State private var groupMembers: [IdentifiableString] = [IdentifiableString()]
    @State private var error: String?
    @State private var isCreating = false

    let onConversationCreated: (String) -> Void
    let onDismiss: () -> Void

    enum Tab: String, CaseIterable {
        case agent = "Agent"
        case dm = "Direct Message"
        case group = "Group"
    }

    public init(
        onConversationCreated: @escaping (String) -> Void,
        onDismiss: @escaping () -> Void
    ) {
        self.onConversationCreated = onConversationCreated
        self.onDismiss = onDismiss
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("New Conversation")
                    .font(WaiAgentsTypography.textLg)
                    .fontWeight(.semibold)
                    .foregroundStyle(textPrimary)
                Spacer()
                Button("Cancel") { onDismiss() }
                    .keyboardShortcut(.cancelAction)
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.top, WaiAgentsSpacing.space4)
            .padding(.bottom, WaiAgentsSpacing.space3)

            // Tab picker
            Picker("Type", selection: $selectedTab) {
                ForEach(Tab.allCases, id: \.rawValue) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.bottom, WaiAgentsSpacing.space3)

            Divider()

            // Error banner
            if let error {
                HStack(spacing: WaiAgentsSpacing.space2) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(WaiAgentsColors.Semantic.error)
                    Text(error)
                        .font(WaiAgentsTypography.textSm)
                        .foregroundStyle(WaiAgentsColors.Semantic.error)
                }
                .padding(WaiAgentsSpacing.space3)
            }

            // Content
            switch selectedTab {
            case .agent:
                agentTab
            case .dm:
                dmTab
            case .group:
                groupTab
            }
        }
        .frame(minWidth: 500, minHeight: 450)
        .background(bgPrimary)
        .task {
            await loadAgents()
        }
    }

    // MARK: - Agent Tab

    private var agentTab: some View {
        VStack(spacing: 0) {
            SearchBarView(text: $agentSearchText, placeholder: "Search agents...")
                .padding(.horizontal, WaiAgentsSpacing.space4)
                .padding(.vertical, WaiAgentsSpacing.space3)

            if isLoadingAgents {
                Spacer()
                ProgressView()
                Spacer()
            } else if filteredAgents.isEmpty {
                Spacer()
                Text("No agents found")
                    .font(WaiAgentsTypography.textSm)
                    .foregroundStyle(textTertiary)
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: WaiAgentsSpacing.space2) {
                        ForEach(filteredAgents) { agent in
                            Button {
                                startAgentConversation(agent)
                            } label: {
                                agentRow(agent)
                            }
                            .buttonStyle(.plain)
                            .disabled(isCreating)
                        }
                    }
                    .padding(.horizontal, WaiAgentsSpacing.space4)
                    .padding(.vertical, WaiAgentsSpacing.space2)
                }
            }
        }
    }

    private func agentRow(_ agent: Agent) -> some View {
        HStack(spacing: WaiAgentsSpacing.space3) {
            AvatarView(
                name: agent.name,
                size: 40,
                isAgent: true,
                agentAccentColor: WaiAgentsColors.AgentAccent.default
            )

            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space1) {
                Text(agent.name)
                    .font(WaiAgentsTypography.textSm)
                    .fontWeight(.medium)
                    .foregroundStyle(textPrimary)

                if let description = agent.description {
                    Text(description)
                        .font(WaiAgentsTypography.caption)
                        .foregroundStyle(textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let category = agent.category {
                Text(category)
                    .font(WaiAgentsTypography.caption)
                    .foregroundStyle(WaiAgentsColors.accentPrimary)
                    .padding(.horizontal, WaiAgentsSpacing.space2)
                    .padding(.vertical, 2)
                    .background(
                        colorScheme == .dark
                            ? WaiAgentsColors.accentSubtleDark
                            : WaiAgentsColors.accentSubtleLight
                    )
                    .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.sm))
            }
        }
        .padding(WaiAgentsSpacing.space3)
        .background(bgSecondary)
        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var filteredAgents: [Agent] {
        guard !agentSearchText.isEmpty else { return agents }
        return agents.filter { agent in
            agent.name.localizedCaseInsensitiveContains(agentSearchText) ||
            (agent.description?.localizedCaseInsensitiveContains(agentSearchText) ?? false) ||
            (agent.category?.localizedCaseInsensitiveContains(agentSearchText) ?? false)
        }
    }

    // MARK: - DM Tab

    private var dmTab: some View {
        VStack(spacing: WaiAgentsSpacing.space4) {
            Spacer()

            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                Text("Username")
                    .font(WaiAgentsTypography.textSm)
                    .fontWeight(.medium)
                    .foregroundStyle(textSecondary)

                TextField("Enter username...", text: $dmUsername)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)

            Button {
                createDMConversation()
            } label: {
                if isCreating {
                    ProgressView()
                        .controlSize(.small)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                } else {
                    Text("Start Chat")
                        .font(WaiAgentsTypography.textLg)
                        .foregroundStyle(WaiAgentsColors.Light.textInverse)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(dmUsername.isEmpty ? Color.gray : WaiAgentsColors.accentPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
                }
            }
            .buttonStyle(.plain)
            .disabled(dmUsername.isEmpty || isCreating)
            .padding(.horizontal, WaiAgentsSpacing.space4)

            Spacer()
        }
    }

    // MARK: - Group Tab

    private var groupTab: some View {
        VStack(spacing: WaiAgentsSpacing.space4) {
            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                Text("Group Name")
                    .font(WaiAgentsTypography.textSm)
                    .fontWeight(.medium)
                    .foregroundStyle(textSecondary)

                TextField("Enter group name...", text: $groupTitle)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.top, WaiAgentsSpacing.space4)

            VStack(alignment: .leading, spacing: WaiAgentsSpacing.space2) {
                HStack {
                    Text("Members")
                        .font(WaiAgentsTypography.textSm)
                        .fontWeight(.medium)
                        .foregroundStyle(textSecondary)

                    Spacer()

                    Button {
                        groupMembers.append(IdentifiableString())
                    } label: {
                        Image(systemName: "plus.circle")
                            .foregroundStyle(WaiAgentsColors.accentPrimary)
                    }
                    .buttonStyle(.plain)
                }

                ForEach($groupMembers) { $member in
                    HStack {
                        TextField("Username", text: $member.value)
                            .textFieldStyle(.roundedBorder)

                        if groupMembers.count > 1 {
                            Button {
                                groupMembers.removeAll { $0.id == member.id }
                            } label: {
                                Image(systemName: "minus.circle")
                                    .foregroundStyle(WaiAgentsColors.Semantic.error)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(.horizontal, WaiAgentsSpacing.space4)

            Spacer()

            Button {
                createGroupConversation()
            } label: {
                if isCreating {
                    ProgressView()
                        .controlSize(.small)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                } else {
                    Text("Create Group")
                        .font(WaiAgentsTypography.textLg)
                        .foregroundStyle(WaiAgentsColors.Light.textInverse)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(canCreateGroup ? WaiAgentsColors.accentPrimary : Color.gray)
                        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.xl))
                }
            }
            .buttonStyle(.plain)
            .disabled(!canCreateGroup || isCreating)
            .padding(.horizontal, WaiAgentsSpacing.space4)
            .padding(.bottom, WaiAgentsSpacing.space4)
        }
    }

    private var canCreateGroup: Bool {
        !groupTitle.isEmpty && groupMembers.contains(where: { !$0.value.isEmpty })
    }

    // MARK: - Actions

    private func loadAgents() async {
        isLoadingAgents = true
        do {
            let response: PaginatedResponse<Agent> = try await appState.apiClient.request(
                .marketplace(cursor: nil, limit: 30)
            )
            agents = response.items
        } catch {
            self.error = String(describing: error)
        }
        isLoadingAgents = false
    }

    private func startAgentConversation(_ agent: Agent) {
        isCreating = true
        error = nil
        Task {
            do {
                let response: ConversationResponse = try await appState.apiClient.request(
                    .startAgentConversation(agentID: agent.id)
                )
                appState.conversationStore.upsert(response.conversation)
                onConversationCreated(response.conversation.id)
            } catch {
                self.error = String(describing: error)
            }
            isCreating = false
        }
    }

    private func createDMConversation() {
        isCreating = true
        error = nil
        Task {
            do {
                let response: ConversationResponse = try await appState.apiClient.request(
                    .createConversation(type: "dm", title: nil, agentID: nil)
                )
                // Look up user by username and add as member
                let userResponse: UserResponse = try await appState.apiClient.request(
                    .userProfile(username: dmUsername)
                )
                try await appState.apiClient.requestVoid(
                    .addMember(conversationID: response.conversation.id, userID: userResponse.user.id)
                )
                appState.conversationStore.upsert(response.conversation)
                onConversationCreated(response.conversation.id)
            } catch {
                self.error = String(describing: error)
            }
            isCreating = false
        }
    }

    private func createGroupConversation() {
        isCreating = true
        error = nil
        Task {
            do {
                let response: ConversationResponse = try await appState.apiClient.request(
                    .createConversation(type: "group", title: groupTitle, agentID: nil)
                )
                // Add each member by username
                let validMembers = groupMembers.map(\.value).filter { !$0.isEmpty }
                for username in validMembers {
                    let userResponse: UserResponse = try await appState.apiClient.request(
                        .userProfile(username: username)
                    )
                    try await appState.apiClient.requestVoid(
                        .addMember(conversationID: response.conversation.id, userID: userResponse.user.id)
                    )
                }
                appState.conversationStore.upsert(response.conversation)
                onConversationCreated(response.conversation.id)
            } catch {
                self.error = String(describing: error)
            }
            isCreating = false
        }
    }

    // MARK: - Colors

    private var bgPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgPrimary : WaiAgentsColors.Light.bgPrimary
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgSecondary : WaiAgentsColors.Light.bgSecondary
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
#endif
