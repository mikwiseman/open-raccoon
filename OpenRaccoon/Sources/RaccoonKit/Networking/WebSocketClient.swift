import Foundation
@preconcurrency import SwiftPhoenixClient

/// WebSocket client wrapping SwiftPhoenixClient for Phoenix Channel communication.
/// Confined to MainActor since Socket is not Sendable and UI updates drive this.
@MainActor
public final class WebSocketClient {
    private let socket: Socket
    private let baseURL: String

    /// Tracks active channels by topic (e.g. "conversation:abc123") so we can push events to them.
    private var activeChannels: [String: Channel] = [:]

    // MARK: - Conversation Channel Handlers

    public var onNewMessage: ((_ payload: Message) -> Void)?
    public var onMessageUpdated: ((_ payload: Message) -> Void)?
    public var onTyping: ((_ payload: TypingPayload) -> Void)?
    public var onPresenceState: ((_ payload: [String: AnyCodable]) -> Void)?
    public var onPresenceDiff: ((_ payload: [String: AnyCodable]) -> Void)?

    // MARK: - Agent Channel Handlers

    public var onToken: ((_ payload: [String: AnyCodable]) -> Void)?
    public var onStatus: ((_ payload: [String: AnyCodable]) -> Void)?
    public var onApprovalRequested: ((_ payload: ApprovalRequestPayload) -> Void)?
    public var onToolCall: ((_ payload: ToolCallPayload) -> Void)?
    public var onToolResult: ((_ payload: ToolResultPayload) -> Void)?
    public var onCodeBlock: ((_ payload: CodeBlockPayload) -> Void)?
    public var onComplete: ((_ payload: [String: AnyCodable]) -> Void)?
    public var onError: ((_ payload: [String: AnyCodable]) -> Void)?

    // MARK: - User Channel Handlers

    public var onNotification: ((_ payload: [String: AnyCodable]) -> Void)?
    public var onBridgeStatus: ((_ payload: BridgeStatusPayload) -> Void)?
    public var onConversationUpdated: ((_ payload: Conversation) -> Void)?

    public init(baseURL: String, accessToken: String) {
        self.baseURL = baseURL
        let wsURL = baseURL
            .replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        self.socket = Socket("\(wsURL)/socket", params: ["token": accessToken])
    }

    public func connect() {
        socket.connect()
    }

    public func disconnect() {
        socket.disconnect()
    }

    /// Join a conversation channel to receive real-time message events.
    @discardableResult
    public func joinConversation(id: String) -> Channel {
        let topic = "conversation:\(id)"
        let channel = socket.channel(topic)

        channel.on(ConversationServerEvent.newMessage.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(Message.self, from: data) {
                self.onNewMessage?(decoded)
            }
        }

        channel.on(ConversationServerEvent.messageUpdated.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(Message.self, from: data) {
                self.onMessageUpdated?(decoded)
            }
        }

        channel.on(ConversationServerEvent.typing.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(TypingPayload.self, from: data) {
                self.onTyping?(decoded)
            }
        }

        channel.on(ConversationServerEvent.presenceState.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode([String: AnyCodable].self, from: data) {
                self.onPresenceState?(decoded)
            }
        }

        channel.on(ConversationServerEvent.presenceDiff.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode([String: AnyCodable].self, from: data) {
                self.onPresenceDiff?(decoded)
            }
        }

        channel.join()
        activeChannels[topic] = channel
        return channel
    }

    /// Join an agent channel to receive streaming AI response events.
    @discardableResult
    public func joinAgentChannel(conversationID: String) -> Channel {
        let topic = "agent:\(conversationID)"
        let channel = socket.channel(topic)

        channel.on(AgentServerEvent.token.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode([String: AnyCodable].self, from: data) {
                self.onToken?(decoded)
            }
        }

        channel.on(AgentServerEvent.status.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode([String: AnyCodable].self, from: data) {
                self.onStatus?(decoded)
            }
        }

        channel.on(AgentServerEvent.approvalRequested.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(ApprovalRequestPayload.self, from: data) {
                self.onApprovalRequested?(decoded)
            }
        }

        channel.on(AgentServerEvent.toolCall.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(ToolCallPayload.self, from: data) {
                self.onToolCall?(decoded)
            }
        }

        channel.on(AgentServerEvent.toolResult.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(ToolResultPayload.self, from: data) {
                self.onToolResult?(decoded)
            }
        }

        channel.on(AgentServerEvent.codeBlock.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(CodeBlockPayload.self, from: data) {
                self.onCodeBlock?(decoded)
            }
        }

        channel.on(AgentServerEvent.complete.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode([String: AnyCodable].self, from: data) {
                self.onComplete?(decoded)
            }
        }

        channel.on(AgentServerEvent.error.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode([String: AnyCodable].self, from: data) {
                self.onError?(decoded)
            }
        }

        channel.join()
        activeChannels[topic] = channel
        return channel
    }

