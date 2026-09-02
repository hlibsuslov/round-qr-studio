# Contributing

Thanks for helping improve Round QR Studio.

## Before you start

- Search existing issues and pull requests to avoid duplicate work.
- Open an issue before a large feature or visual redesign so the approach can be discussed.
- Use Node.js 22.13 or newer and install dependencies with `npm ci`.

## Development workflow

1. Fork the repository and create a focused branch from `main`.
2. Make one coherent change and include user-facing copy where needed.
3. Run `npm run check` before opening a pull request.
4. Explain what changed, why it changed, and how you verified it.

## QR-specific guardrails

- Do not warp, crop, or cover the encoded QR matrix.
- Keep high error correction and the protected quiet zone intact.
- Treat silhouette particles as decoration outside the QR core.
- Verify layout changes at desktop and mobile breakpoints.
- Keep PNG and SVG exports visually consistent with the preview.

## Pull requests

Keep pull requests small enough to review comfortably. Add screenshots for visual changes, link related issues, and call out any dependency or deployment impact.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
