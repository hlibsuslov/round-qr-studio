import assert from 'node:assert/strict';
import test from 'node:test';
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
import {
  buildPayload,
  INITIAL_FIELDS,
  MAX_QR_BYTES,
  prepareContent,
  toQrByteString,
} from '../lib/qr-content.ts';

const fields = (overrides) => ({ ...INITIAL_FIELDS, ...overrides });

function matrixFor(payload) {
  const matrix = qrcode(0, 'H');
  matrix.addData(toQrByteString(payload), 'Byte');
  matrix.make();
  return matrix;
}

function decodeMatrix(matrix) {
  const count = matrix.getModuleCount();
  const scale = 4;
  const width = (count + 8) * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const row = Math.floor(y / scale) - 4;
      const column = Math.floor(x / scale) - 4;
      if (
        row < 0 ||
        column < 0 ||
        row >= count ||
        column >= count ||
        !matrix.isDark(row, column)
      )
        continue;
      const offset = (y * width + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
    }
  }
  return jsQR(pixels, width, width)?.data;
}

test('the maximum high-correction byte payload fits, and one extra byte is rejected', () => {
  const payload = 'a'.repeat(MAX_QR_BYTES);
  assert.equal(prepareContent('text', fields({ text: payload })).error, '');
  assert.equal(matrixFor(payload).getModuleCount(), 177);
  assert.match(
    prepareContent('text', fields({ text: payload + 'a' })).error,
    /too long/,
  );
  assert.throws(() => matrixFor(payload + 'a'));
});

test('capacity counts UTF-8 bytes for Cyrillic and emoji', () => {
  assert.equal(
    prepareContent('text', fields({ text: 'я'.repeat(636) })).error,
    '',
  );
  assert.match(
    prepareContent('text', fields({ text: 'я'.repeat(637) })).error,
    /too long/,
  );
  assert.equal(
    prepareContent('text', fields({ text: '😀'.repeat(318) })).bytes,
    1272,
  );
  assert.match(
    prepareContent('text', fields({ text: '😀'.repeat(319) })).error,
    /too long/,
  );
});

test('real QR decoding preserves multilingual text, emoji, and surrounding whitespace', () => {
  for (const text of [
    '  Привет, світ! 😀\n日本語  ',
    'a'.repeat(200),
    '👩‍💻 QR café',
  ]) {
    const content = prepareContent('text', fields({ text }));
    assert.equal(content.error, '');
    assert.equal(content.payload, text);
    assert.equal(decodeMatrix(matrixFor(content.payload)), text);
  }
});

test('large pastes are retained for editing and do not affect other content types', () => {
  const pasted = 'long unbroken text'.repeat(30000);
  const current = fields({ text: pasted, url: 'example.com' });
  const content = prepareContent('text', current);
  assert.equal(content.payload, pasted);
  assert.match(content.error, /too long/);
  assert.equal(prepareContent('url', current).error, '');
  assert.equal(prepareContent('text', fields({ text: 'shorter' })).error, '');
});

test('email uses mailto escaping and measures the final encoded payload', () => {
  const current = fields({
    email: 'hello@example.com',
    subject: 'Hello + world',
    body: 'a & b\nПривет 😀',
  });
  const payload = buildPayload('email', current);
  assert.ok(payload.includes('subject=Hello%20%2B%20world'));
  assert.ok(payload.includes('body=a%20%26%20b%0A'));
  const url = new URL(payload);
  assert.equal(
    decodeURIComponent(url.search.slice(1).split('body=')[1]),
    current.body,
  );
  assert.match(
    prepareContent(
      'email',
      fields({ email: 'a@b.com', body: '😀'.repeat(107) }),
    ).error,
    /too long/,
  );
  assert.match(
    prepareContent('email', fields({ body: 'hello' })).error,
    /recipient/,
  );
  assert.ok(
    prepareContent('email', fields({ email: 'a@b.com?bcc=someone' })).error,
  );
});

