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
            HStack(spacing: WaiAgentsSpacing.space2) {
                Button {
                    webViewID = UUID()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 13))
                        .foregroundStyle(textSecondary)
                        .frame(width: 28, height: 28)
                }
                .buttonStyle(.plain)

                HStack(spacing: WaiAgentsSpacing.space1) {
                    if isLoading {
                        ProgressView()
                            .controlSize(.mini)
                    }
                    Text(currentURL.isEmpty ? "Preview" : currentURL)
                        .font(WaiAgentsTypography.bodySmall)
                        .foregroundStyle(textTertiary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                .padding(.horizontal, WaiAgentsSpacing.space2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(height: 28)
                .background(bgInput)
                .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.md))

                Spacer()
            }
            .padding(.horizontal, WaiAgentsSpacing.space3)
            .padding(.vertical, WaiAgentsSpacing.space2)
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
        .clipShape(RoundedRectangle(cornerRadius: WaiAgentsRadius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: WaiAgentsRadius.lg)
                .strokeBorder(borderPrimary, lineWidth: 1)
        }
    }

    private var bgSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgSecondary : WaiAgentsColors.Light.bgSecondary
    }

    private var bgInput: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.bgInput : WaiAgentsColors.Light.bgInput
    }

    private var textSecondary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textSecondary : WaiAgentsColors.Light.textSecondary
    }

    private var textTertiary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.textTertiary : WaiAgentsColors.Light.textTertiary
    }

    private var borderPrimary: Color {
        colorScheme == .dark ? WaiAgentsColors.Dark.borderPrimary : WaiAgentsColors.Light.borderPrimary
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