    /// Join the user channel for notifications, bridge status, and conversation updates.
    @discardableResult
    public func joinUserChannel(userID: String) -> Channel {
        let topic = "user:\(userID)"
        let channel = socket.channel(topic)

        channel.on(UserServerEvent.notification.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode([String: AnyCodable].self, from: data) {
                self.onNotification?(decoded)
            }
        }

        channel.on(UserServerEvent.bridgeStatus.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(BridgeStatusPayload.self, from: data) {
                self.onBridgeStatus?(decoded)
            }
        }

        channel.on(UserServerEvent.conversationUpdated.rawValue) { [weak self] message in
            guard let self else { return }
            guard let data = self.jsonData(from: message.payload) else { return }
            if let decoded = try? JSONDecoder.raccoon.decode(Conversation.self, from: data) {
                self.onConversationUpdated?(decoded)
            }
        }

        channel.join()
        activeChannels[topic] = channel
        return channel
    }

    // MARK: - Push Methods (Client → Server)

    /// Push a new message event to the conversation channel.
    @discardableResult
    public func sendMessage(conversationID: String, content: String, type: String = "text") -> Push? {
        let topic = "conversation:\(conversationID)"
        guard let channel = activeChannels[topic] else { return nil }
        return channel.push(
            ConversationClientEvent.newMessage.rawValue,
            payload: ["content": content, "type": type]
        )
    }

    /// Push a typing indicator event to the conversation channel.
    @discardableResult
    public func sendTyping(conversationID: String, isTyping: Bool) -> Push? {
        let topic = "conversation:\(conversationID)"
        guard let channel = activeChannels[topic] else { return nil }
        return channel.push(
            ConversationClientEvent.typing.rawValue,
            payload: ["is_typing": isTyping]
        )
    }

    /// Push a read receipt event to the conversation channel.
    @discardableResult
    public func sendRead(conversationID: String, messageID: String) -> Push? {
        let topic = "conversation:\(conversationID)"
        guard let channel = activeChannels[topic] else { return nil }
        return channel.push(
            ConversationClientEvent.read.rawValue,
            payload: ["message_id": messageID]
        )
    }

    /// Push a reaction event to the conversation channel.
    @discardableResult
    public func sendReaction(conversationID: String, messageID: String, emoji: String) -> Push? {
        let topic = "conversation:\(conversationID)"
        guard let channel = activeChannels[topic] else { return nil }
        return channel.push(
            ConversationClientEvent.react.rawValue,
            payload: ["message_id": messageID, "emoji": emoji]
        )
    }

    /// Push an approval decision event to the agent channel.
    @discardableResult
    public func sendApprovalDecision(
        conversationID: String,
        requestID: String,
        decision: String,
        scope: String
    ) -> Push? {
        let topic = "agent:\(conversationID)"
        guard let channel = activeChannels[topic] else { return nil }
        return channel.push(
            AgentClientEvent.approvalDecision.rawValue,
            payload: ["request_id": requestID, "decision": decision, "scope": scope]
        )
    }

    // MARK: - Channel Lifecycle

    /// Leave a conversation channel and remove it from tracked channels.
    public func leaveConversation(id: String) {
        let topic = "conversation:\(id)"
        if let channel = activeChannels.removeValue(forKey: topic) {
            channel.leave()
        }
    }

    /// Leave a channel.
    public func leave(_ channel: Channel) {
        // Remove from tracked channels if present
        if let topic = activeChannels.first(where: { $0.value === channel })?.key {
            activeChannels.removeValue(forKey: topic)
        }
        channel.leave()
    }

    // MARK: - Private Helpers

    /// Converts a Phoenix message payload dictionary to JSON Data for decoding.
    private func jsonData(from payload: Payload) -> Data? {
        try? JSONSerialization.data(withJSONObject: payload, options: [])
    }
}
