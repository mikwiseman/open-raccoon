import Foundation

extension JSONDecoder {
    public static let waiagents: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)

            let withFractional = ISO8601DateFormatter()
            withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            let withoutFractional = ISO8601DateFormatter()
            withoutFractional.formatOptions = [.withInternetDateTime]

            if let date = withFractional.date(from: raw) ?? withoutFractional.date(from: raw) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid ISO8601 date: \(raw)"
            )
        }
        return decoder
    }()
}

extension JSONEncoder {
    public static let waiagents: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
}

enum WaiAgentsResponseDecoding {
    private static let intStringKeys: Set<String> = [
        "count",
        "expires_in",
        "fire_count",
        "fork_count",
        "interval_seconds",
        "like_count",
        "max_runs",
        "max_tokens",
        "rating_count",
        "rating_sum",
        "run_count",
        "step_index",
        "total_steps",
        "unread_count",
        "usage_count",
        "view_count"
    ]

    private static let doubleStringKeys: Set<String> = [
        "average_rating",
        "quality_score",
        "rating_avg",
        "temperature",
        "trending_score"
    ]

    private static let preferredListKeys: [String] = [
        "items",
        "conversations",
        "messages",
        "agents",
        "categories",
        "pages",
        "feed_items",
        "feed",
        "bridges",
        "crews",
        "members",
        "triggers",
        "versions"
    ]

    private static let defaultPageInfo: AnyCodable = .dictionary([
        "next_cursor": .null,
        "has_more": .bool(false)
    ])

    static func normalizeTopLevelDictionary(_ dictionary: [String: AnyCodable]) -> [String: AnyCodable] {
        guard case .dictionary(let normalized) = normalize(.dictionary(dictionary)) else {
            return dictionary
        }

        return normalized
    }

    static func decodeNormalized<T: Decodable & Sendable>(
        _ type: T.Type,
        from value: AnyCodable,
        using decoder: JSONDecoder = .waiagents
    ) throws -> T {
        let normalized = normalize(value)
        let data = try JSONEncoder().encode(normalized)
        return try decoder.decode(T.self, from: data)
    }

    private static func normalize(_ value: AnyCodable) -> AnyCodable {
        switch value {
        case .array(let array):
            return .array(array.map(normalize))
        case .dictionary(let dictionary):
            return .dictionary(normalizeDictionary(dictionary))
        default:
            return value
        }
    }

    private static func normalizeDictionary(_ dictionary: [String: AnyCodable]) -> [String: AnyCodable] {
        var normalized = dictionary.mapValues(normalize)

        for (key, value) in normalized {
            if let coerced = coerceNumericString(for: key, value: value) {
                normalized[key] = coerced
            }
        }

        if normalized["average_rating"] == nil, let ratingAverage = normalized["rating_avg"] {
            normalized["average_rating"] = coerceNumericString(for: "average_rating", value: ratingAverage) ?? ratingAverage
        }

        if normalized["items"] == nil, let listValue = firstListValue(in: normalized) {
            normalized["items"] = listValue
        }

        if normalized["items"] != nil, normalized["page_info"] == nil, normalized["pageInfo"] == nil {
            normalized["page_info"] = defaultPageInfo
        }

        return normalized
    }

    private static func firstListValue(in dictionary: [String: AnyCodable]) -> AnyCodable? {
        for key in preferredListKeys where key != "items" {
            if case .array = dictionary[key] {
                return dictionary[key]
            }
        }

        let arrayValues = dictionary
            .filter { $0.key != "page_info" && $0.key != "pageInfo" }
            .compactMap { _, value -> AnyCodable? in
                if case .array = value {
                    return value
                }
                return nil
            }

        return arrayValues.count == 1 ? arrayValues[0] : nil
    }

    private static func coerceNumericString(for key: String, value: AnyCodable) -> AnyCodable? {
        guard case .string(let raw) = value else {
            return nil
        }

        if intStringKeys.contains(key), let intValue = Int(raw) {
            return .int(intValue)
        }

        if doubleStringKeys.contains(key), let doubleValue = Double(raw) {
            return .double(doubleValue)
        }

        return nil
    }
}
