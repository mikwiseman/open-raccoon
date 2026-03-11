import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("APIError Edge Cases")
struct APIErrorEdgeCaseTests {

    // MARK: - APIError Case Construction

    @Test("APIError.invalidResponse can be constructed")
    func invalidResponseCase() {
        let error = APIError.invalidResponse
        if case .invalidResponse = error {
            // pass
        } else {
            Issue.record("Expected .invalidResponse")
        }
    }

    @Test("APIError.unauthorized can be constructed")
    func unauthorizedCase() {
        let error = APIError.unauthorized
        if case .unauthorized = error {
            // pass
        } else {
            Issue.record("Expected .unauthorized")
        }
    }

    @Test("APIError.httpError stores statusCode and error response")
    func httpErrorCase() {
        let errorResponse = APIErrorResponse(
            error: "bad_request",
            message: "Missing field",
            details: nil
        )
        let error = APIError.httpError(statusCode: 400, error: errorResponse)
        if case .httpError(let code, let resp) = error {
            #expect(code == 400)
            #expect(resp?.error == "bad_request")
            #expect(resp?.message == "Missing field")
        } else {
            Issue.record("Expected .httpError")
        }
    }

    @Test("APIError.httpError with nil error response")
    func httpErrorNilResponse() {
        let error = APIError.httpError(statusCode: 500, error: nil)
        if case .httpError(let code, let resp) = error {
            #expect(code == 500)
            #expect(resp == nil)
        } else {
            Issue.record("Expected .httpError")
        }
    }

    @Test("APIError.decodingError wraps an underlying error")
    func decodingErrorCase() {
        struct TestError: Error, Sendable {}
        let error = APIError.decodingError(TestError())
        if case .decodingError = error {
            // pass
        } else {
            Issue.record("Expected .decodingError")
        }
    }

    @Test("APIError.networkError wraps an underlying error")
    func networkErrorCase() {
        struct NetError: Error, Sendable {}
        let error = APIError.networkError(NetError())
        if case .networkError = error {
            // pass
        } else {
            Issue.record("Expected .networkError")
        }
    }

    // MARK: - APIError is Error conformant

    @Test("APIError conforms to Error protocol")
    func apiErrorIsError() {
        let error: any Error = APIError.invalidResponse
        #expect(error is APIError)
    }

    @Test("APIError conforms to Sendable")
    func apiErrorIsSendable() {
        let error: any Sendable = APIError.unauthorized
        #expect(error is APIError)
    }

    // MARK: - APIErrorResponse Decoding

