import SwiftUI

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
    @State private var groupMembers: [String] = [""]
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
                    .font(RaccoonTypography.textLg)
                    .fontWeight(.semibold)
                    .foregroundStyle(textPrimary)
                Spacer()
                Button("Cancel") { onDismiss() }
                    .keyboardShortcut(.cancelAction)
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .padding(.top, RaccoonSpacing.space4)
            .padding(.bottom, RaccoonSpacing.space3)

            // Tab picker
            Picker("Type", selection: $selectedTab) {
                ForEach(Tab.allCases, id: \.rawValue) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, RaccoonSpacing.space4)
            .padding(.bottom, RaccoonSpacing.space3)

            Divider()

            // Error banner
            if let error {
                HStack(spacing: RaccoonSpacing.space2) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(RaccoonColors.Semantic.error)
                    Text(error)
                        .font(RaccoonTypography.textSm)
                        .foregroundStyle(RaccoonColors.Semantic.error)
                }
                .padding(RaccoonSpacing.space3)
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
                .padding(.horizontal, RaccoonSpacing.space4)
                .padding(.vertical, RaccoonSpacing.space3)

            if isLoadingAgents {
                Spacer()
                ProgressView()
                Spacer()
            } else if filteredAgents.isEmpty {
                Spacer()
                Text("No agents found")
                    .font(RaccoonTypography.textSm)
                    .foregroundStyle(textTertiary)
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: RaccoonSpacing.space2) {
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
                    .padding(.horizontal, RaccoonSpacing.space4)
                    .padding(.vertical, RaccoonSpacing.space2)
                }
            }
        }
    }

    private func agentRow(_ agent: Agent) -> some View {
        HStack(spacing: RaccoonSpacing.space3) {
            AvatarView(
                name: agent.name,
                size: 40,
                isAgent: true,
                agentAccentColor: RaccoonColors.AgentAccent.default
            )

            VStack(alignment: .leading, spacing: RaccoonSpacing.space1) {
                Text(agent.name)
                    .font(RaccoonTypography.textSm)
                    .fontWeight(.medium)
                    .foregroundStyle(textPrimary)

                if let description = agent.description {
                    Text(description)
                        .font(RaccoonTypography.caption)
                        .foregroundStyle(textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let category = agent.category {
                Text(category)
                    .font(RaccoonTypography.caption)
                    .foregroundStyle(RaccoonColors.accentPrimary)
                    .padding(.horizontal, RaccoonSpacing.space2)
                    .padding(.vertical, 2)
                    .background(
                        colorScheme == .dark
                            ? RaccoonColors.accentSubtleDark
                            : RaccoonColors.accentSubtleLight
                    )
                    .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.sm))
            }
        }
        .padding(RaccoonSpacing.space3)
        .background(bgSecondary)
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: RaccoonRadius.lg)
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
        VStack(spacing: RaccoonSpacing.space4) {
            Spacer()

            VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
                Text("Username")
                    .font(RaccoonTypography.textSm)
                    .fontWeight(.medium)
                    .foregroundStyle(textSecondary)

                TextField("Enter username...", text: $dmUsername)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal, RaccoonSpacing.space4)

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
                        .font(RaccoonTypography.textLg)
                        .foregroundStyle(RaccoonColors.Light.textInverse)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(dmUsername.isEmpty ? Color.gray : RaccoonColors.accentPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
                }
            }
            .buttonStyle(.plain)
            .disabled(dmUsername.isEmpty || isCreating)
            .padding(.horizontal, RaccoonSpacing.space4)

            Spacer()
        }
    }

    // MARK: - Group Tab

    private var groupTab: some View {
        VStack(spacing: RaccoonSpacing.space4) {
            VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
                Text("Group Name")
                    .font(RaccoonTypography.textSm)
                    .fontWeight(.medium)
                    .foregroundStyle(textSecondary)

                TextField("Enter group name...", text: $groupTitle)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal, RaccoonSpacing.space4)
            .padding(.top, RaccoonSpacing.space4)

            VStack(alignment: .leading, spacing: RaccoonSpacing.space2) {
                HStack {
                    Text("Members")
                        .font(RaccoonTypography.textSm)
                        .fontWeight(.medium)
                        .foregroundStyle(textSecondary)

                    Spacer()

                    Button {
                        groupMembers.append("")
                    } label: {
                        Image(systemName: "plus.circle")
                            .foregroundStyle(RaccoonColors.accentPrimary)
                    }
                    .buttonStyle(.plain)
                }

                ForEach(groupMembers.indices, id: \.self) { index in
                    HStack {
                        TextField("Username", text: $groupMembers[index])
                            .textFieldStyle(.roundedBorder)

                        if groupMembers.count > 1 {
                            Button {
                                groupMembers.remove(at: index)
                            } label: {
                                Image(systemName: "minus.circle")
                                    .foregroundStyle(RaccoonColors.Semantic.error)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(.horizontal, RaccoonSpacing.space4)

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
                        .font(RaccoonTypography.textLg)
                        .foregroundStyle(RaccoonColors.Light.textInverse)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(canCreateGroup ? RaccoonColors.accentPrimary : Color.gray)
                        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.xl))
                }
            }
            .buttonStyle(.plain)
            .disabled(!canCreateGroup || isCreating)
            .padding(.horizontal, RaccoonSpacing.space4)
            .padding(.bottom, RaccoonSpacing.space4)
        }
    }

    private var canCreateGroup: Bool {
        !groupTitle.isEmpty && groupMembers.contains(where: { !$0.isEmpty })
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
                let validMembers = groupMembers.filter { !$0.isEmpty }
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
        colorScheme == .dark ? RaccoonColors.Dark.bgPrimary : RaccoonColors.Light.bgPrimary
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
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
#endif
