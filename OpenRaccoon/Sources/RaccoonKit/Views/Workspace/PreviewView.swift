import SwiftUI
import WebKit

/// WKWebView wrapper for previewing HTML pages.
/// Includes refresh button, URL display, and loading indicator.
public struct PreviewView: View {
    public let url: URL?
    public let htmlContent: String?

    @State private var isLoading = false
    @State private var currentURL: String = ""
    @State private var webViewID = UUID()
    @Environment(\.colorScheme) private var colorScheme

    public init(url: URL? = nil, htmlContent: String? = nil) {
        self.url = url
        self.htmlContent = htmlContent
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            HStack(spacing: RaccoonSpacing.space2) {
                Button {
                    webViewID = UUID()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 13))
                        .foregroundStyle(textSecondary)
                        .frame(width: 28, height: 28)
                }
                .buttonStyle(.plain)

                HStack(spacing: RaccoonSpacing.space1) {
                    if isLoading {
                        ProgressView()
                            .controlSize(.mini)
                    }
                    Text(currentURL.isEmpty ? "Preview" : currentURL)
                        .font(RaccoonTypography.bodySmall)
                        .foregroundStyle(textTertiary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                .padding(.horizontal, RaccoonSpacing.space2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(height: 28)
                .background(bgInput)
                .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.md))

                Spacer()
            }
            .padding(.horizontal, RaccoonSpacing.space3)
            .padding(.vertical, RaccoonSpacing.space2)
            .background(bgSecondary)

            Divider()
                .foregroundStyle(borderPrimary)

            // Web content
            WebViewRepresentable(
                url: url,
                htmlContent: htmlContent,
                isLoading: $isLoading,
                currentURL: $currentURL
            )
            .id(webViewID)
        }
        .clipShape(RoundedRectangle(cornerRadius: RaccoonRadius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: RaccoonRadius.lg)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgSecondary : RaccoonColors.Light.bgSecondary
    }

    private var bgInput: Color {
        colorScheme == .dark ? RaccoonColors.Dark.bgInput : RaccoonColors.Light.bgInput
    }

    private var textSecondary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textSecondary : RaccoonColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.textTertiary : RaccoonColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? RaccoonColors.Dark.borderPrimary : RaccoonColors.Light.borderPrimary
    }
}

#if os(macOS)
struct WebViewRepresentable: NSViewRepresentable {
    let url: URL?
    let htmlContent: String?
    @Binding var isLoading: Bool
    @Binding var currentURL: String

    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        loadContent(in: webView)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading, currentURL: $currentURL)
    }

    private func loadContent(in webView: WKWebView) {
        if let htmlContent {
            webView.loadHTMLString(htmlContent, baseURL: nil)
        } else if let url {
            webView.load(URLRequest(url: url))
        }
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        @Binding var isLoading: Bool
        @Binding var currentURL: String

        init(isLoading: Binding<Bool>, currentURL: Binding<String>) {
            self._isLoading = isLoading
            self._currentURL = currentURL
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            isLoading = true
            currentURL = webView.url?.absoluteString ?? ""
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
            currentURL = webView.url?.absoluteString ?? ""
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoading = false
        }
    }
}
#else
struct WebViewRepresentable: UIViewRepresentable {
    let url: URL?
    let htmlContent: String?
    @Binding var isLoading: Bool
    @Binding var currentURL: String

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        loadContent(in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading, currentURL: $currentURL)
    }

    private func loadContent(in webView: WKWebView) {
        if let htmlContent {
            webView.loadHTMLString(htmlContent, baseURL: nil)
        } else if let url {
            webView.load(URLRequest(url: url))
        }
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        @Binding var isLoading: Bool
        @Binding var currentURL: String

        init(isLoading: Binding<Bool>, currentURL: Binding<String>) {
            self._isLoading = isLoading
            self._currentURL = currentURL
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            isLoading = true
            currentURL = webView.url?.absoluteString ?? ""
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
            currentURL = webView.url?.absoluteString ?? ""
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoading = false
        }
    }
}
#endif