test('links accept omitted schemes and ports, and reject malformed or executable URLs', () => {
  assert.equal(
    buildPayload('url', fields({ url: 'example.com' })),
    'https://example.com/',
  );
  assert.equal(
    buildPayload('url', fields({ url: 'localhost:3000/path' })),
    'https://localhost:3000/path',
  );
  assert.equal(
    buildPayload('url', fields({ url: 'https://example.com:8443/тест' })),
    'https://example.com:8443/%D1%82%D0%B5%D1%81%D1%82',
  );
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'https://',
    'not a website',
  ]) {
    assert.ok(prepareContent('url', fields({ url })).error, url);
  }
});

test('Wi-Fi escapes delimiters and never includes the old password for an open network', () => {
  const current = fields({
    ssid: 'Cafe;Floor:1',
    password: 'old;secret',
    hidden: 'true',
  });
  assert.equal(
    buildPayload('wifi', current),
    'WIFI:T:WPA;S:Cafe\\;Floor\\:1;P:old\\;secret;H:true;;',
  );
  const open = buildPayload('wifi', { ...current, encryption: 'nopass' });
  assert.equal(open, 'WIFI:T:nopass;S:Cafe\\;Floor\\:1;H:true;;');
  assert.ok(!open.includes('secret'));
});

test('contact text escapes every newline variant and validates structured fields', () => {
  const payload = buildPayload(
    'contact',
    fields({
      firstName: 'Alex',
      address: 'Street\r\nCity\rCountry\nEnd;Unit,2',
    }),
  );
  assert.ok(
    payload.includes(
      'ADR;TYPE=WORK:;;Street\\nCity\\nCountry\\nEnd\\;Unit\\,2;;;;',
    ),
  );
  assert.ok(
    prepareContent(
      'contact',
      fields({ firstName: 'Alex', contactEmail: 'a@b.com\r\nTEL:123' }),
    ).error,
  );
  assert.ok(
    prepareContent(
      'contact',
      fields({ firstName: 'Alex', website: 'javascript:alert(1)' }),
    ).error,
  );
});

test('calendar validates real dates, requires a start, and preserves seconds', () => {
  const current = fields({
    eventTitle: 'Review',
    eventStart: '2026-11-02T14:30:45',
    eventEnd: '2026-11-02T15:00',
  });
  assert.ok(buildPayload('event', current).includes('DTSTART:20261102T143045'));
  assert.ok(buildPayload('event', current).includes('DTEND:20261102T150000'));
  assert.match(
    prepareContent('event', { ...current, eventEnd: current.eventStart }).error,
    /after/,
  );
  assert.match(
    prepareContent('event', { ...current, eventEnd: '2026-11-01T12:00' }).error,
    /after/,
  );
  assert.match(
    prepareContent('event', { ...current, eventStart: '2026-02-30T12:00' })
      .error,
    /valid/,
  );
  assert.match(
    prepareContent('event', { ...current, eventStart: '' }).error,
    /start/,
  );
});

test('phone validation handles long invalid whitespace and formats extensions', () => {
  assert.ok(
    prepareContent('phone', fields({ phone: '1' + ' '.repeat(100000) + 'a' }))
      .error,
  );
  assert.equal(
    buildPayload('phone', fields({ phone: '+1 (555) 123 4567 ext. 42' })),
    'tel:+1(555)1234567;ext=42',
  );
  assert.ok(prepareContent('phone', fields({ phone: '().-' })).error);
});

test('every empty form stays empty and lone surrogates cannot crash encoding', () => {
  for (const type of [
    'url',
    'text',
    'email',
    'phone',
    'sms',
    'wifi',
    'contact',
    'event',
  ]) {
    assert.deepEqual(prepareContent(type, INITIAL_FIELDS), {
      payload: '',
      bytes: 0,
      error: '',
    });
  }
  assert.equal(prepareContent('text', fields({ text: ' \n\t ' })).payload, '');
  assert.equal(
    prepareContent('text', fields({ text: '\ud800' })).payload,
    '\ufffd',
  );
  assert.equal(
    prepareContent('email', fields({ email: 'a@b.com', body: '\ud800' })).error,
    '',
  );
});
