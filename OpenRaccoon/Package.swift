// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "OpenRaccoon",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(name: "RaccoonKit", targets: ["RaccoonKit"]),
        .executable(name: "OpenRaccoonApp", targets: ["OpenRaccoonApp"]),
    ],
    dependencies: [
        .package(url: "https://github.com/davidstump/SwiftPhoenixClient.git", from: "5.3.0"),
        .package(url: "https://github.com/onevcat/Kingfisher.git", from: "8.1.0"),
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.2"),
    ],
    targets: [
        .target(
            name: "RaccoonKit",
            dependencies: [
                .product(name: "SwiftPhoenixClient", package: "SwiftPhoenixClient"),
                .product(name: "Kingfisher", package: "Kingfisher"),
                .product(name: "KeychainAccess", package: "KeychainAccess"),
            ],
            path: "Sources/RaccoonKit"
        ),
        .executableTarget(
            name: "OpenRaccoonApp",
            dependencies: ["RaccoonKit"],
            path: "Sources/OpenRaccoonApp"
        ),
        .testTarget(
            name: "RaccoonKitTests",
            dependencies: ["RaccoonKit"],
            path: "Tests/RaccoonKitTests"
        ),
    ]
)
