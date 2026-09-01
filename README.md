# Round QR Studio

An open-source QR design tool for creating scan-safe codes with geometric silhouettes, custom palettes, smart phone actions, and embedded SVG icons.

## Features

- Circle, square, hexagon, and triangle silhouettes
- High error correction with a protected standards-compliant QR core
- URL, text, email, phone, SMS, Wi-Fi, vCard, and calendar payloads
- Six module styles and three finder styles
- Foreground/background presets with automatic contrast correction
- Search across the Iconify open-source icon ecosystem
- Self-contained PNG and SVG exports
- Responsive editor with mobile-safe form controls

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npx tsc --noEmit
npm run build
```

## Architecture

The app uses React, Vinext, Tailwind CSS, shadcn/Base UI components, `qr-code-styling`, and Iconify. QR payloads and image exports are generated locally in the browser. The selected Iconify SVG is embedded into the exported file.

Decorative modules extend the visual silhouette while the encoded QR matrix and its safety gap remain undistorted. This preserves compatibility better than geometrically warping the QR matrix.

## Icon licensing

Iconify aggregates many open-source icon sets with different licenses. Review the source icon set's license before commercial redistribution of a selected icon.

## License

Project source code is available under the MIT License. See [LICENSE](LICENSE).
