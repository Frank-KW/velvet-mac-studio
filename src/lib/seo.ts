import {
  developerGuideRoutes,
  getDeveloperGuidePageDefinition,
} from "../content/developerGuide";
import type { Language } from "../i18n/translations";

export const SITE_URL = "https://studio.dya.cormoran.works";
export const PUBLIC_PAGE_PATHS: readonly string[] = [
  "/",
  ...developerGuideRoutes,
  "/release-notes",
];

const home = {
  en: {
    title: "Velvet Mac Studio — ZMK Keyboard Keymap & Settings Editor",
    description:
      "Customize your ZMK keyboard's keymap in your browser with Velvet Mac Studio. Connect via USB or Bluetooth, or try Demo mode. Additional firmware modules enable advanced settings for compatible keyboards.",
  },
  ja: {
    title: "Velvet Mac Studio — ZMKキーボードのキーマップ・設定エディター",
    description:
      "ブラウザでZMKキーボードのキーマップを変更できるVelvet Mac Studio。USB・Bluetoothで接続、またはDemoでお試し。対応キーボードでは追加firmwareモジュールで高度な設定も利用できます。",
  },
  zh: {
    title: "Velvet Mac Studio — ZMK 键盘键位与设置编辑器",
    description:
      "使用 Velvet Mac Studio 在浏览器中自定义 ZMK 键盘键位。通过 USB 或蓝牙连接，或体验演示模式。兼容键盘可通过附加固件模块使用高级设置。",
  },
};

const releases = {
  en: {
    title: "Release Notes | Velvet Mac Studio",
    description:
      "New features, improvements, and fixes in Velvet Mac Studio, the browser-based ZMK keyboard editor.",
  },
  ja: {
    title: "リリースノート | Velvet Mac Studio",
    description:
      "ZMKキーボードをブラウザで設定できるVelvet Mac Studioの新機能、改善、不具合修正を紹介します。",
  },
  zh: {
    title: "发行说明 | Velvet Mac Studio",
    description:
      "了解浏览器端 ZMK 键盘编辑器 Velvet Mac Studio 的新功能、改进和问题修复。",
  },
};

/** Only known public pages get canonical URLs; never include query or hash data. */
export function getPageMetadata(pathname: string, language: Language) {
  const guide = getDeveloperGuidePageDefinition(pathname, language);
  const content = guide
    ? {
        title: `${guide.title} | Velvet Mac Studio`,
        description: guide.description,
      }
    : pathname === "/release-notes"
      ? releases[language]
      : home[language];
  return {
    ...content,
    canonical: PUBLIC_PAGE_PATHS.includes(pathname)
      ? `${SITE_URL}${pathname}`
      : null,
  };
}
