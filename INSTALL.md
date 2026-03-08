# Installing BottingOS

## Prerequisites

- macOS 10.15 (Catalina) or later
- Windows 10 or later

## Download

Download the latest release from the [GitHub Releases](https://github.com/your-org/bottingos/releases) page:

- **macOS**: `BottingOS_X.Y.Z_aarch64.dmg` (Apple Silicon) or `BottingOS_X.Y.Z_x64.dmg` (Intel)
- **Windows**: `BottingOS_X.Y.Z_x64-setup.exe`

## macOS Installation

1. Download the `.dmg` file
2. Double-click to mount it
3. Drag `BottingOS.app` to your Applications folder

### First Launch (unsigned app)

This app is not signed with an Apple Developer certificate, so macOS Gatekeeper will block it on first launch.

**Option A - Right-click method (recommended):**
1. Open Finder and navigate to Applications
2. Right-click (or Control-click) on `BottingOS.app`
3. Select "Open" from the context menu
4. Click "Open" in the dialog that appears
5. The app will launch normally from now on

**Option B - Terminal method:**
```bash
xattr -cr /Applications/BottingOS.app
```
Then double-click to open normally.

**Option C - System Settings:**
1. Try to open the app normally (it will be blocked)
2. Go to System Settings > Privacy & Security
3. Scroll down to find the "BottingOS was blocked" message
4. Click "Open Anyway"

## Windows Installation

1. Download the `.exe` installer
2. Run the installer
3. Windows SmartScreen may show a warning for unsigned apps - click "More info" then "Run anyway"
4. Follow the installation prompts

## Data Storage

BottingOS stores its database at:
- **macOS**: `~/Library/Application Support/com.bottingos.app/`
- **Windows**: `%APPDATA%/com.bottingos.app/`

Your data persists across app updates.

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) (stable toolchain)
- npm

### Steps

```bash
# Clone the repository
git clone https://github.com/your-org/bottingos.git
cd bottingos

# Install Node dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

The built app will be at:
- macOS: `src-tauri/target/release/bundle/dmg/BottingOS_*.dmg`
- Windows: `src-tauri/target/release/bundle/nsis/BottingOS_*-setup.exe`

## Troubleshooting

**App won't open on macOS:**
See the "First Launch" section above. The app is unsigned and requires manual Gatekeeper bypass.

**Database errors on launch:**
Delete the database file and restart. The app will recreate it with fresh migrations:
```bash
# macOS
rm ~/Library/Application\ Support/com.bottingos.app/bottingos.db

# Windows (PowerShell)
Remove-Item "$env:APPDATA/com.bottingos.app/bottingos.db"
```

**Blank screen after update:**
Clear the web cache:
```bash
# macOS
rm -rf ~/Library/Application\ Support/com.bottingos.app/EBWebView
```
