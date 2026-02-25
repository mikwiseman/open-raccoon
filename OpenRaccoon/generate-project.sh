#!/bin/bash
# Generate the Xcode project from project.yml and apply necessary fixes.
# Usage: cd OpenRaccoon && ./generate-project.sh

set -euo pipefail

echo "Generating Xcode project..."
xcodegen generate

# Fix xcodegen bug: XCSwiftPackageProductDependency entries are missing
# the 'package' reference for local Swift packages.
PBXPROJ="OpenRaccoon.xcodeproj/project.pbxproj"
PKG_REF=$(grep -o '[A-F0-9]\{24\} \/\* XCLocalSwiftPackageReference' "$PBXPROJ" | head -1 | awk '{print $1}')

if [ -z "$PKG_REF" ]; then
    echo "Warning: Could not find XCLocalSwiftPackageReference ID. Skipping patch."
    exit 0
fi

echo "Patching XCSwiftPackageProductDependency entries (package = $PKG_REF)..."
sed -i '' "/isa = XCSwiftPackageProductDependency;/{
    /package =/!a\\
\\			package = $PKG_REF /* XCLocalSwiftPackageReference \".\" */;
}" "$PBXPROJ"

echo "Done. Open OpenRaccoon.xcodeproj in Xcode."
