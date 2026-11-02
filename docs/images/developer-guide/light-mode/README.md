# Developer guide screenshots — light mode

These are the screenshot specifications for the keyboard-developer guide. Do not use the existing dark-mode DYA Dash Demo screenshots in `docs/images/` for this guide. Generated files are written to `public/images/developer-guide/light-mode/`, which Vite publishes for the static guide.

Capture every image in **light mode**, with the relevant screen and a realistic enabled module state visible.

| File                  | Screen                                          |
| --------------------- | ----------------------------------------------- |
| `keymap.png`          | Keymap with the target physical layout selected |
| `macro.png`           | Runtime Macro editor                            |
| `combo.png`           | Runtime Combo editor                            |
| `trackball.png`       | PMW3610 and runtime input processor controls    |
| `connection.png`      | BLE management, default layer, and OS detection |
| `settings.png`        | Sleep and physical layout settings              |
| `troubleshooting.png` | Device information and diagnostics              |

## Regenerating the assets

The upstream capture job (Playwright + Renode) was removed from this fork. Take new screenshots by hand from the built-in Demo keyboard at a 1440 × 1200 viewport, English, light mode.
