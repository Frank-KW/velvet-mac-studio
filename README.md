> **Velvet Mac Studio** is an unofficial, AGPL-3.0 fork of [DYA Studio](https://github.com/cormoran/dya-studio) by cormoran. It adds a **Mac app that edits a ZMK keyboard over the Bluetooth profile that is already connected** (no USB cable, no re-pairing). See [NOTICE.md](NOTICE.md) for credits and what changed. Not affiliated with cormoran, the Velvet46 makers, or ZMK.
>
> **Build the Mac app (Apple Silicon, Xcode command line tools needed):**
>
> ```bash
> npm ci && npm run build:app && npx electron-builder --mac --dir
> ```
>
> The app appears in `release/mac-arm64/`. On first launch, allow Bluetooth when macOS asks. Unsigned builds need right-click → Open the first time.

# Velvet Mac Studio

A Mac app for tuning your ZMK keyboard: keymap, trackball, and connections. It can talk to a keyboard over USB, or over the Bluetooth profile that is already connected.

## Getting Started

1. Build and open the app (see the top of this page).
2. Choose how to connect on the splash screen:
   - **USB** — plug in your keyboard and pick its serial port.
   - **Bluetooth** — use the profile that is already connected to your Mac.
   - **Demo** — no device needed; explore the app with a simulated keyboard.
3. Configure away. Changes marked as unsaved can be saved to the keyboard's flash so they persist across reboots.

> [!TIP]
> The UI is available in **English**, **日本語** and **中文** — use the language toggle in the top-right corner.

## Features

### ⌨️ Keymap Editor

Edit key bindings and layers with a visual editor — equivalent to [ZMK Studio](https://zmk.studio/), with a slightly easier UI. Add, reorder, rename, and delete layers, and watch key presses stream live from the keyboard.

### 📋 Macros & Combos

Create and edit macros and combos at runtime, without rebuilding firmware.

### 🎯 Trackball Tuning

Adjust the embedded trackball in real time: pointer sensitivity (0.1×–10×), sensor rotation for different mounting angles, axis snapping, scroll behavior, and automatic layer switching — all per input processor, scoped to the layers you choose.

### 📶 Connection Management

Name, switch, and unpair BLE profiles. Choose whether USB or Bluetooth wins when both are connected. See which OS each host is detected as, override it per profile, and set a default layer per connection target or per OS — the keyboard switches layers automatically when you switch devices.

### ⚙️ Device Settings

Tweak power management (idle and deep-sleep timeouts) for each half of the keyboard or all devices at once, and edit advanced firmware settings directly from the app.

### 🩺 Troubleshooting & Diagnostics

Inspect battery levels, firmware build info, and uptime for both halves. Hunt down key chatter with the interactive key-switch diagnostics view, watch the trackball sensor's raw surface frames, and copy a full support report to share when asking for help.

## Does it work with my keyboard?

- **Any ZMK keyboard with [ZMK Studio](https://zmk.dev/docs/features/studio) enabled**: the keymap editor works out of the box.
- **Keyboards built on [cormoran's ZMK fork + modules](https://github.com/cormoran)**: everything above — trackball tuning, connection management, per-OS default layers, diagnostics, and more.

> [!WARNING]
> cormoran's ZMK fork is experimental. It may contain unstable or breaking changes — use it at your own risk.

## Development

**Stack**: Electron, React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI

```bash
git clone https://github.com/Frank-KW/velvet-mac-studio.git
cd velvet-mac-studio
npm install
npm run dev            # Start dev server at http://localhost:5173
```

```bash
npm run build          # Web build
npm run lint           # Lint code
npm test               # Run tests
npm run test:coverage  # Test coverage
```

- [Development Guide](docs/DEVELOPMENT_GUIDE.md) — design system, component patterns, and implementation guidelines
- [Testing Guide](docs/TESTING_GUIDE.md) — testing patterns and examples

## Acknowledgments

Based on [DYA Studio](https://github.com/cormoran/dya-studio) by cormoran (AGPL-3.0). See [NOTICE.md](NOTICE.md).

[ZMK Firmware](https://zmk.dev/) • [ZMK Studio](https://zmk.studio/) • [Radix UI](https://www.radix-ui.com/) • [Tabler Icons](https://tabler.io/icons)
