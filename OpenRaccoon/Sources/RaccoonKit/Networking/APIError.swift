import Foundation

public enum APIError: Error, Sendable {
    case invalidResponse
    case httpError(statusCode: Int, error: APIErrorResponse?)
    case decodingError(any Error & Sendable)
    case networkError(any Error & Sendable)
    case unauthorized
}

public struct APIErrorResponse: Codable, Sendable {
    public let error: ErrorDetail

    public struct ErrorDetail: Codable, Sendable {
        public let code: String
        public let message: String
        public let details: [String: AnyCodable]?

        public init(code: String, message: String, details: [String: AnyCodable]? = nil) {
            self.code = code
            self.message = message
            self.details = details
        }
    }

    public init(error: ErrorDetail) {
        self.error = error
    }
}
