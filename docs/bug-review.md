# Form robustness review

The review covered every QR content type, long input, preview state, Iconify requests, clipboard access, and PNG/SVG downloads. Existing design and shape work was preserved.

## Fixed

- Unbounded auto-growing textareas made long content stretch the editor. Textareas now stop at 256 px, scroll internally, and resize vertically. Email, SMS, and event messages use the same bounded multiline control.
- Preview messages were absolutely positioned without a positioned parent and could cover unrelated controls. They are now contained inside the preview.
- QR generation ran on every keystroke and attempted oversized payloads. Encoding now waits 250 ms after input, cancels obsolete work, and checks the final UTF-8 byte count against the 1,273-byte high-correction limit before rendering. Oversized input stays editable and shows an explanation; exports are disabled.
- The QR libraries truncated Unicode characters to one byte. Both now receive identical UTF-8 byte strings; multilingual text, emoji, and plain-text whitespace survive decoding.
- Email fields used form-style plus signs for spaces in mailto parameters. They now use URI escaping and count the resulting encoded payload, including format overhead.
- Website, email, phone, contact, and event inputs could generate malformed payloads. They now report invalid data and missing required details. Event dates retain seconds and require the end to follow the start. Structured text consistently escapes CRLF, CR, LF, commas, and semicolons.
- An open Wi-Fi network could still encode a previously entered password. The disabled password is preserved in the editor for switching back, but omitted from an open-network payload.
- Old icon/search requests could overwrite newer results or leave the search stuck. Requests are cancelled, time limited, and tied to their current query/icon/color; errors are visible and loading an icon blocks incomplete exports.
- Clipboard rejection was unhandled, and stale success feedback could survive edits. Copy operations now report failure and associate feedback with the copied payload.
- PNG/image failures were silent and could leak object URLs. Exports now clean up resources on success and failure, prevent overlapping downloads, delay URL release until the browser can use it, and show retry guidance.
- Input focus was visually suppressed. Keyboard focus is now visible.

## Automated regression coverage

Run `npm test`. The suite covers QR capacity boundaries, UTF-8 size, actual decoding with jsQR, large-paste recovery, mailto escaping and overhead, URL validation, Wi-Fi password omission and escaping, contact newline escaping, calendar dates, empty forms, malformed Unicode, and the existing contrast regressions. Tests also run in CI and in `npm run check`.

## Browser verification

- All eight forms were exercised with long input at a 375 px viewport. No form caused horizontal page overflow. A 20,000-character plain-text paste remained inside a 256 px scrolling textarea. The 320 px layout was checked as well.
- The full 1,273-byte payload rendered successfully in the triangle silhouette.
- Shortening oversized text restored generation and both downloads. The exported 1,520 by 1,520 PNG was independently decoded with jsQR and returned exactly: Привет, світ! 😀 QR test. SVG downloaded successfully as well.
- Clearing an in-flight icon search back to one character restored suggested icons; selecting a suggested icon completed rendering and re-enabled exports.

## Separate dependency findings

The installed dependency tree currently reports 29 npm audit advisories, including 3 critical and 14 high. Affected direct tool dependencies include oxfmt, Vite, Wrangler, the Cloudflare Vite plugin, and shadcn. These findings require a separately verified toolchain update; the form fixes do not resolve them. The audit snapshot is retained locally in `work/dependency-audit.json`.
