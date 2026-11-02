export type ContentType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'wifi'
  | 'contact'
  | 'event';

export const INITIAL_FIELDS = {
  url: '',
  text: '',
  email: '',
  subject: '',
  body: '',
  phone: '',
  smsPhone: '',
  smsBody: '',
  ssid: '',
  password: '',
  encryption: 'WPA',
  hidden: 'false',
  firstName: '',
  lastName: '',
  company: '',
  jobTitle: '',
  contactPhone: '',
  contactEmail: '',
  website: '',
  address: '',
  eventTitle: '',
  eventLocation: '',
  eventStart: '',
  eventEnd: '',
  eventDescription: '',
};

export type Fields = typeof INITIAL_FIELDS;
export type FieldName = keyof Fields;

// Maximum byte-mode payload for QR version 40 with high error correction.
export const MAX_QR_BYTES = 1273;

function escapeWifi(value: string) {
  return value.replace(/[\\;,:"]/g, (character) => `\\${character}`);
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function websiteUrl(value: string) {
  const clean = value.trim();
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(clean);
  const hostWithPort = /^[^/?#\s]+:\d+(?:[/?#]|$)/.test(clean);
  const url = new URL(hasScheme && !hostWithPort ? clean : `https://${clean}`);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname)
    throw new Error('Enter a valid http:// or https:// website address.');
  return url.href;
}

function formatEventDate(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error('Enter a valid event date and time.');
  const normalized = `${match[1]}T${match[2]}:${match[3] ?? '00'}`;
  const date = new Date(`${normalized}Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 19) !== normalized
  )
    throw new Error('Enter a valid event date and time.');
  return normalized.replace(/[-:]/g, '');
}

function emailAddress(value: string) {
  const clean = value.trim();
  if (!/^[^\s@?&#:;,<>]+@[^\s@?&#:;,<>]+$/.test(clean))
    throw new Error('Enter a valid email address.');
  return clean;
}

function phoneNumber(value: string) {
  const compact = value.replace(/\s/g, '');
  const match = /^(\+?[\d().-]+)(?:(?:x|ext\.?)(\d+))?$/i.exec(compact);
  if (!match || !/\d/.test(match[1]))
    throw new Error('Enter a valid phone number.');
  return `${match[1]}${match[2] ? `;ext=${match[2]}` : ''}`;
}

export function buildPayload(type: ContentType, fields: Fields): string {
  switch (type) {
    case 'url':
      return fields.url.trim() ? websiteUrl(fields.url) : '';
    case 'text':
      return fields.text.trim() ? fields.text : '';
    case 'email': {
      if (!fields.email.trim()) {
        if (fields.subject || fields.body)
          throw new Error('Add a recipient email address.');
        return '';
      }
      // Encode spaces as %20: mailto readers do not all interpret form-style +.
      const params = [
        fields.subject &&
          `subject=${encodeURIComponent(fields.subject.toWellFormed())}`,
        fields.body && `body=${encodeURIComponent(fields.body.toWellFormed())}`,
      ].filter(Boolean);
      return `mailto:${emailAddress(fields.email)}${params.length ? `?${params.join('&')}` : ''}`;
    }
    case 'phone':
      return fields.phone.trim() ? `tel:${phoneNumber(fields.phone)}` : '';
    case 'sms': {
      if (!fields.smsPhone.trim()) {
        if (fields.smsBody) throw new Error('Add a recipient phone number.');
        return '';
      }
      return `SMSTO:${phoneNumber(fields.smsPhone)}:${fields.smsBody}`;
    }
    case 'wifi':
      return fields.ssid.trim()
        ? `WIFI:T:${fields.encryption};S:${escapeWifi(fields.ssid)};${fields.encryption === 'nopass' ? '' : `P:${escapeWifi(fields.password)};`}H:${fields.hidden};;`
        : '';
    case 'contact': {
      if (!fields.firstName.trim() && !fields.lastName.trim()) {
        if (
          [
            fields.company,
            fields.jobTitle,
            fields.contactPhone,
            fields.contactEmail,
            fields.website,
            fields.address,
          ].some(Boolean)
        )
          throw new Error('Add a first or last name for this contact.');
        return '';
      }
      const fullName = `${fields.firstName} ${fields.lastName}`.trim();
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${escapeText(fields.lastName)};${escapeText(fields.firstName)};;;`,
        `FN:${escapeText(fullName)}`,
        fields.company && `ORG:${escapeText(fields.company)}`,
        fields.jobTitle && `TITLE:${escapeText(fields.jobTitle)}`,
        fields.contactPhone.trim() &&
          `TEL;TYPE=CELL:${phoneNumber(fields.contactPhone)}`,
        fields.contactEmail.trim() &&
          `EMAIL:${emailAddress(fields.contactEmail)}`,
        fields.website.trim() && `URL:${websiteUrl(fields.website)}`,
        fields.address && `ADR;TYPE=WORK:;;${escapeText(fields.address)};;;;`,
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\r\n');
    }
    case 'event': {
      if (
        !fields.eventTitle.trim() &&
        !fields.eventStart &&
        !fields.eventEnd &&
        !fields.eventLocation &&
        !fields.eventDescription
      )
        return '';
      if (!fields.eventTitle.trim()) throw new Error('Add an event title.');
      if (!fields.eventStart)
        throw new Error('Add an event start date and time.');
      const start = formatEventDate(fields.eventStart);
      const end = fields.eventEnd ? formatEventDate(fields.eventEnd) : '';
      if (end && end <= start)
        throw new Error('The event end must be after its start.');
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `SUMMARY:${escapeText(fields.eventTitle)}`,
        `DTSTART:${start}`,
        end && `DTEND:${end}`,
        fields.eventLocation && `LOCATION:${escapeText(fields.eventLocation)}`,
        fields.eventDescription &&
          `DESCRIPTION:${escapeText(fields.eventDescription)}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ]
        .filter(Boolean)
        .join('\r\n');
    }
  }
}

export function prepareContent(type: ContentType, fields: Fields) {
  try {
    const payload = buildPayload(type, fields).toWellFormed();
    const bytes = new TextEncoder().encode(payload).length;
    return {
      payload,
      bytes,
      error:
        bytes > MAX_QR_BYTES
          ? `Content is too long (${bytes.toLocaleString('en-US')} / ${MAX_QR_BYTES.toLocaleString('en-US')} bytes). Shorten it to create a QR code.`
          : '',
    };
  } catch (error) {
    return {
      payload: '',
      bytes: 0,
      error:
        error instanceof Error
          ? error.message
          : 'Check the content and try again.',
    };
  }
}

// Both QR libraries use a legacy one-byte string conversion. Pass UTF-8 bytes
// as a binary string so the matrix, its margins, and the exported data agree.
export function toQrByteString(payload: string) {
  return Array.from(new TextEncoder().encode(payload), (byte) =>
    String.fromCharCode(byte),
  ).join('');
}
