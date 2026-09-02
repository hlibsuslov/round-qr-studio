<div align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="Round QR Studio logo">
  <h1>Round QR Studio</h1>
  <p>Create distinctive, scan-safe QR codes directly in your browser.</p>
  <p>
    <a href="https://round-qr-studio.hlixli.chatgpt.site"><strong>Open the live app</strong></a>
    ·
    <a href="https://github.com/hlibsuslov/round-qr-studio/issues">Report a bug</a>
    ·
    <a href="CONTRIBUTING.md">Contribute</a>
  </p>
  <p>
    <a href="https://github.com/hlibsuslov/round-qr-studio/actions/workflows/ci.yml"><img src="https://github.com/hlibsuslov/round-qr-studio/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/hlibsuslov/round-qr-studio" alt="MIT license"></a>
  </p>
</div>

![Round QR Studio — shape your scan](public/og.png)

## Why Round QR Studio?

Round QR Studio combines a standards-compliant QR core with a separate geometric silhouette. Decorative modules fill only the safe outer area, so the encoded matrix is never warped. The result keeps its character without trading away scan reliability.

Everything is generated locally in the browser. The app does not upload QR payloads or exported files to a server.

## Features

- Circle, square, hexagon, and triangle silhouettes
- URL, text, email, phone, SMS, Wi-Fi, vCard, and calendar payloads
- High error correction and protected QR safety margins
- Six module styles and three finder styles
- Contrast-aware foreground and background palettes
- Optional icons from the open-source Iconify ecosystem
- Self-contained PNG and SVG exports
- Responsive controls for desktop and mobile

## Development

### Requirements

- Node.js 22.13 or newer
- npm 10 or newer

```bash
git clone https://github.com/hlibsuslov/round-qr-studio.git
cd round-qr-studio
npm ci
npm run dev
```

Open the local URL printed by the development server.

### Quality checks

```bash
npm run check
```

The check command verifies formatting, lint rules, TypeScript, and the production build. CI runs the same checks and a high-severity dependency audit for every pull request.

## Project structure

```text
app/                 Application route, metadata, and global styles
components/ui/       Shared interface primitives
lib/                 Small shared utilities
public/              Icons and social preview assets
.github/             CI and contribution templates
.openai/              Sites deployment configuration
```

The app is built with React, TypeScript, Vinext, Tailwind CSS, Base UI/shadcn, `qr-code-styling`, and Iconify.

## Contributing and security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Please report security issues privately according to [SECURITY.md](SECURITY.md).

Iconify aggregates icon sets with different licenses. Check the selected icon set's license before commercial redistribution.

## License

Released under the [MIT License](LICENSE).
