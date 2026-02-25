import Foundation

public struct MessageContent: Codable, Sendable, Equatable {
    public var text: String?
    public var mediaURL: URL?
    public var code: String?
    public var language: String?
    public var embed: EmbedContent?

    public struct EmbedContent: Codable, Sendable, Equatable {
        public var title: String?
        public var description: String?
        public var url: URL?
        public var thumbnailURL: URL?

        enum CodingKeys: String, CodingKey {
            case title
            case description
            case url
            case thumbnailURL = "thumbnailUrl"
        }

        public init(
            title: String? = nil,
            description: String? = nil,
            url: URL? = nil,
            thumbnailURL: URL? = nil
        ) {
            self.title = title
            self.description = description
            self.url = url
            self.thumbnailURL = thumbnailURL
        }
    }

    enum CodingKeys: String, CodingKey {
        case text
        case mediaURL = "mediaUrl"
        case code
        case language
        case embed
    }

    public init(
        text: String? = nil,
        mediaURL: URL? = nil,
        code: String? = nil,
        language: String? = nil,
        embed: EmbedContent? = nil
    ) {
        self.text = text
        self.mediaURL = mediaURL
        self.code = code
        self.language = language
        self.embed = embed
    }
}