    @Test("APIErrorResponse decodes minimal JSON with only error field")
    func apiErrorResponseMinimal() throws {
        let json = """
        {"error": "not_found"}
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.error == "not_found")
        #expect(resp.message == nil)
        #expect(resp.details == nil)
    }

    @Test("APIErrorResponse decodes with error and message")
    func apiErrorResponseWithMessage() throws {
        let json = """
        {"error": "validation_error", "message": "Email is invalid"}
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.error == "validation_error")
        #expect(resp.message == "Email is invalid")
    }

    @Test("APIErrorResponse decodes with form errors")
    func apiErrorResponseWithFormErrors() throws {
        let json = """
        {
            "error": "validation_error",
            "details": {
                "form_errors": ["Form is incomplete", "Terms not accepted"]
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.details?.formErrors?.count == 2)
        #expect(resp.details?.formErrors?[0] == "Form is incomplete")
    }

    @Test("APIErrorResponse decodes with field errors")
    func apiErrorResponseWithFieldErrors() throws {
        let json = """
        {
            "error": "validation_error",
            "details": {
                "field_errors": {
                    "email": ["Email is required", "Email format invalid"],
                    "password": ["Password too short"]
                }
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.details?.fieldErrors?["email"]?.count == 2)
        #expect(resp.details?.fieldErrors?["password"]?.count == 1)
    }

    @Test("APIErrorResponse decodes with both form errors and field errors")
    func apiErrorResponseWithBothErrorTypes() throws {
        let json = """
        {
            "error": "validation_error",
            "details": {
                "form_errors": ["General error"],
                "field_errors": {
                    "username": ["Username taken"]
                }
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.details?.formErrors?.count == 1)
        #expect(resp.details?.fieldErrors?["username"]?.count == 1)
    }

    @Test("APIErrorResponse decodes with empty details object")
    func apiErrorResponseEmptyDetails() throws {
        let json = """
        {
            "error": "validation_error",
            "details": {}
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.details?.formErrors == nil)
        #expect(resp.details?.fieldErrors == nil)
    }

    // MARK: - displayMessage Logic

    @Test("displayMessage returns message when message field is present")
    func displayMessageReturnsMessage() throws {
        let json = """
        {"error": "e", "message": "Human readable error"}
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.displayMessage == "Human readable error")
    }

    @Test("displayMessage returns nil when neither message nor field errors present")
    func displayMessageReturnsNilWithoutMessageOrFieldErrors() throws {
        let json = """
        {"error": "internal_error"}
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.displayMessage == nil)
    }

    @Test("displayMessage returns nil when details exists but has no field errors")
    func displayMessageNilWithEmptyDetails() throws {
        let json = """
        {"error": "e", "details": {"form_errors": ["some form error"]}}
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        // displayMessage does NOT use formErrors, only message and fieldErrors
        #expect(resp.displayMessage == nil)
    }

    @Test("displayMessage flattens field errors from multiple fields sorted by key")
    func displayMessageFlattensFieldErrors() throws {
        let json = """
        {
            "error": "validation_error",
            "details": {
                "field_errors": {
                    "username": ["Username required"],
                    "email": ["Email invalid", "Email taken"],
                    "password": ["Too short"]
                }
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        let msg = resp.displayMessage!
        // Sorted by key: email, password, username
        #expect(msg.contains("Email invalid"))
        #expect(msg.contains("Email taken"))
        #expect(msg.contains("Too short"))
        #expect(msg.contains("Username required"))
        // Verify order: email errors come before password, password before username
        let emailRange = msg.range(of: "Email invalid")!
        let passwordRange = msg.range(of: "Too short")!
        let usernameRange = msg.range(of: "Username required")!
        #expect(emailRange.lowerBound < passwordRange.lowerBound)
        #expect(passwordRange.lowerBound < usernameRange.lowerBound)
    }

    @Test("displayMessage returns nil when field errors dict is empty")
    func displayMessageNilWithEmptyFieldErrors() throws {
        let json = """
        {
            "error": "e",
            "details": {"field_errors": {}}
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        // Empty dict -> no messages -> displayMessage returns nil
        #expect(resp.displayMessage == nil)
    }

    @Test("displayMessage prefers message over field errors")
    func displayMessagePrefersMessage() throws {
        let json = """
        {
            "error": "validation_error",
            "message": "Direct message",
            "details": {
                "field_errors": {
                    "email": ["Should not appear"]
                }
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.displayMessage == "Direct message")
    }

    @Test("displayMessage joins multiple field error values with period separator")
    func displayMessagePeriodSeparator() throws {
        let json = """
        {
            "error": "validation_error",
            "details": {
                "field_errors": {
                    "a_field": ["Error one", "Error two"]
                }
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(APIErrorResponse.self, from: json)
        #expect(resp.displayMessage == "Error one. Error two")
    }

    // MARK: - APIError: HTTP Status Code Semantics

    @Test("APIError.httpError with common status codes")
    func httpErrorCommonStatusCodes() {
        let codes = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503]
        for code in codes {
            let error = APIError.httpError(statusCode: code, error: nil)
            if case .httpError(let statusCode, _) = error {
                #expect(statusCode == code)
            } else {
                Issue.record("Expected .httpError for code \(code)")
            }
        }
    }

    // MARK: - ValidationDetails

    @Test("ValidationDetails with empty field error arrays")
    func validationDetailsEmptyArrays() throws {
        let json = """
        {
            "field_errors": {
                "email": [],
                "password": []
            }
        }
        """.data(using: .utf8)!
        let details = try JSONDecoder.waiagents.decode(APIErrorResponse.ValidationDetails.self, from: json)
        #expect(details.fieldErrors?["email"]?.isEmpty == true)
        #expect(details.fieldErrors?["password"]?.isEmpty == true)
    }

    @Test("ValidationDetails with single field single error")
    func validationDetailsSingleFieldSingleError() throws {
        let json = """
        {
            "field_errors": {
                "name": ["Name is required"]
            }
        }
        """.data(using: .utf8)!
        let details = try JSONDecoder.waiagents.decode(APIErrorResponse.ValidationDetails.self, from: json)
        #expect(details.fieldErrors?["name"] == ["Name is required"])
    }

    // MARK: - AuthResponse / TokenResponse Decoding

    @Test("AuthResponse decodes with user and tokens")
    func authResponseDecode() throws {
        let json = """
        {
            "user": {
                "id": "user_1",
                "username": "alice",
                "status": "active",
                "role": "user",
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z"
            },
            "tokens": {
                "access_token": "jwt_access_123",
                "refresh_token": "jwt_refresh_456",
                "expires_in": 3600
            }
        }
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(AuthResponse.self, from: json)
        #expect(resp.user.id == "user_1")
        #expect(resp.user.username == "alice")
        #expect(resp.tokens.accessToken == "jwt_access_123")
        #expect(resp.tokens.refreshToken == "jwt_refresh_456")
        #expect(resp.tokens.expiresIn == 3600)
    }

    @Test("MagicLinkResponse decodes from JSON")
    func magicLinkResponseDecode() throws {
        let json = """
        {"message": "Magic link sent to alice@example.com"}
        """.data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(MagicLinkResponse.self, from: json)
        #expect(resp.message == "Magic link sent to alice@example.com")
    }

    @Test("EmptyResponse decodes from empty JSON object")
    func emptyResponseDecode() throws {
        let json = "{}".data(using: .utf8)!
        let resp = try JSONDecoder.waiagents.decode(EmptyResponse.self, from: json)
        // Just verifying it doesn't throw
        _ = resp
    }

    // MARK: - MarketplaceCategorySummary

    @Test("MarketplaceCategorySummary decodes from JSON")
    func marketplaceCategorySummaryDecode() throws {
        let json = """
        {"category": "coding", "count": 42}
        """.data(using: .utf8)!
        let summary = try JSONDecoder.waiagents.decode(MarketplaceCategorySummary.self, from: json)
        #expect(summary.category == "coding")
        #expect(summary.count == 42)
    }

    @Test("MarketplaceCategorySummary is Equatable")
    func marketplaceCategorySummaryEquatable() {
        let a = MarketplaceCategorySummary(category: "coding", count: 10)
        let b = MarketplaceCategorySummary(category: "coding", count: 10)
        let c = MarketplaceCategorySummary(category: "design", count: 10)
        #expect(a == b)
        #expect(a != c)
    }

    // MARK: - PageInfo

    @Test("PageInfo with cursor and hasMore true")
    func pageInfoWithCursor() {
        let info = PageInfo(nextCursor: "cursor_abc", hasMore: true)
        #expect(info.nextCursor == "cursor_abc")
        #expect(info.hasMore == true)
    }

    @Test("PageInfo with nil cursor and hasMore false")
    func pageInfoNoCursor() {
        let info = PageInfo(nextCursor: nil, hasMore: false)
        #expect(info.nextCursor == nil)
        #expect(info.hasMore == false)
    }

    @Test("PageInfo is Equatable")
    func pageInfoEquatable() {
        let a = PageInfo(nextCursor: "c1", hasMore: true)
        let b = PageInfo(nextCursor: "c1", hasMore: true)
        let c = PageInfo(nextCursor: "c2", hasMore: true)
        #expect(a == b)
        #expect(a != c)
    }

    @Test("PageInfo round-trips through encoding")
    func pageInfoRoundTrip() throws {
        let original = PageInfo(nextCursor: "cursor_xyz", hasMore: true)
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(PageInfo.self, from: data)
        #expect(decoded == original)
    }
}
