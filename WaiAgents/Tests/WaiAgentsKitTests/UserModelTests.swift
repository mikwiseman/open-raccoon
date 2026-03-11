import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("User Model Encoding/Decoding")
struct UserModelTests {

    // MARK: - Full Decode

    @Test("User decodes from JSON with all fields present")
    func userDecodesAllFields() throws {
        let json = """
        {
            "id": "user_full",
            "username": "alice",
            "display_name": "Alice Wonderland",
            "email": "alice@example.com",
            "avatar_url": "https://example.com/avatar.png",
            "bio": "Software engineer",
            "status": "active",
            "role": "admin",
            "settings": {
                "theme": "dark",
                "notifications_enabled": true
            },
            "last_seen_at": "2026-03-10T14:00:00Z",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-03-01T12:00:00Z"
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder.waiagents.decode(User.self, from: json)
        #expect(user.id == "user_full")
        #expect(user.username == "alice")
        #expect(user.displayName == "Alice Wonderland")
        #expect(user.email == "alice@example.com")
        #expect(user.avatarURL?.absoluteString == "https://example.com/avatar.png")
        #expect(user.bio == "Software engineer")
        #expect(user.status == .active)
        #expect(user.role == .admin)
        #expect(user.settings?["theme"]?.stringValue == "dark")
        #expect(user.settings?["notifications_enabled"]?.boolValue == true)
        #expect(user.lastSeenAt != nil)
        #expect(user.createdAt <= Date())
        #expect(user.updatedAt != nil)
    }

    // MARK: - Minimal Decode

    @Test("User decodes with only required fields")
    func userDecodesMinimal() throws {
        let json = """
        {
            "id": "user_min",
            "username": "bob",
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder.waiagents.decode(User.self, from: json)
        #expect(user.id == "user_min")
        #expect(user.username == "bob")
        #expect(user.displayName == nil)
        #expect(user.email == nil)
        #expect(user.avatarURL == nil)
        #expect(user.bio == nil)
        #expect(user.status == nil)
        #expect(user.role == nil)
        #expect(user.settings == nil)
        #expect(user.lastSeenAt == nil)
    }

    // MARK: - All Status Variants

    @Test("User decodes all status variants")
    func userStatusVariants() throws {
        for (raw, expected) in [("active", User.UserStatus.active),
                                ("suspended", User.UserStatus.suspended),
                                ("deleted", User.UserStatus.deleted)] {
            let json = """
            {"id": "u", "username": "u", "status": "\(raw)", "created_at": "2026-01-01T00:00:00Z"}
            """.data(using: .utf8)!
            let user = try JSONDecoder.waiagents.decode(User.self, from: json)
            #expect(user.status == expected)
        }
    }

    // MARK: - All Role Variants

    @Test("User decodes all role variants")
    func userRoleVariants() throws {
        for (raw, expected) in [("user", User.UserRole.user),
                                ("admin", User.UserRole.admin),
                                ("moderator", User.UserRole.moderator)] {
            let json = """
            {"id": "u", "username": "u", "role": "\(raw)", "created_at": "2026-01-01T00:00:00Z"}
            """.data(using: .utf8)!
            let user = try JSONDecoder.waiagents.decode(User.self, from: json)
            #expect(user.role == expected)
        }
    }

    // MARK: - Round Trip

    @Test("User round-trips through encoding and decoding")
    func userRoundTrip() throws {
        let original = User(
            id: "user_rt",
            username: "round_trip",
            displayName: "RT User",
            email: "rt@example.com",
            bio: "Testing round trip",
            status: .active,
            role: .user
        )

        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(User.self, from: data)
        #expect(decoded.id == original.id)
        #expect(decoded.username == original.username)
        #expect(decoded.displayName == original.displayName)
        #expect(decoded.email == original.email)
        #expect(decoded.bio == original.bio)
        #expect(decoded.status == original.status)
        #expect(decoded.role == original.role)
    }

    // MARK: - Equatable

    @Test("User equality compares all fields")
    func userEquality() {
        let fixedDate = Date(timeIntervalSince1970: 1_000_000)
        let a = User(id: "u1", username: "alice", createdAt: fixedDate, updatedAt: fixedDate)
        let b = User(id: "u1", username: "alice", createdAt: fixedDate, updatedAt: fixedDate)
        let c = User(id: "u2", username: "alice", createdAt: fixedDate, updatedAt: fixedDate)
        #expect(a == b)
        #expect(a != c)
    }

    @Test("User with different displayName is not equal")
    func userDisplayNameInequality() {
        let a = User(id: "u1", username: "alice", displayName: "Alice")
        let b = User(id: "u1", username: "alice", displayName: "Bob")
        #expect(a != b)
    }

    // MARK: - User with Settings

    @Test("User with nested settings decodes correctly")
    func userWithNestedSettings() throws {
        let json = """
        {
            "id": "u1",
            "username": "config_user",
            "settings": {
                "preferences": {
                    "language": "en",
                    "timezone": "UTC"
                },
                "limits": {
                    "max_agents": 5
                }
            },
            "created_at": "2026-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder.waiagents.decode(User.self, from: json)
        #expect(user.settings?["preferences"]?.dictionaryValue?["language"]?.stringValue == "en")
        #expect(user.settings?["limits"]?.dictionaryValue?["max_agents"]?.intValue == 5)
    }
}
