# Velvet Mac Studio — fork notice

**Velvet Mac Studio is an unofficial fork of [DYA Studio](https://github.com/cormoran/dya-studio) by cormoran.** It is not made, endorsed or supported by cormoran, by the makers of the Velvet46 keyboard, or by the ZMK project. All product names belong to their owners and are used only to say which keyboards the app works with.

## License

This program is free software under the **GNU Affero General Public License v3.0** (see [LICENSE](LICENSE)), the same license as the original. It comes with **no warranty**. You may copy, change and share it under the AGPL terms. If you give anyone a copy (or run a changed version for them over a network), you must offer them the complete source code, including the files listed below.

## Original work

- DYA Studio, Copyright (C) cormoran and contributors, AGPL-3.0: https://github.com/cormoran/dya-studio
- ZMK Studio protocol client `@zmkfirmware/zmk-studio-ts-client`, MIT license, used as a dependency.

## What this fork changes (started 2026-10-29)

- **Native Bluetooth for macOS.** A small Swift helper (`electron/native/ble-bridge.swift`) uses CoreBluetooth to find a keyboard that is already connected to the Mac and talk to it over the ZMK Studio GATT service. Chromium's own Web Bluetooth cannot see a keyboard that is already connected.
- Electron changes (`electron/main.ts`, `electron/preload.ts`, `tsconfig.preload.json`) to start the helper and pass data to the page.
- New transport `src/lib/transport/nativeBle.ts` and a switch in `src/components/DeviceConnection.tsx` to use it inside the Mac app.
- **Analytics removed.** Upstream loads Google Analytics (cormoran's account). This fork removes the script completely and sends no usage data anywhere. The data-collection notice now says so.
- **Rebranded.** New name, app icon and logo. The DYA keyboard shop pages, product photos, share-on-X button and "Try the Beta" link were removed. The home page and splash screen credit DYA Studio and cormoran707 and link to this source code. Upstream release notes and the keyboard developer guide are kept as they were.
- Build scripts in `package.json` (`build:native`, CommonJS preload) and the app name / app id (`Velvet Mac Studio`, `io.github.frank-kw.velvet-mac-studio`).

Everything else is unchanged from upstream at commit `3a02599`. See the Git history for exact changes.
