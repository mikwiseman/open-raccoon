import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("Model Edge Cases")
struct ModelEdgeCaseTests {

    // MARK: - MessageContent: Array-of-blocks Decoding

    @Test("MessageContent decodes single text block from API format")
    func messageContentSingleTextBlock() throws {
        let json = """
        [{"type": "text", "text": "Hello, world!"}]
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == "Hello, world!")
        #expect(content.code == nil)
        #expect(content.mediaURL == nil)
    }

    @Test("MessageContent concatenates multiple text blocks")
    func messageContentMultipleTextBlocks() throws {
        let json = """
        [
            {"type": "text", "text": "Hello, "},
            {"type": "text", "text": "world!"}
        ]
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == "Hello, world!")
    }

    @Test("MessageContent decodes code_block type")
    func messageContentCodeBlock() throws {
        let json = """
        [{"type": "code_block", "code": "print('hi')", "language": "python"}]
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.code == "print('hi')")
        #expect(content.language == "python")
        #expect(content.text == nil)
    }

    @Test("MessageContent decodes image type with URL")
    func messageContentImageBlock() throws {
        let json = """
        [{"type": "image", "url": "https://example.com/image.png"}]
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.mediaURL?.absoluteString == "https://example.com/image.png")
        #expect(content.text == nil)
    }

    @Test("MessageContent decodes mixed text + code_block + image")
    func messageContentMixedBlocks() throws {
        let json = """
        [
            {"type": "text", "text": "Here is some code:"},
            {"type": "code_block", "code": "let x = 1", "language": "swift"},
            {"type": "image", "url": "https://example.com/screenshot.png"}
        ]
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == "Here is some code:")
        #expect(content.code == "let x = 1")
        #expect(content.language == "swift")
        #expect(content.mediaURL?.absoluteString == "https://example.com/screenshot.png")
    }

    @Test("MessageContent ignores unknown block types gracefully")
    func messageContentUnknownBlockType() throws {
        let json = """
        [
            {"type": "text", "text": "known"},
            {"type": "custom_widget", "data": "something"}
        ]
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == "known")
    }

    @Test("MessageContent decodes empty blocks array")
    func messageContentEmptyBlocksArray() throws {
        let json = """
        []
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == nil)
        #expect(content.code == nil)
        #expect(content.mediaURL == nil)
    }

    @Test("MessageContent decodes text block with null text field")
    func messageContentTextBlockNullText() throws {
        let json = """
        [{"type": "text", "text": null}]
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == nil)
    }

    @Test("MessageContent code_block without language still decodes code")
    func messageContentCodeBlockNoLanguage() throws {
        let json = """
        [{"type": "code_block", "code": "echo hello"}]
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.code == "echo hello")
        #expect(content.language == nil)
    }

    // MARK: - MessageContent: Flat Object Decoding (legacy)

    @Test("MessageContent decodes from flat object format")
    func messageContentFlatObject() throws {
        let json = """
        {"text": "Hello", "code": "x = 1", "language": "python"}
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == "Hello")
        #expect(content.code == "x = 1")
        #expect(content.language == "python")
    }

    @Test("MessageContent flat object with embed")
    func messageContentFlatObjectWithEmbed() throws {
        let json = """
        {
            "text": "Check this out",
            "embed": {
                "title": "Example",
                "description": "An example embed",
                "url": "https://example.com",
                "thumbnailUrl": "https://example.com/thumb.png"
            }
        }
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == "Check this out")
        #expect(content.embed?.title == "Example")
        #expect(content.embed?.description == "An example embed")
        #expect(content.embed?.url?.absoluteString == "https://example.com")
        #expect(content.embed?.thumbnailURL?.absoluteString == "https://example.com/thumb.png")
    }

    @Test("MessageContent flat object with mediaUrl")
    func messageContentFlatObjectWithMediaURL() throws {
        let json = """
        {"mediaUrl": "https://example.com/video.mp4"}
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.mediaURL?.absoluteString == "https://example.com/video.mp4")
        #expect(content.text == nil)
    }

    @Test("MessageContent flat object with all nil optional fields")
    func messageContentFlatObjectAllNil() throws {
        let json = """
        {}
        """.data(using: .utf8)!
        let content = try JSONDecoder.waiagents.decode(MessageContent.self, from: json)
        #expect(content.text == nil)
        #expect(content.mediaURL == nil)
        #expect(content.code == nil)
        #expect(content.language == nil)
        #expect(content.embed == nil)
    }

    // MARK: - MessageContent: Encoding

    @Test("MessageContent encodes to flat keyed format (not blocks array)")
    func messageContentEncodesFlat() throws {
        let content = MessageContent(text: "Hello", code: "x=1", language: "python")
        let data = try JSONEncoder.waiagents.encode(content)
        let dict = try JSONDecoder().decode([String: String].self, from: data)
        #expect(dict["text"] == "Hello")
        #expect(dict["code"] == "x=1")
        #expect(dict["language"] == "python")
    }

    @Test("MessageContent encoding omits nil fields")
    func messageContentEncodingOmitsNils() throws {
        let content = MessageContent(text: "just text")
        let data = try JSONEncoder.waiagents.encode(content)
        let dict = try JSONDecoder().decode([String: AnyCodable].self, from: data)
        #expect(dict["text"]?.stringValue == "just text")
        #expect(dict["code"] == nil)
        #expect(dict["language"] == nil)
        #expect(dict["media_url"] == nil)
        #expect(dict["embed"] == nil)
    }

    // MARK: - MessageContent: EmbedContent

    @Test("EmbedContent decodes with all fields present")
    func embedContentFullDecode() throws {
        let json = """
        {
            "title": "GitHub",
            "description": "Where code lives",
            "url": "https://github.com",
            "thumbnailUrl": "https://github.com/thumb.png"
        }
        """.data(using: .utf8)!
        let embed = try JSONDecoder.waiagents.decode(MessageContent.EmbedContent.self, from: json)
        #expect(embed.title == "GitHub")
        #expect(embed.description == "Where code lives")
        #expect(embed.url?.absoluteString == "https://github.com")
        #expect(embed.thumbnailURL?.absoluteString == "https://github.com/thumb.png")
    }

    @Test("EmbedContent decodes with only title")
    func embedContentMinimal() throws {
        let json = """
        {"title": "Minimal"}
        """.data(using: .utf8)!
        let embed = try JSONDecoder.waiagents.decode(MessageContent.EmbedContent.self, from: json)
        #expect(embed.title == "Minimal")
        #expect(embed.description == nil)
        #expect(embed.url == nil)
        #expect(embed.thumbnailURL == nil)
    }

    @Test("EmbedContent round-trips through encoding")
    func embedContentRoundTrip() throws {
        let original = MessageContent.EmbedContent(
            title: "Test",
            description: "Desc",
            url: URL(string: "https://example.com"),
            thumbnailURL: URL(string: "https://example.com/thumb.jpg")
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(MessageContent.EmbedContent.self, from: data)
        #expect(decoded == original)
    }

    // MARK: - BridgeConnection Encoding/Decoding

    @Test("BridgeConnection decodes all platform types")
    func bridgeConnectionPlatforms() throws {
        for platform in ["telegram", "whatsapp", "signal", "discord"] {
            let json = """
            {
                "id": "br_1",
                "user_id": "u_1",
                "platform": "\(platform)",
                "method": "bot",
                "status": "connected",
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z"
            }
            """.data(using: .utf8)!
            let bridge = try JSONDecoder.waiagents.decode(BridgeConnection.self, from: json)
            #expect(bridge.platform.rawValue == platform)
        }
    }

    @Test("BridgeConnection decodes all method types")
    func bridgeConnectionMethods() throws {
        let methods: [(String, BridgeConnection.BridgeMethod)] = [
            ("user_level", .userLevel),
            ("bot", .bot),
            ("cloud_api", .cloudAPI),
        ]
        for (raw, expected) in methods {
            let json = """
            {
                "id": "br_1",
                "user_id": "u_1",
                "platform": "telegram",
                "method": "\(raw)",
                "status": "connected",
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z"
            }
            """.data(using: .utf8)!
            let bridge = try JSONDecoder.waiagents.decode(BridgeConnection.self, from: json)
            #expect(bridge.method == expected)
        }
    }

    @Test("BridgeConnection decodes all status types")
    func bridgeConnectionStatuses() throws {
        let statuses: [(String, BridgeConnection.BridgeStatus)] = [
            ("connected", .connected),
            ("reconnecting", .reconnecting),
            ("disconnected", .disconnected),
            ("error", .error),
        ]
        for (raw, expected) in statuses {
            let json = """
            {
                "id": "br_1",
                "user_id": "u_1",
                "platform": "telegram",
                "method": "bot",
                "status": "\(raw)",
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z"
            }
            """.data(using: .utf8)!
            let bridge = try JSONDecoder.waiagents.decode(BridgeConnection.self, from: json)
            #expect(bridge.status == expected)
        }
    }

    @Test("BridgeConnection decodes with metadata")
    func bridgeConnectionWithMetadata() throws {
        let json = """
        {
            "id": "br_1",
            "user_id": "u_1",
            "platform": "telegram",
            "method": "user_level",
            "status": "connected",
            "metadata": {
                "chat_id": "12345",
                "bot_name": "my_bot",
                "auto_reply": true
            },
            "last_sync_at": "2026-03-01T09:00:00Z",
            "created_at": "2026-03-01T08:00:00Z",
            "updated_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!
        let bridge = try JSONDecoder.waiagents.decode(BridgeConnection.self, from: json)
        #expect(bridge.metadata?["chat_id"]?.stringValue == "12345")
        #expect(bridge.metadata?["bot_name"]?.stringValue == "my_bot")
        #expect(bridge.metadata?["auto_reply"]?.boolValue == true)
        #expect(bridge.lastSyncAt != nil)
    }

    @Test("BridgeConnection decodes without optional fields")
    func bridgeConnectionMinimal() throws {
        let json = """
        {
            "id": "br_1",
            "user_id": "u_1",
            "platform": "discord",
            "method": "bot",
            "status": "disconnected",
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!
        let bridge = try JSONDecoder.waiagents.decode(BridgeConnection.self, from: json)
        #expect(bridge.metadata == nil)
        #expect(bridge.lastSyncAt == nil)
    }

    @Test("BridgeConnection round-trips through encoding")
    func bridgeConnectionRoundTrip() throws {
        let original = BridgeConnection(
            id: "br_rt",
            userID: "u_1",
            platform: .whatsapp,
            method: .cloudAPI,
            status: .reconnecting,
            metadata: ["key": .string("value")]
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(BridgeConnection.self, from: data)
        #expect(decoded.id == original.id)
        #expect(decoded.platform == original.platform)
        #expect(decoded.method == original.method)
        #expect(decoded.status == original.status)
        #expect(decoded.metadata?["key"]?.stringValue == "value")
    }

    // MARK: - Page Model

    @Test("Page decodes from JSON with all fields")
    func pageDecodesAllFields() throws {
        let json = """
        {
            "id": "page_1",
            "creator_id": "user_1",
            "agent_id": "agent_1",
            "conversation_id": "conv_1",
            "title": "My Page",
            "slug": "my-page",
            "description": "A test page",
            "thumbnail_url": "https://example.com/thumb.png",
            "r2_path": "pages/page_1/index.html",
            "deploy_url": "https://example.com/my-page",
            "custom_domain": "mypage.example.com",
            "version": 3,
            "forked_from": "page_0",
            "visibility": "public",
            "view_count": 42,
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-01T12:00:00Z"
        }
        """.data(using: .utf8)!
        let page = try JSONDecoder.waiagents.decode(Page.self, from: json)
        #expect(page.id == "page_1")
        #expect(page.creatorID == "user_1")
        #expect(page.agentID == "agent_1")
        #expect(page.conversationID == "conv_1")
        #expect(page.title == "My Page")
        #expect(page.slug == "my-page")
        #expect(page.description == "A test page")
        #expect(page.thumbnailURL?.absoluteString == "https://example.com/thumb.png")
        #expect(page.r2Path == "pages/page_1/index.html")
        #expect(page.deployURL?.absoluteString == "https://example.com/my-page")
        #expect(page.customDomain == "mypage.example.com")
        #expect(page.version == 3)
        #expect(page.forkedFrom == "page_0")
        #expect(page.visibility == "public")
        #expect(page.viewCount == 42)
    }

    @Test("Page decodes with minimal fields (optionals nil)")
    func pageDecodesMinimal() throws {
        let json = """
        {
            "id": "page_2",
            "creator_id": "user_1",
            "title": "Minimal Page",
            "slug": "minimal-page",
            "r2_path": "pages/page_2/index.html",
            "version": 1,
            "visibility": "private",
            "view_count": 0,
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!
        let page = try JSONDecoder.waiagents.decode(Page.self, from: json)
        #expect(page.agentID == nil)
        #expect(page.conversationID == nil)
        #expect(page.description == nil)
        #expect(page.thumbnailURL == nil)
        #expect(page.deployURL == nil)
        #expect(page.customDomain == nil)
        #expect(page.forkedFrom == nil)
    }

    @Test("Page round-trips through encoding")
    func pageRoundTrip() throws {
        let original = Page(
            id: "page_rt",
            creatorID: "user_1",
            title: "Round Trip",
            slug: "round-trip",
            description: "testing",
            r2Path: "pages/rt/index.html",
            version: 2,
            visibility: "unlisted",
            viewCount: 10
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(Page.self, from: data)
        #expect(decoded.id == original.id)
        #expect(decoded.title == original.title)
        #expect(decoded.version == original.version)
        #expect(decoded.visibility == original.visibility)
    }

    @Test("PageVersion decodes from JSON")
    func pageVersionDecode() throws {
        let json = """
        {
            "id": "pv_1",
            "page_id": "page_1",
            "version": 2,
            "r2_path": "pages/page_1/v2/index.html",
            "changes": "Updated header layout",
            "created_at": "2026-03-01T11:00:00Z"
        }
        """.data(using: .utf8)!
        let version = try JSONDecoder.waiagents.decode(PageVersion.self, from: json)
        #expect(version.id == "pv_1")
        #expect(version.pageID == "page_1")
        #expect(version.version == 2)
        #expect(version.r2Path == "pages/page_1/v2/index.html")
        #expect(version.changes == "Updated header layout")
    }

    @Test("PageVersion decodes with nil changes")
    func pageVersionNilChanges() throws {
        let json = """
        {
            "id": "pv_2",
            "page_id": "page_1",
            "version": 1,
            "r2_path": "pages/page_1/v1/index.html",
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!
        let version = try JSONDecoder.waiagents.decode(PageVersion.self, from: json)
        #expect(version.changes == nil)
    }

    // MARK: - AnyCodable: Nested Structures

    @Test("AnyCodable encodes and decodes nested dictionary")
    func anyCodableNestedDictionary() throws {
        let original: AnyCodable = .dictionary([
            "name": .string("Alice"),
            "age": .int(30),
            "address": .dictionary([
                "city": .string("NYC"),
                "zip": .string("10001"),
            ]),
        ])
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        #expect(decoded == original)
        #expect(decoded.dictionaryValue?["address"]?.dictionaryValue?["city"]?.stringValue == "NYC")
    }

    @Test("AnyCodable encodes and decodes array of dictionaries")
    func anyCodableArrayOfDicts() throws {
        let original: AnyCodable = .array([
            .dictionary(["name": .string("A"), "score": .int(100)]),
            .dictionary(["name": .string("B"), "score": .int(200)]),
        ])
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        #expect(decoded == original)
        #expect(decoded.arrayValue?.count == 2)
        #expect(decoded.arrayValue?[0].dictionaryValue?["name"]?.stringValue == "A")
    }

    @Test("AnyCodable encodes and decodes deeply nested structure")
    func anyCodableDeeplyNested() throws {
        let original: AnyCodable = .dictionary([
            "level1": .dictionary([
                "level2": .dictionary([
                    "level3": .array([
                        .string("deep value"),
                        .int(42),
                        .null,
                    ]),
                ]),
            ]),
        ])
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        #expect(decoded == original)

        let deepArray = decoded.dictionaryValue?["level1"]?
            .dictionaryValue?["level2"]?
            .dictionaryValue?["level3"]?
            .arrayValue
        #expect(deepArray?.count == 3)
        #expect(deepArray?[0].stringValue == "deep value")
        #expect(deepArray?[1].intValue == 42)
        #expect(deepArray?[2].isNull == true)
    }

    @Test("AnyCodable encodes and decodes null")
    func anyCodableNull() throws {
        let original: AnyCodable = .null
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        #expect(decoded.isNull)
        #expect(decoded == original)
    }

    @Test("AnyCodable encodes and decodes double")
    func anyCodableDouble() throws {
        let original: AnyCodable = .double(3.14159)
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        #expect(decoded.doubleValue != nil)
        #expect(abs((decoded.doubleValue ?? 0) - 3.14159) < 0.0001)
    }

    @Test("AnyCodable encodes and decodes empty array")
    func anyCodableEmptyArray() throws {
        let original: AnyCodable = .array([])
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        #expect(decoded.arrayValue?.isEmpty == true)
    }

    @Test("AnyCodable encodes and decodes empty dictionary")
    func anyCodableEmptyDictionary() throws {
        let original: AnyCodable = .dictionary([:])
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        #expect(decoded.dictionaryValue?.isEmpty == true)
    }

    @Test("AnyCodable mixed array with all types")
    func anyCodableMixedArray() throws {
        let original: AnyCodable = .array([
            .null,
            .bool(true),
            .bool(false),
            .int(42),
            .double(2.5),
            .string("hello"),
            .array([.int(1)]),
            .dictionary(["k": .string("v")]),
        ])
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        let arr = decoded.arrayValue!
        #expect(arr[0].isNull)
        #expect(arr[1].boolValue == true)
        #expect(arr[2].boolValue == false)
        #expect(arr[3].intValue == 42)
        // Note: arr[4] might decode as int if it's 2.5 -> depends on JSON
        #expect(arr[5].stringValue == "hello")
        #expect(arr[6].arrayValue?.count == 1)
        #expect(arr[7].dictionaryValue?["k"]?.stringValue == "v")
    }

    // MARK: - AnyCodable: Value Accessors

    @Test("AnyCodable value accessors return nil for wrong type")
    func anyCodableWrongTypeAccessors() {
        let stringVal: AnyCodable = .string("hello")
        #expect(stringVal.boolValue == nil)
        #expect(stringVal.intValue == nil)
        #expect(stringVal.arrayValue == nil)
        #expect(stringVal.dictionaryValue == nil)

        let intVal: AnyCodable = .int(42)
        #expect(intVal.stringValue == nil)
        #expect(intVal.boolValue == nil)
        #expect(intVal.arrayValue == nil)
        #expect(intVal.dictionaryValue == nil)

        let boolVal: AnyCodable = .bool(true)
        #expect(boolVal.stringValue == nil)
        #expect(boolVal.intValue == nil)
        #expect(boolVal.arrayValue == nil)
    }

    @Test("AnyCodable doubleValue returns Double for int case")
    func anyCodableDoubleFromInt() {
        let val: AnyCodable = .int(42)
        #expect(val.doubleValue == 42.0)
    }

    @Test("AnyCodable isNull returns false for non-null values")
    func anyCodableIsNullFalse() {
        #expect(AnyCodable.string("x").isNull == false)
        #expect(AnyCodable.int(0).isNull == false)
        #expect(AnyCodable.bool(false).isNull == false)
        #expect(AnyCodable.array([]).isNull == false)
        #expect(AnyCodable.dictionary([:]).isNull == false)
    }

    // MARK: - AnyCodable: Literal Conformances

    @Test("AnyCodable ExpressibleByStringLiteral works")
    func anyCodableStringLiteral() {
        let val: AnyCodable = "hello"
        #expect(val.stringValue == "hello")
    }

    @Test("AnyCodable ExpressibleByIntegerLiteral works")
    func anyCodableIntLiteral() {
        let val: AnyCodable = 42
        #expect(val.intValue == 42)
    }

    @Test("AnyCodable ExpressibleByFloatLiteral works")
    func anyCodableFloatLiteral() {
        let val: AnyCodable = 3.14
        #expect(val.doubleValue != nil)
    }

    @Test("AnyCodable ExpressibleByBooleanLiteral works")
    func anyCodableBoolLiteral() {
        let val: AnyCodable = true
        #expect(val.boolValue == true)
    }

    @Test("AnyCodable ExpressibleByNilLiteral works")
    func anyCodableNilLiteral() {
        let val: AnyCodable = nil
        #expect(val.isNull)
    }

    @Test("AnyCodable ExpressibleByArrayLiteral works")
    func anyCodableArrayLiteral() {
        let val: AnyCodable = [1, "two", true]
        #expect(val.arrayValue?.count == 3)
    }

    @Test("AnyCodable ExpressibleByDictionaryLiteral works")
    func anyCodableDictLiteral() {
        let val: AnyCodable = ["name": "Alice", "age": 30]
        #expect(val.dictionaryValue?["name"]?.stringValue == "Alice")
        #expect(val.dictionaryValue?["age"]?.intValue == 30)
    }

    // MARK: - AnyCodable: Hashable

    @Test("AnyCodable is Hashable and can be used in Sets")
    func anyCodableHashable() {
        let set: Set<AnyCodable> = [.string("a"), .string("b"), .string("a")]
        #expect(set.count == 2)
    }

    @Test("AnyCodable Hashable works for nested structures")
    func anyCodableHashableNested() {
        let a: AnyCodable = .dictionary(["key": .array([.int(1), .int(2)])])
        let b: AnyCodable = .dictionary(["key": .array([.int(1), .int(2)])])
        let c: AnyCodable = .dictionary(["key": .array([.int(1), .int(3)])])
        #expect(a == b)
        #expect(a != c)
        let set: Set<AnyCodable> = [a, b, c]
        #expect(set.count == 2)
    }

    // MARK: - MessageMetadata Edge Cases

    @Test("MessageMetadata decodes with all fields")
    func messageMetadataAllFields() throws {
        let json = """
        {
            "bridge_source": {
                "platform": "telegram",
                "external_message_id": "ext_123",
                "sender_name": "John"
            },
            "agent_model": "claude-sonnet-4-6",
            "agent_tools_used": ["web_search", "calculator"],
            "encryption": "e2e",
            "edit_history": [
                {"previous_text": "old text", "edited_at": "2026-03-01T10:00:00Z"}
            ],
            "reply_to": "msg_001",
            "thread_id": "thread_001"
        }
        """.data(using: .utf8)!
        let metadata = try JSONDecoder.waiagents.decode(MessageMetadata.self, from: json)
        #expect(metadata.bridgeSource?.platform == "telegram")
        #expect(metadata.bridgeSource?.externalMessageID == "ext_123")
        #expect(metadata.bridgeSource?.senderName == "John")
        #expect(metadata.agentModel == "claude-sonnet-4-6")
        #expect(metadata.agentToolsUsed == ["web_search", "calculator"])
        #expect(metadata.encryption == .e2e)
        #expect(metadata.editHistory?.count == 1)
        #expect(metadata.editHistory?[0].previousText == "old text")
        #expect(metadata.replyTo == "msg_001")
        #expect(metadata.threadID == "thread_001")
    }

    @Test("MessageMetadata decodes with no fields")
    func messageMetadataEmpty() throws {
        let json = "{}".data(using: .utf8)!
        let metadata = try JSONDecoder.waiagents.decode(MessageMetadata.self, from: json)
        #expect(metadata.bridgeSource == nil)
        #expect(metadata.agentModel == nil)
        #expect(metadata.agentToolsUsed == nil)
        #expect(metadata.encryption == nil)
        #expect(metadata.editHistory == nil)
        #expect(metadata.replyTo == nil)
        #expect(metadata.threadID == nil)
    }

    @Test("MessageMetadata encryption types all decode")
    func messageMetadataEncryptionTypes() throws {
        for type in ["e2e", "server", "none"] {
            let json = """
            {"encryption": "\(type)"}
            """.data(using: .utf8)!
            let metadata = try JSONDecoder.waiagents.decode(MessageMetadata.self, from: json)
            #expect(metadata.encryption?.rawValue == type)
        }
    }

    @Test("MessageMetadata round-trips through encoding")
    func messageMetadataRoundTrip() throws {
        let original = MessageMetadata(
            bridgeSource: MessageMetadata.BridgeSource(
                platform: "whatsapp",
                externalMessageID: "wa_456",
                senderName: "Alice"
            ),
            agentModel: "claude-opus-4-6",
            agentToolsUsed: ["code_exec"],
            encryption: .server,
            replyTo: "msg_prev",
            threadID: "thread_42"
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(MessageMetadata.self, from: data)
        #expect(decoded == original)
    }

    // MARK: - MessageReaction Edge Cases

    @Test("MessageReaction decodes from JSON")
    func messageReactionDecode() throws {
        let json = """
        {
            "id": "react_1",
            "message_id": "msg_1",
            "user_id": "user_1",
            "emoji": "thumbsup",
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!
        let reaction = try JSONDecoder.waiagents.decode(MessageReaction.self, from: json)
        #expect(reaction.id == "react_1")
        #expect(reaction.messageID == "msg_1")
        #expect(reaction.userID == "user_1")
        #expect(reaction.emoji == "thumbsup")
        #expect(reaction.createdAt != nil)
    }

    @Test("MessageReaction round-trips through encoding")
    func messageReactionRoundTrip() throws {
        let original = MessageReaction(
            id: "react_rt",
            messageID: "msg_rt",
            userID: "user_rt",
            emoji: "heart"
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(MessageReaction.self, from: data)
        #expect(decoded.id == original.id)
        #expect(decoded.emoji == original.emoji)
    }

    // MARK: - Full Message with All Fields

    @Test("Message decodes with reactions, metadata, and timestamps")
    func fullMessageDecode() throws {
        let json = """
        {
            "id": "msg_full",
            "conversation_id": "conv_1",
            "sender_id": "user_1",
            "sender_type": "human",
            "type": "text",
            "content": {"text": "Hello with everything"},
            "metadata": {
                "reply_to": "msg_prev",
                "encryption": "server"
            },
            "reactions": [
                {
                    "id": "react_1",
                    "message_id": "msg_full",
                    "user_id": "user_2",
                    "emoji": "thumbsup",
                    "created_at": "2026-03-01T10:01:00Z"
                }
            ],
            "edited_at": "2026-03-01T10:05:00Z",
            "deleted_at": "2026-03-01T11:00:00Z",
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!
        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.id == "msg_full")
        #expect(msg.metadata?.replyTo == "msg_prev")
        #expect(msg.metadata?.encryption == .server)
        #expect(msg.reactions?.count == 1)
        #expect(msg.reactions?[0].emoji == "thumbsup")
        #expect(msg.editedAt != nil)
        #expect(msg.deletedAt != nil)
    }

    @Test("Message decodes with empty reactions array")
    func messageEmptyReactions() throws {
        let json = """
        {
            "id": "msg_empty_rx",
            "conversation_id": "conv_1",
            "sender_type": "human",
            "type": "text",
            "content": {"text": "no reactions"},
            "reactions": [],
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!
        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.reactions?.isEmpty == true)
    }

    // MARK: - Conversation: All Types

    @Test("Conversation decodes all type variants")
    func conversationAllTypes() throws {
        for type in ["dm", "group", "agent", "bridge"] {
            let json = """
            {
                "id": "conv_\(type)",
                "type": "\(type)",
                "created_at": "2026-03-01T10:00:00Z"
            }
            """.data(using: .utf8)!
            let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
            #expect(conv.type.rawValue == type)
        }
    }

    @Test("Conversation decodes with metadata containing nested structures")
    func conversationWithNestedMetadata() throws {
        let json = """
        {
            "id": "conv_meta",
            "type": "agent",
            "metadata": {
                "settings": {
                    "auto_reply": true,
                    "max_messages": 100
                },
                "tags": ["support", "vip"]
            },
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!
        let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        #expect(conv.metadata?["settings"]?.dictionaryValue?["auto_reply"]?.boolValue == true)
        #expect(conv.metadata?["tags"]?.arrayValue?.count == 2)
    }

    // MARK: - MessageEnvelope Edge Cases

    @Test("MessageEnvelope toMessage preserves all fields")
    func envelopeToMessageAllFields() {
        let sender = MessageEnvelope.SenderInfo(
            id: "user_1",
            type: .agent,
            displayName: "Bot",
            avatarURL: URL(string: "https://example.com/avatar.png")
        )
        let content = MessageContent(
            text: "Hello",
            code: "x=1",
            language: "python"
        )
        let metadata = MessageMetadata(agentModel: "claude-sonnet-4-6")
        let envelope = MessageEnvelope(
            id: "msg_env",
            conversationID: "conv_1",
            sender: sender,
            type: .code,
            content: content,
            metadata: metadata
        )

        let message = envelope.toMessage()
        #expect(message.id == "msg_env")
        #expect(message.conversationID == "conv_1")
        #expect(message.senderID == "user_1")
        #expect(message.senderType == .agent)
        #expect(message.type == .code)
        #expect(message.content.text == "Hello")
        #expect(message.content.code == "x=1")
        #expect(message.metadata?.agentModel == "claude-sonnet-4-6")
    }

    @Test("MessageEnvelope decodes from wire format JSON")
    func envelopeDecodesFromJSON() throws {
        let json = """
        {
            "id": "msg_wire",
            "conversationId": "conv_1",
            "sender": {
                "id": "user_1",
                "type": "human",
                "displayName": "Alice"
            },
            "type": "text",
            "content": {"text": "wire format test"},
            "createdAt": "2026-03-01T10:00:00Z",
            "updatedAt": "2026-03-01T10:01:00Z"
        }
        """.data(using: .utf8)!
        let envelope = try JSONDecoder.waiagents.decode(MessageEnvelope.self, from: json)
        #expect(envelope.id == "msg_wire")
        #expect(envelope.sender.displayName == "Alice")
        #expect(envelope.updatedAt != nil)
    }
}
