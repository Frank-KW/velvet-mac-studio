import { IconBook, IconExternalLink, IconNews } from "@tabler/icons-react";
import type { MouseEvent } from "react";

import { useLanguage } from "../hooks/useLanguage";
import {
  CHANGE_CATEGORIES,
  getLatestRelease,
  isEmptyRelease,
  localizeChange,
  localizeText,
} from "../i18n/releaseNotes";

function navigateWithinApp(event: MouseEvent<HTMLAnchorElement>, path: string) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function HomePage() {
  const { language, t } = useLanguage();
  const latestRelease = getLatestRelease();

  return (
    <div className="app-page p-4 sm:p-6 h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="page-header flex flex-col tablet:flex-row tablet:items-center gap-3 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1">
              <h1 className="text-xl font-medium text-[var(--color-text)] text-center tablet:text-left">
                {t("Welcome to Velvet Mac Studio")}
              </h1>
              <p className="page-header-description text-sm text-[var(--color-text-muted)] mt-1">
                An unofficial Mac app for editing ZMK keyboards such as the
                Velvet46, also over the Bluetooth profile that is already
                connected. A fork of{" "}
                <a
                  href="https://github.com/cormoran/dya-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                >
                  DYA Studio
                </a>{" "}
                by{" "}
                <a
                  href="https://x.com/cormoran707"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                >
                  cormoran707
                </a>
                . Free software (AGPL-3.0),{" "}
                <a
                  href="https://github.com/Frank-KW/velvet-mac-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                >
                  source code
                </a>
                . Not affiliated with cormoran707 or ZMK.
              </p>
            </div>
          </div>
        </div>
        {/* Guide */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">
            {t("Features - What you can do with Velvet Mac Studio")}
          </h2>
          <div className="text-sm text-[var(--color-text-muted)] space-y-4">
            <ul className="list-disc list-outside space-y-2 pl-5">
              <li>
                {t(
                  "You can customize keymaps with a slightly easier UI, equivalent to ZMK Studio.",
                )}
              </li>
              <li>
                {t(
                  "You can configure trackball sensitivity, auto layer switching and various input processor settings.",
                )}
              </li>
              <li>
                {t(
                  "You can inspect device diagnostics and generate a troubleshooting report to share when asking for support.",
                )}
              </li>
              <li>
                {t("You can name BLE connection targets and unpair them.")}
              </li>
              <li>
                {t(
                  "You can change various settings such as the time to enter sleep mode.",
                )}
              </li>
            </ul>
            <p>{t("See also below Q&A section for more details.")}</p>
          </div>
        </div>

        {/* Developer resources */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-start gap-3">
            <IconBook
              size={22}
              className="text-[var(--color-electric)] flex-shrink-0 mt-0.5"
            />
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
                {t("Bring your keyboard to Velvet Mac Studio")}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                {t(
                  "Learn how to make your ZMK keyboard work with Velvet Mac Studio, from standard keymap support to custom features.",
                )}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                <a
                  href="/developer-guide"
                  onClick={(event) =>
                    navigateWithinApp(event, "/developer-guide")
                  }
                  className="inline-flex items-center gap-1 underline text-sm text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors"
                >
                  <IconBook size={16} />
                  {t("Developer Guide")}
                </a>
                <a
                  href="https://note.com/cormoran/n/n888c547fc99b"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline text-sm text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors"
                >
                  <IconExternalLink size={16} />
                  {t("Read the note article")}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Latest release */}
        {latestRelease && (
          <div className="glass-card p-6 mb-6">
            <div className="flex items-start gap-3">
              <IconNews
                size={22}
                className="text-[var(--color-electric)] flex-shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
                    {t("Latest Release")}
                  </h2>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {latestRelease.version}
                  </span>
                  {latestRelease.date && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {latestRelease.date}
                    </span>
                  )}
                </div>

                {latestRelease.summary?.lead && (
                  <p className="text-sm text-[var(--color-text)] mt-3">
                    {localizeText(latestRelease.summary.lead, language)}
                  </p>
                )}
                {latestRelease.summary?.highlights &&
                  latestRelease.summary.highlights.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
                      {latestRelease.summary.highlights.map(
                        (highlight, index) => (
                          <li key={index}>
                            {localizeText(highlight, language)}
                          </li>
                        ),
                      )}
                    </ul>
                  )}

                {isEmptyRelease(latestRelease) ? (
                  <p className="text-sm text-[var(--color-text-muted)] mt-3">
                    {t("No changes recorded for this release.")}
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {CHANGE_CATEGORIES.map((category) => {
                      const changes = latestRelease.changes[category] ?? [];
                      if (changes.length === 0) return null;
                      return (
                        <div key={category}>
                          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                            {t(
                              category === "major"
                                ? "Major"
                                : category === "minor"
                                  ? "Minor"
                                  : "Patch",
                            )}
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--color-text-muted)]">
                            {changes.map((change, index) => (
                              <li key={index}>
                                {localizeChange(change, language)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}

                <a
                  href={`/release-notes#${encodeURIComponent(latestRelease.version)}`}
                  onClick={(event) =>
                    navigateWithinApp(
                      event,
                      `/release-notes#${encodeURIComponent(latestRelease.version)}`,
                    )
                  }
                  className="inline-flex items-center gap-1 underline text-sm text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mt-4"
                >
                  <IconNews size={16} />
                  {t("View all release notes")}
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card p-6">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">
            Q&amp;A
          </h2>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-[var(--color-text)] mb-1">
                {t("Q: Can my keyboard support Velvet Mac Studio?")}
              </p>
              <div className="text-sm text-[var(--color-text-muted)]">
                {t(
                  "A: Yes, you can use the keymap feature without any modification with your ZMK keyboard.",
                )}
                <br />
                {t(
                  "You can also support other features by using cormoran's ZMK fork and cormoran's ZMK modules, although it's not suggested considering compatibility and maintainability.",
                )}
                <br />
                {language === "ja" ? (
                  <>
                    DYA Dash キーボード向けの{" "}
                    <a
                      href="https://github.com/cormoran/zmk-keyboard-dya-dash/pull/9"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                    >
                      experimental zmk-config
                    </a>{" "}
                    を参照してください。
                  </>
                ) : (
                  <>
                    Please refer to the{" "}
                    <a
                      href="https://github.com/cormoran/zmk-keyboard-dya-dash/pull/9"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                    >
                      experimental zmk-config
                    </a>{" "}
                    for DYA Dash keyboard.
                  </>
                )}
                <div className="mt-2 p-3 rounded bg-[var(--color-warning)]/20 border border-[var(--color-warning)] text-[var(--color-warning)] text-xs">
                  {t(
                    "Warning: cormoran's ZMK fork is very experimental, optimized for DYA keyboards and may contain unstable or breaking changes. Use at your own risk. In rare cases, it may cause malfunction or damage to your keyboard hardware.",
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium text-[var(--color-text)] mb-1">
                {t("Q: Can I get source code of Velvet Mac Studio?")}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {language === "ja" ? (
                  <>
                    A: はい、Velvet Mac Studio
                    はオープンソースになりました。ソースコードは{" "}
                    <a
                      href="https://github.com/cormoran/dya-studio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                    >
                      GitHub
                    </a>{" "}
                    で公開しています。フィードバックや機能要望がある場合は、X で{" "}
                    <a
                      href="https://x.com/intent/tweet?hashtags=dya_studio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                    >
                      #dya_studio
                    </a>{" "}
                    ハッシュタグを付けて投稿してください。
                  </>
                ) : (
                  <>
                    A: Yes, Velvet Mac Studio is now open source. You can find
                    the source code on{" "}
                    <a
                      href="https://github.com/cormoran/dya-studio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                    >
                      GitHub
                    </a>
                    . If you have feedback or feature request, please complaint
                    on X with{" "}
                    <a
                      href="https://x.com/intent/tweet?hashtags=dya_studio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors mx-1"
                    >
                      #dya_studio
                    </a>{" "}
                    hashtag.
                  </>
                )}
              </p>
            </div>
            <div>
              <p className="font-medium text-[var(--color-text)] mb-1">
                {t("Q: Are there plan to migrate the ZMK fork to ZMK v0.4.0?")}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t(
                  "A: Yes, it's already done. The ZMK fork now tracks recent ZMK (Zephyr 4.x).",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
