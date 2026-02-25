import Foundation
@preconcurrency import SwiftPhoenixClient

/// WebSocket client wrapping SwiftPhoenixClient for Phoenix Channel communication.
/// Confined to MainActor since Socket is not Sendable and UI updates drive this.
@MainActor
public final class WebSocketClient {
    private let socket: Socket
    private let baseURL: String

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
    public func joinConversation(id: String) -> Channel {
        let channel = socket.channel("conversation:\(id)")

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
        return channel
    }

    /// Join an agent channel to receive streaming AI response events.
    public func joinAgentChannel(conversationID: String) -> Channel {
        let channel = socket.channel("agent:\(conversationID)")

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
        return channel
    }

    /// Join the user channel for notifications, bridge status, and conversation updates.
    public func joinUserChannel(userID: String) -> Channel {
        let channel = socket.channel("user:\(userID)")

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
        return channel
    }

    /// Leave a channel.
    public func leave(_ channel: Channel) {
        channel.leave()
    }

    // MARK: - Private Helpers

    /// Converts a Phoenix message payload dictionary to JSON Data for decoding.
    private func jsonData(from payload: Payload) -> Data? {
        try? JSONSerialization.data(withJSONObject: payload, options: [])
    }
}
