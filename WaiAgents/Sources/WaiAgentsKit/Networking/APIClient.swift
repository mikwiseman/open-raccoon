import Foundation

public actor APIClient {
    private let baseURL: URL
    private let session: URLSession
    private let authManager: AuthManager

    public init(baseURL: URL, authManager: AuthManager) {
        self.baseURL = baseURL
        self.authManager = authManager
        self.session = NetworkSession.makeURLSession()
    }

    public func request<T: Decodable & Sendable>(
        _ endpoint: APIEndpoint,
        hasRetried: Bool = false
    ) async throws -> T {
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
            if httpResponse.statusCode == 401 && endpoint.requiresAuth && !hasRetried {
                // Attempt one token refresh before giving up.
                // Invalidate the cached access token so validAccessToken()
                // is forced to perform a real refresh using the refresh token.
                do {
                    try await authManager.invalidateAccessToken()
                    let freshToken = try await authManager.validAccessToken()
                    var retryReq = try endpoint.urlRequest(baseURL: baseURL)
                    retryReq.setValue("Bearer \(freshToken)", forHTTPHeaderField: "Authorization")
                    if let key = endpoint.idempotencyKey {
                        retryReq.setValue(key, forHTTPHeaderField: "Idempotency-Key")
                    }
                    let (retryData, retryResp) = try await session.data(for: retryReq)
                    if let retryHttp = retryResp as? HTTPURLResponse,
                       (200...299).contains(retryHttp.statusCode) {
                        return try JSONDecoder.waiagents.decode(T.self, from: retryData)
                    }
                } catch { /* refresh failed -- fall through to clear tokens */ }
                try? await authManager.clearTokens()
                throw APIError.unauthorized
            }
            let errorResponse = try? JSONDecoder.waiagents.decode(APIErrorResponse.self, from: data)
            throw APIError.httpError(statusCode: httpResponse.statusCode, error: errorResponse)
        }

        do {
            return try JSONDecoder.waiagents.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    /// Perform a request that returns no response body (e.g., DELETE endpoints).
    public func requestVoid(_ endpoint: APIEndpoint, hasRetried: Bool = false) async throws {
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
            if httpResponse.statusCode == 401 && endpoint.requiresAuth && !hasRetried {
                do {
                    try await authManager.invalidateAccessToken()
                    let freshToken = try await authManager.validAccessToken()
                    var retryReq = try endpoint.urlRequest(baseURL: baseURL)
                    retryReq.setValue("Bearer \(freshToken)", forHTTPHeaderField: "Authorization")
                    if let key = endpoint.idempotencyKey {
                        retryReq.setValue(key, forHTTPHeaderField: "Idempotency-Key")
                    }
                    let (_, retryResp) = try await session.data(for: retryReq)
                    if let retryHttp = retryResp as? HTTPURLResponse,
                       (200...299).contains(retryHttp.statusCode) {
                        return
                    }
                } catch { /* refresh failed */ }
                try? await authManager.clearTokens()
                throw APIError.unauthorized
            }
            let errorResponse = try? JSONDecoder.waiagents.decode(APIErrorResponse.self, from: data)
            throw APIError.httpError(statusCode: httpResponse.statusCode, error: errorResponse)
        }
    }
}
