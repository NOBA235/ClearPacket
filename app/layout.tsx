import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearPacket — Catch the mistake before the application does",
  description:
    "ClearPacket audits scholarship application packets before submission: evidence-cited findings, verified against the official notice, with nothing autonomously submitted.",
};

/**
 * Fonts are loaded via a plain <link> here (not next/font/google) so this project's build does
 * not require build-time network access to fonts.googleapis.com — deliberate, given the
 * sandbox this was assembled in has no such access (see README.md "Environment notes"). In an
 * environment with normal internet access, swapping this for next/font/google is a reasonable,
 * slightly faster alternative; this link tag, placed in the root layout (not a per-page file),
 * is a correct and commonly-used pattern despite the linter's generic per-page warning below.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- root layout, not a page; see comment above */}
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
