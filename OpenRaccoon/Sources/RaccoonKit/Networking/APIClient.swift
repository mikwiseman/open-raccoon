import Foundation

public actor APIClient {
    private let baseURL: URL
    private let session: URLSession
    private let authManager: AuthManager

    public init(baseURL: URL, authManager: AuthManager) {
        self.baseURL = baseURL
        self.authManager = authManager
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
    }

    public func request<T: Decodable & Sendable>(_ endpoint: APIEndpoint) async throws -> T {
        var request = try endpoint.urlRequest(baseURL: baseURL)

        if endpoint.requiresAuth {
            let token = try await authManager.validAccessToken()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let key = endpoint.idempotencyKey {
            request.setValue(key, forHTTPHeaderField: "Idempotency-Key")
        }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }
            let errorResponse = try? JSONDecoder.raccoon.decode(APIErrorResponse.self, from: data)
            throw APIError.httpError(statusCode: httpResponse.statusCode, error: errorResponse)
        }

        do {
            return try JSONDecoder.raccoon.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    /// Perform a request that returns no response body (e.g., DELETE endpoints).
    public func requestVoid(_ endpoint: APIEndpoint) async throws {
        var request = try endpoint.urlRequest(baseURL: baseURL)

        if endpoint.requiresAuth {
            let token = try await authManager.validAccessToken()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let key = endpoint.idempotencyKey {
            request.setValue(key, forHTTPHeaderField: "Idempotency-Key")
        }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }
            let errorResponse = try? JSONDecoder.raccoon.decode(APIErrorResponse.self, from: data)
            throw APIError.httpError(statusCode: httpResponse.statusCode, error: errorResponse)
        }
    }
}
