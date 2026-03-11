import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("Response Wrapper Decoding")
struct ResponseWrapperTests {

    // MARK: - TokenResponse

    @Test("TokenResponse decodes from JSON")
    func tokenResponseDecode() throws {
        let json = """
        {
            "access_token": "jwt_access_abc",
            "refresh_token": "jwt_refresh_xyz",
            "expires_in": 7200
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(TokenResponse.self, from: json)
        #expect(resp.accessToken == "jwt_access_abc")
        #expect(resp.refreshToken == "jwt_refresh_xyz")
        #expect(resp.expiresIn == 7200)
    }

    @Test("TokenResponse round-trips through encoding")
    func tokenResponseRoundTrip() throws {
        let json = """
        {
            "access_token": "at",
            "refresh_token": "rt",
            "expires_in": 3600
        }
        """.data(using: .utf8)!
        let original = try JSONDecoder.waiagents.decode(TokenResponse.self, from: json)
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(TokenResponse.self, from: data)
        #expect(decoded.accessToken == original.accessToken)
        #expect(decoded.refreshToken == original.refreshToken)
        #expect(decoded.expiresIn == original.expiresIn)
    }

    // MARK: - AuthResponse

    @Test("AuthResponse decodes with full user and tokens")
    func authResponseFullDecode() throws {
        let json = """
        {
            "user": {
                "id": "user_auth",
                "username": "auth_user",
                "display_name": "Auth User",
                "status": "active",
                "role": "user",
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z"
            },
            "tokens": {
                "access_token": "jwt_at_123",
                "refresh_token": "jwt_rt_456",
                "expires_in": 3600
            }
        }
        """.data(using: .utf8)!

        let resp = try JSONDecoder.waiagents.decode(AuthResponse.self, from: json)
        #expect(resp.user.id == "user_auth")
        #expect(resp.user.username == "auth_user")
        #expect(resp.user.displayName == "Auth User")
        #expect(resp.tokens.accessToken == "jwt_at_123")
        #expect(resp.tokens.refreshToken == "jwt_rt_456")
        #expect(resp.tokens.expiresIn == 3600)
    }

    // MARK: - UserResponse

    @Test("UserResponse decodes wrapped user")
    func userResponseDecode() throws {
        let json = """
        {
            "user": {
                "id": "user_me",
                "username": "current_user",
                "email": "me@example.com",
                "created_at": "2026-03-01T10:00:00Z"
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(UserResponse.self, from: json)
        #expect(resp.user.id == "user_me")
        #expect(resp.user.username == "current_user")
        #expect(resp.user.email == "me@example.com")
    }

    // MARK: - MessageResponse

    @Test("MessageResponse decodes wrapped message")
    func messageResponseDecode() throws {
        let json = """
        {
            "message": {
                "id": "msg_resp",
                "conversation_id": "conv_1",
                "sender_id": "user_1",
                "sender_type": "human",
                "type": "text",
                "content": {"text": "Hello from response"},
                "created_at": "2026-03-01T10:00:00Z"
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(MessageResponse.self, from: json)
        #expect(resp.message.id == "msg_resp")
        #expect(resp.message.content.text == "Hello from response")
        #expect(resp.message.senderType == .human)
    }

    // MARK: - ConversationResponse

    @Test("ConversationResponse decodes wrapped conversation")
    func conversationResponseDecode() throws {
        let json = """
        {
            "conversation": {
                "id": "conv_resp",
                "type": "agent",
                "title": "Agent Chat",
                "agent_id": "agent_1",
                "created_at": "2026-03-01T10:00:00Z"
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(ConversationResponse.self, from: json)
        #expect(resp.conversation.id == "conv_resp")
        #expect(resp.conversation.type == .agent)
        #expect(resp.conversation.title == "Agent Chat")
        #expect(resp.conversation.agentID == "agent_1")
    }

    // MARK: - PageResponse

    @Test("PageResponse decodes wrapped page")
    func pageResponseDecode() throws {
        let json = """
        {
            "page": {
                "id": "page_resp",
                "creator_id": "user_1",
                "title": "My Page",
                "slug": "my-page",
                "r2_path": "pages/resp/index.html",
                "version": 1,
                "visibility": "public",
                "view_count": 0,
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z"
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(PageResponse.self, from: json)
        #expect(resp.page.id == "page_resp")
        #expect(resp.page.title == "My Page")
    }

    // MARK: - MagicLinkResponse

    @Test("MagicLinkResponse decodes from JSON")
    func magicLinkResponseDecode() throws {
        let json = """
        {"message": "Magic link sent to user@example.com"}
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(MagicLinkResponse.self, from: json)
        #expect(resp.message == "Magic link sent to user@example.com")
    }

    // MARK: - EmptyResponse

    @Test("EmptyResponse decodes from empty JSON object")
    func emptyResponseDecode() throws {
        let json = "{}".data(using: .utf8)!
        _ = try JSONDecoder.waiagents.decode(EmptyResponse.self, from: json)
        // No fields to verify, just confirming it doesn't throw
    }

    // MARK: - MarketplaceCategoriesResponse

    @Test("MarketplaceCategoriesResponse decodes from JSON")
    func marketplaceCategoriesResponseDecode() throws {
        let json = """
        {
            "categories": [
                {"category": "coding", "count": 42},
                {"category": "writing", "count": 15}
            ]
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(MarketplaceCategoriesResponse.self, from: json)
        #expect(resp.categories.count == 2)
        #expect(resp.categories[0].category == "coding")
        #expect(resp.categories[0].count == 42)
        #expect(resp.categories[1].category == "writing")
    }

    @Test("MarketplaceCategoriesResponse decodes empty categories array")
    func marketplaceCategoriesResponseEmpty() throws {
        let json = """
        {"categories": []}
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(MarketplaceCategoriesResponse.self, from: json)
        #expect(resp.categories.isEmpty)
    }

    // MARK: - PaginatedResponse

    @Test("PaginatedResponse decodes with hasMore true and cursor")
    func paginatedResponseWithMore() throws {
        let json = """
        {
            "items": [
                {
                    "id": "conv_1",
                    "type": "dm",
                    "title": "Chat 1",
                    "created_at": "2026-03-01T10:00:00Z"
                }
            ],
            "page_info": {
                "next_cursor": "cursor_abc",
                "has_more": true
            }
        }
        """.data(using: .utf8)!

        let resp = try JSONDecoder.waiagents.decode(PaginatedResponse<Conversation>.self, from: json)
        #expect(resp.items.count == 1)
        #expect(resp.items[0].id == "conv_1")
        #expect(resp.pageInfo.nextCursor == "cursor_abc")
        #expect(resp.pageInfo.hasMore == true)
    }

    @Test("PaginatedResponse decodes empty items list")
    func paginatedResponseEmpty() throws {
        let json = """
        {
            "items": [],
            "page_info": {
                "next_cursor": null,
                "has_more": false
            }
        }
        """.data(using: .utf8)!

        let resp = try JSONDecoder.waiagents.decode(PaginatedResponse<Message>.self, from: json)
        #expect(resp.items.isEmpty)
        #expect(resp.pageInfo.nextCursor == nil)
        #expect(resp.pageInfo.hasMore == false)
    }

    @Test("PaginatedResponse with multiple items and messages key")
    func paginatedResponseMessagesKey() throws {
        let json = """
        {
            "messages": [
                {
                    "id": "m1", "conversation_id": "c1",
                    "sender_type": "human", "type": "text",
                    "content": {"text": "hi"},
                    "created_at": "2026-03-01T10:00:00Z"
                },
                {
                    "id": "m2", "conversation_id": "c1",
                    "sender_type": "agent", "type": "text",
                    "content": {"text": "hello"},
                    "created_at": "2026-03-01T10:01:00Z"
                }
            ],
            "page_info": {
                "next_cursor": "cursor_xyz",
                "has_more": true
            }
        }
        """.data(using: .utf8)!

        let resp = try JSONDecoder.waiagents.decode(PaginatedResponse<Message>.self, from: json)
        #expect(resp.items.count == 2)
        #expect(resp.items[0].id == "m1")
        #expect(resp.items[1].id == "m2")
        #expect(resp.pageInfo.hasMore == true)
    }
}
