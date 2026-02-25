import Foundation
@preconcurrency import SwiftPhoenixClient

/// WebSocket client wrapping SwiftPhoenixClient for Phoenix Channel communication.
/// Confined to MainActor since Socket is not Sendable and UI updates drive this.
@MainActor
public final class WebSocketClient {
    private let socket: Socket
    private let baseURL: String

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
        channel.join()
        return channel
    }

    /// Join an agent channel to receive streaming AI response events.
    public func joinAgentChannel(conversationID: String) -> Channel {
        let channel = socket.channel("agent:\(conversationID)")
        channel.join()
        return channel
    }

    /// Join the user channel for notifications, bridge status, and conversation updates.
    public func joinUserChannel(userID: String) -> Channel {
        let channel = socket.channel("user:\(userID)")
        channel.join()
        return channel
    }

    /// Leave a channel.
    public func leave(_ channel: Channel) {
        channel.leave()
    }
}
