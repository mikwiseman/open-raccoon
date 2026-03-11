import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("JSON Coding Extensions")
struct JSONCodingTests {

    // MARK: - Date Decoding

    @Test("Decoder handles ISO8601 date without fractional seconds")
    func decoderISO8601WithoutFractional() throws {
        let json = """
        {"id": "c1", "type": "dm", "created_at": "2026-03-01T10:00:00Z"}
        """.data(using: .utf8)!
        let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        #expect(conv.createdAt <= Date())
    }

    @Test("Decoder handles ISO8601 date with fractional seconds")
    func decoderISO8601WithFractional() throws {
        let json = """
        {"id": "c1", "type": "dm", "created_at": "2026-03-01T10:00:00.123456Z"}
        """.data(using: .utf8)!
        let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        #expect(conv.createdAt <= Date())
    }

    @Test("Decoder handles ISO8601 date with three fractional digits")
    func decoderISO8601ThreeFractionalDigits() throws {
        let json = """
        {"id": "c1", "type": "dm", "created_at": "2026-03-01T10:00:00.123Z"}
        """.data(using: .utf8)!
        let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        #expect(conv.createdAt <= Date())
    }

    @Test("Decoder throws for invalid date string")
    func decoderInvalidDate() {
        let json = """
        {"id": "c1", "type": "dm", "created_at": "not-a-date"}
        """.data(using: .utf8)!
        #expect(throws: DecodingError.self) {
            _ = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        }
    }

    @Test("Decoder throws for date in wrong format")
    func decoderWrongDateFormat() {
        let json = """
        {"id": "c1", "type": "dm", "created_at": "03/01/2026"}
        """.data(using: .utf8)!
        #expect(throws: DecodingError.self) {
            _ = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        }
    }

    // MARK: - Key Strategy

    @Test("Decoder uses convertFromSnakeCase key strategy")
    func decoderSnakeCaseKeys() throws {
        let json = """
        {
            "id": "u1",
            "username": "alice",
            "display_name": "Alice",
            "avatar_url": "https://example.com/avatar.png",
            "last_seen_at": "2026-03-01T10:00:00Z",
            "created_at": "2026-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder.waiagents.decode(User.self, from: json)
        #expect(user.displayName == "Alice")
        #expect(user.avatarURL?.absoluteString == "https://example.com/avatar.png")
        #expect(user.lastSeenAt != nil)
    }

    @Test("Encoder uses convertToSnakeCase key strategy")
    func encoderSnakeCaseKeys() throws {
        let content = MessageContent(text: "hello")
        let data = try JSONEncoder.waiagents.encode(content)
        let json = String(data: data, encoding: .utf8)!
        // The encoder should produce snake_case keys
        #expect(!json.contains("mediaUrl"))
    }

    // MARK: - Date Encoding

    @Test("Encoder produces ISO8601 dates")
    func encoderISO8601Dates() throws {
        let conv = Conversation(id: "c1", type: .dm, title: "Test")
        let data = try JSONEncoder.waiagents.encode(conv)
        let json = String(data: data, encoding: .utf8)!
        // ISO8601 dates contain "T" and "Z"
        #expect(json.contains("T"))
        #expect(json.contains("Z"))
    }

    // MARK: - WaiAgentsResponseDecoding

    @Test("normalizeTopLevelDictionary passes through standard dictionary")
    func normalizePassthrough() {
        let input: [String: AnyCodable] = [
            "id": .string("test"),
            "name": .string("hello")
        ]
        let result = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(input)
        #expect(result["id"]?.stringValue == "test")
        #expect(result["name"]?.stringValue == "hello")
    }

    @Test("normalizeTopLevelDictionary coerces string integers to int")
    func normalizeCoercesStringIntegers() {
        let input: [String: AnyCodable] = [
            "usage_count": .string("42"),
            "rating_count": .string("10"),
            "like_count": .string("100")
        ]
        let result = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(input)
        #expect(result["usage_count"]?.intValue == 42)
        #expect(result["rating_count"]?.intValue == 10)
        #expect(result["like_count"]?.intValue == 100)
    }

    @Test("normalizeTopLevelDictionary coerces string doubles to double")
    func normalizeCoercesStringDoubles() {
        let input: [String: AnyCodable] = [
            "average_rating": .string("4.5"),
            "temperature": .string("0.7"),
            "quality_score": .string("0.85")
        ]
        let result = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(input)
        #expect(result["average_rating"]?.doubleValue != nil)
        #expect(result["temperature"]?.doubleValue != nil)
        #expect(result["quality_score"]?.doubleValue != nil)
    }

    @Test("normalizeTopLevelDictionary does not coerce non-numeric strings")
    func normalizeDoesNotCoerceNonNumeric() {
        let input: [String: AnyCodable] = [
            "usage_count": .string("not_a_number"),
            "name": .string("hello")
        ]
        let result = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(input)
        // "not_a_number" can't be parsed as Int, so it stays as string
        #expect(result["usage_count"]?.stringValue == "not_a_number")
        #expect(result["name"]?.stringValue == "hello")
    }

    @Test("normalizeTopLevelDictionary adds default pageInfo when items exist but no pageInfo")
    func normalizeAddsDefaultPageInfo() {
        let input: [String: AnyCodable] = [
            "items": .array([.dictionary(["id": .string("a1")])])
        ]
        let result = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(input)
        // Should have added page_info
        #expect(result["page_info"] != nil)
        #expect(result["page_info"]?.dictionaryValue?["has_more"]?.boolValue == false)
        #expect(result["page_info"]?.dictionaryValue?["next_cursor"]?.isNull == true)
    }

    @Test("normalizeTopLevelDictionary maps rating_avg to average_rating")
    func normalizeRatingAvgMapping() {
        let input: [String: AnyCodable] = [
            "rating_avg": .string("4.2")
        ]
        let result = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(input)
        #expect(result["average_rating"]?.doubleValue != nil)
    }

    @Test("normalizeTopLevelDictionary maps known list keys to items")
    func normalizeListKeyMapping() {
        let input: [String: AnyCodable] = [
            "conversations": .array([
                .dictionary(["id": .string("c1")])
            ])
        ]
        let result = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(input)
        // Should have mapped "conversations" to "items"
        #expect(result["items"] != nil)
    }

    @Test("normalizeTopLevelDictionary normalizes nested dictionaries recursively")
    func normalizeRecursive() {
        let input: [String: AnyCodable] = [
            "agent": .dictionary([
                "usage_count": .string("50"),
                "rating_count": .string("5")
            ])
        ]
        let result = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(input)
        let agent = result["agent"]?.dictionaryValue
        #expect(agent?["usage_count"]?.intValue == 50)
        #expect(agent?["rating_count"]?.intValue == 5)
    }

    // MARK: - NetworkSession Configuration

    @Test("NetworkSession creates ephemeral URLSession with expected timeouts")
    func networkSessionConfig() {
        let session = NetworkSession.makeURLSession()
        let config = session.configuration
        #expect(config.timeoutIntervalForRequest == 30)
        #expect(config.timeoutIntervalForResource == 60)
        #expect(config.requestCachePolicy == .reloadIgnoringLocalCacheData)
        #expect(config.urlCache == nil)
        #expect(config.httpCookieStorage == nil)
    }
}
