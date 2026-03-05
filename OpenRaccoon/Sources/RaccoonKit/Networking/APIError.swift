import Foundation

public enum APIError: Error, Sendable {
    case invalidResponse
    case httpError(statusCode: Int, error: APIErrorResponse?)
    case decodingError(any Error & Sendable)
    case networkError(any Error & Sendable)
    case unauthorized
}

public struct APIErrorResponse: Codable, Sendable {
    public let error: String
    public let message: String?
    public let details: ValidationDetails?

    public struct ValidationDetails: Codable, Sendable {
        public let formErrors: [String]?
        public let fieldErrors: [String: [String]]?
    }

    /// Human-readable error message: uses `message` if present,
    /// otherwise flattens validation field errors into a single string.
    public var displayMessage: String? {
        if let message { return message }
        if let fieldErrors = details?.fieldErrors {
            let messages = fieldErrors.sorted(by: { $0.key < $1.key }).flatMap { $0.value }
            if !messages.isEmpty { return messages.joined(separator: ". ") }
        }
        return nil
    }
}
