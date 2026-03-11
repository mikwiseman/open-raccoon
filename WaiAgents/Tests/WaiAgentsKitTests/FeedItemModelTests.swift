import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("FeedItem Model Tests")
struct FeedItemModelTests {

    // MARK: - FeedItemType Variants

    @Test("All FeedItemType raw values match API contract")
    func feedItemTypeRawValues() {
        #expect(FeedItem.FeedItemType.agentShowcase.rawValue == "agent_showcase")
        #expect(FeedItem.FeedItemType.pageShowcase.rawValue == "page_showcase")
        #expect(FeedItem.FeedItemType.toolShowcase.rawValue == "tool_showcase")
        #expect(FeedItem.FeedItemType.remix.rawValue == "remix")
        #expect(FeedItem.FeedItemType.creation.rawValue == "creation")
    }

    @Test("All FeedItemType variants decode from JSON")
    func feedItemTypeAllVariants() throws {
        let types = ["agent_showcase", "page_showcase", "tool_showcase", "remix", "creation"]
        for typeStr in types {
            let json = """
            {
                "id": "f1", "creator_id": "u1", "type": "\(typeStr)",
                "reference_id": "r1", "reference_type": "agent",
                "quality_score": 0, "trending_score": 0,
                "like_count": 0, "fork_count": 0, "view_count": 0,
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z"
            }
            """.data(using: .utf8)!
            let item = try JSONDecoder.waiagents.decode(FeedItem.self, from: json)
            #expect(item.type.rawValue == typeStr)
        }
    }

    // MARK: - ReferenceType Variants

    @Test("All ReferenceType raw values match API contract")
    func referenceTypeRawValues() {
        #expect(FeedItem.ReferenceType.agent.rawValue == "agent")
        #expect(FeedItem.ReferenceType.page.rawValue == "page")
        #expect(FeedItem.ReferenceType.tool.rawValue == "tool")
    }

    @Test("All ReferenceType variants decode from JSON")
    func referenceTypeAllVariants() throws {
        for typeStr in ["agent", "page", "tool"] {
            let json = """
            {
                "id": "f1", "creator_id": "u1", "type": "creation",
                "reference_id": "r1", "reference_type": "\(typeStr)",
                "quality_score": 0, "trending_score": 0,
                "like_count": 0, "fork_count": 0, "view_count": 0,
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z"
            }
            """.data(using: .utf8)!
            let item = try JSONDecoder.waiagents.decode(FeedItem.self, from: json)
            #expect(item.referenceType.rawValue == typeStr)
        }
    }

    // MARK: - Full Decode

    @Test("FeedItem decodes with all optional fields")
    func feedItemFullDecode() throws {
        let json = """
        {
            "id": "feed_full",
            "creator_id": "user_1",
            "type": "agent_showcase",
            "reference_id": "agent_1",
            "reference_type": "agent",
            "title": "Amazing Agent",
            "description": "An agent that does everything",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "quality_score": 0.95,
            "trending_score": 0.88,
            "like_count": 150,
            "fork_count": 25,
            "view_count": 1000,
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-05T12:00:00Z"
        }
        """.data(using: .utf8)!

        let item = try JSONDecoder.waiagents.decode(FeedItem.self, from: json)
        #expect(item.id == "feed_full")
        #expect(item.title == "Amazing Agent")
        #expect(item.description == "An agent that does everything")
        #expect(item.thumbnailURL?.absoluteString == "https://example.com/thumb.jpg")
        #expect(item.qualityScore == 0.95)
        #expect(item.trendingScore == 0.88)
        #expect(item.likeCount == 150)
        #expect(item.forkCount == 25)
        #expect(item.viewCount == 1000)
    }

    // MARK: - Round Trip

    @Test("FeedItem round-trips through encoding and decoding")
    func feedItemRoundTrip() throws {
        let fixedDate = Date(timeIntervalSince1970: 1_000_000)
        let original = FeedItem(
            id: "feed_rt",
            creatorID: "user_rt",
            type: .remix,
            referenceID: "ref_rt",
            referenceType: .page,
            title: "Remixed Page",
            description: "A remix of a cool page",
            thumbnailURL: URL(string: "https://example.com/remix.png"),
            qualityScore: 0.75,
            trendingScore: 0.5,
            likeCount: 10,
            forkCount: 2,
            viewCount: 50,
            createdAt: fixedDate,
            updatedAt: fixedDate
        )

        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(FeedItem.self, from: data)
        #expect(decoded == original)
    }

    // MARK: - Equatable

    @Test("FeedItem equality works correctly")
    func feedItemEquality() {
        let fixedDate = Date(timeIntervalSince1970: 1_000_000)
        let a = FeedItem(id: "f1", creatorID: "u1", type: .creation, referenceID: "r1", referenceType: .agent, createdAt: fixedDate, updatedAt: fixedDate)
        let b = FeedItem(id: "f1", creatorID: "u1", type: .creation, referenceID: "r1", referenceType: .agent, createdAt: fixedDate, updatedAt: fixedDate)
        let c = FeedItem(id: "f2", creatorID: "u1", type: .creation, referenceID: "r1", referenceType: .agent, createdAt: fixedDate, updatedAt: fixedDate)
        #expect(a == b)
        #expect(a != c)
    }

    @Test("FeedItem with different likeCount is not equal")
    func feedItemLikeCountInequality() {
        let a = FeedItem(id: "f1", creatorID: "u1", type: .creation, referenceID: "r1", referenceType: .agent, likeCount: 5)
        let b = FeedItem(id: "f1", creatorID: "u1", type: .creation, referenceID: "r1", referenceType: .agent, likeCount: 10)
        #expect(a != b)
    }

    // MARK: - PaginatedResponse<FeedItem>

    @Test("PaginatedResponse<FeedItem> decodes feed listing")
    func paginatedFeedItemDecode() throws {
        let json = """
        {
            "items": [
                {
                    "id": "feed_1",
                    "creator_id": "user_1",
                    "type": "creation",
                    "reference_id": "ref_1",
                    "reference_type": "agent",
                    "like_count": 5,
                    "fork_count": 1,
                    "view_count": 20,
                    "quality_score": 0.5,
                    "trending_score": 0.3,
                    "created_at": "2026-03-01T10:00:00Z",
                    "updated_at": "2026-03-01T10:00:00Z"
                }
            ],
            "page_info": {
                "next_cursor": "feed_cursor",
                "has_more": true
            }
        }
        """.data(using: .utf8)!

        let resp = try JSONDecoder.waiagents.decode(PaginatedResponse<FeedItem>.self, from: json)
        #expect(resp.items.count == 1)
        #expect(resp.items[0].id == "feed_1")
        #expect(resp.pageInfo.hasMore == true)
        #expect(resp.pageInfo.nextCursor == "feed_cursor")
    }

    // MARK: - Sorting

    @Test("FeedItems can be sorted by trendingScore")
    func sortByTrendingScore() {
        let items = [
            FeedItem(id: "f1", creatorID: "u", type: .creation, referenceID: "r", referenceType: .agent, trendingScore: 0.5),
            FeedItem(id: "f2", creatorID: "u", type: .creation, referenceID: "r", referenceType: .agent, trendingScore: 0.9),
            FeedItem(id: "f3", creatorID: "u", type: .creation, referenceID: "r", referenceType: .agent, trendingScore: 0.1),
        ]
        let sorted = items.sorted { $0.trendingScore > $1.trendingScore }
        #expect(sorted[0].id == "f2")
        #expect(sorted[1].id == "f1")
        #expect(sorted[2].id == "f3")
    }
}
