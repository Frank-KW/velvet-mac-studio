import { fireEvent, render, screen } from "@testing-library/react";
import { getLatestRelease } from "../../i18n/releaseNotes";
import { HomePage } from "../HomePage";

describe("HomePage", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("credits the original DYA Studio and links to this fork's source", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "DYA Studio" })).toHaveAttribute(
      "href",
      "https://github.com/cormoran/dya-studio",
    );
    expect(screen.getByRole("link", { name: "source code" })).toHaveAttribute(
      "href",
      "https://github.com/Frank-KW/velvet-mac-studio",
    );
    expect(screen.queryByRole("link", { name: "Buy" })).not.toBeInTheDocument();
  });

  it("links to both keyboard developer guides", () => {
    render(<HomePage />);

    const developerGuide = screen.getByRole("link", {
      name: "Developer Guide",
    });
    expect(developerGuide).toHaveAttribute("href", "/developer-guide");
    expect(
      screen.getByRole("link", { name: "Read the note article" }),
    ).toHaveAttribute("href", "https://note.com/cormoran/n/n888c547fc99b");

    fireEvent.click(developerGuide);
    expect(window.location.pathname).toBe("/developer-guide");
  });

  it("shows and deep-links to the latest published release", () => {
    const latestRelease = getLatestRelease();
    expect(latestRelease).not.toBeNull();

    render(<HomePage />);

    expect(screen.getByText(latestRelease!.version)).toBeInTheDocument();
    const releaseNotes = screen.getByRole("link", {
      name: "View all release notes",
    });
    expect(releaseNotes).toHaveAttribute(
      "href",
      `/release-notes#${encodeURIComponent(latestRelease!.version)}`,
    );

    fireEvent.click(releaseNotes);
    expect(window.location.pathname).toBe("/release-notes");
    expect(window.location.hash).toBe(`#${latestRelease!.version}`);
  });
});
