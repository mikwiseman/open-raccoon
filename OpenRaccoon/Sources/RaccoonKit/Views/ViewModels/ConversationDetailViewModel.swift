import SwiftUI

@MainActor
@Observable
public final class ConversationDetailViewModel {
    public let conversationID: String
    public var messages: [Message] = []
    public var isTyping = false
    public var isAgentGenerating = false
    public var inputText = ""

    public struct MessageGroup: Identifiable, Sendable {
        public let id: String
        public let date: Date
        public let messages: [Message]
        public let showDateSeparator: Bool
    }

    public var groupedMessages: [MessageGroup] {
        guard !messages.isEmpty else { return [] }

        var groups: [MessageGroup] = []
        var currentGroup: [Message] = []
        var previousGroupDate: Date?

        for message in messages {
            let shouldStartNewGroup: Bool = {
                guard let last = currentGroup.last else { return true }
                if last.senderID != message.senderID { return true }
                if last.senderType != message.senderType { return true }
                if message.createdAt.timeIntervalSince(last.createdAt) >= 120 { return true }
                return false
            }()

            if shouldStartNewGroup, !currentGroup.isEmpty {
                let groupDate = currentGroup[0].createdAt
                let showSeparator: Bool
                if let prev = previousGroupDate {
                    showSeparator = !Calendar.current.isDate(prev, inSameDayAs: groupDate)
                } else {
                    showSeparator = true
                }

                groups.append(MessageGroup(
                    id: currentGroup[0].id,
                    date: groupDate,
                    messages: currentGroup,
                    showDateSeparator: showSeparator
                ))
                previousGroupDate = groupDate
                currentGroup = []
            }

            currentGroup.append(message)
        }

        if !currentGroup.isEmpty {
            let groupDate = currentGroup[0].createdAt
            let showSeparator: Bool
            if let prev = previousGroupDate {
                showSeparator = !Calendar.current.isDate(prev, inSameDayAs: groupDate)
            } else {
                showSeparator = true
            }

            groups.append(MessageGroup(
                id: currentGroup[0].id,
                date: groupDate,
                messages: currentGroup,
                showDateSeparator: showSeparator
            ))
        }

        return groups
    }

    public init(conversationID: String) {
        self.conversationID = conversationID
    }

    public func sendMessage(content: String) {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let message = Message(
            id: UUID().uuidString,
            conversationID: conversationID,
            senderID: "current_user",
            senderType: .human,
            type: .text,
            content: MessageContent(text: trimmed),
            createdAt: Date()
        )
        messages.append(message)
    }
}
