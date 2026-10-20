#!/bin/bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
app_path="${1:-$HOME/Applications/Badanie ankiet.app}"
mkdir -p "$app_path/Contents/MacOS" "$app_path/Contents/Resources/Web"
swiftc "$project_dir/macos/Lustro.swift" -o "$app_path/Contents/MacOS/Lustro" -framework Cocoa -framework WebKit -target arm64-apple-macos12.0
rsync -a --delete --exclude='przywrocona-analiza.html' --exclude='session-seed.js' --exclude='.DS_Store' "$project_dir/docs/" "$app_path/Contents/Resources/Web/"
cp "$project_dir/macos/Lustro.icns" "$app_path/Contents/Resources/Lustro.icns"
cat > "$app_path/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Lustro</string>
<key>CFBundleIdentifier</key><string>pl.kinga.badanie-ankiet</string>
<key>CFBundleName</key><string>Badanie ankiet</string>
<key>CFBundleDisplayName</key><string>Badanie ankiet</string>
<key>CFBundleIconFile</key><string>Lustro.icns</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>12.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSHumanReadableCopyright</key><string>Analiza ankiet o dezinformacji</string>
</dict></plist>
PLIST
codesign --force --deep --sign - "$app_path"
printf '%s\n' "$app_path"
