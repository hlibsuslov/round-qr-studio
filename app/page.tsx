'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  CalendarDays,
  Check,
  ContactRound,
  Copy,
  Download,
  FileText,
  Link,
  Mail,
  MessageSquare,
  Phone,
  QrCode,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type ContentType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'wifi'
  | 'contact'
  | 'event';
type ShapeType = 'circle' | 'square' | 'hexagon' | 'triangle';
type DotStyle =
  | 'square'
  | 'dots'
  | 'rounded'
  | 'classy'
  | 'classy-rounded'
  | 'extra-rounded';
type EyeStyle = 'square' | 'dot' | 'extra-rounded';
type Fields = Record<string, string>;
type QRInstance = {
  append: (element: HTMLElement) => void;
  update: (options: Record<string, unknown>) => void;
};

const CONTENT_TYPES = [
  { value: 'url', label: 'Link', icon: Link },
  { value: 'text', label: 'Text', icon: FileText },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { value: 'contact', label: 'Contact', icon: ContactRound },
  { value: 'event', label: 'Event', icon: CalendarDays },
] as const;

const SHAPES: { value: ShapeType; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'triangle', label: 'Triangle' },
];

const DOT_STYLES: { value: DotStyle; label: string }[] = [
  { value: 'square', label: 'Pixels' },
  { value: 'dots', label: 'Dots' },
  { value: 'rounded', label: 'Soft' },
  { value: 'classy', label: 'Cut' },
  { value: 'classy-rounded', label: 'Flow' },
  { value: 'extra-rounded', label: 'Pills' },
];

const INITIAL_FIELDS: Fields = {
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

function escapeWifi(value: string) {
  return value.replace(/[\\;,:"]/g, (character) => `\\${character}`);
}

function escapeVCard(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatEventDate(value: string) {
  return value.replace(/[-:]/g, '').replace('T', 'T').slice(0, 13) + '00';
}

function buildPayload(type: ContentType, fields: Fields) {
  switch (type) {
    case 'url': {
      const value = fields.url.trim();
      if (!value) return '';
      return /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
    }
    case 'text':
      return fields.text.trim();
    case 'email': {
      if (!fields.email.trim()) return '';
      const params = new URLSearchParams();
      if (fields.subject) params.set('subject', fields.subject);
      if (fields.body) params.set('body', fields.body);
      return `mailto:${fields.email.trim()}${params.size ? `?${params.toString()}` : ''}`;
    }
    case 'phone':
      return fields.phone.trim()
        ? `tel:${fields.phone.trim().replace(/\s/g, '')}`
        : '';
    case 'sms':
      return fields.smsPhone.trim()
        ? `SMSTO:${fields.smsPhone.trim().replace(/\s/g, '')}:${fields.smsBody}`
        : '';
    case 'wifi':
      return fields.ssid.trim()
        ? `WIFI:T:${fields.encryption};S:${escapeWifi(fields.ssid)};P:${escapeWifi(fields.password)};H:${fields.hidden};;`
        : '';
    case 'contact': {
      if (!fields.firstName.trim() && !fields.lastName.trim()) return '';
      const fullName = `${fields.firstName} ${fields.lastName}`.trim();
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${escapeVCard(fields.lastName)};${escapeVCard(fields.firstName)};;;`,
        `FN:${escapeVCard(fullName)}`,
        fields.company && `ORG:${escapeVCard(fields.company)}`,
        fields.jobTitle && `TITLE:${escapeVCard(fields.jobTitle)}`,
        fields.contactPhone && `TEL;TYPE=CELL:${fields.contactPhone}`,
        fields.contactEmail && `EMAIL:${fields.contactEmail}`,
        fields.website && `URL:${fields.website}`,
        fields.address && `ADR;TYPE=WORK:;;${escapeVCard(fields.address)};;;;`,
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\r\n');
    }
    case 'event':
      return fields.eventTitle.trim() && fields.eventStart
        ? [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `SUMMARY:${escapeVCard(fields.eventTitle)}`,
            `DTSTART:${formatEventDate(fields.eventStart)}`,
            fields.eventEnd && `DTEND:${formatEventDate(fields.eventEnd)}`,
            fields.eventLocation &&
              `LOCATION:${escapeVCard(fields.eventLocation)}`,
            fields.eventDescription &&
              `DESCRIPTION:${escapeVCard(fields.eventDescription)}`,
            'END:VEVENT',
            'END:VCALENDAR',
          ]
            .filter(Boolean)
            .join('\r\n')
        : '';
  }
}

function qrOptions(
  payload: string,
  color: string,
  dotStyle: DotStyle,
  eyeStyle: EyeStyle,
  shape: ShapeType,
) {
  return {
    width: 640,
    height: 640,
    type: 'svg' as const,
    shape: shape === 'circle' ? ('circle' as const) : ('square' as const),
    data: payload || ' ',
    margin: 46,
    qrOptions: { errorCorrectionLevel: 'H' as const },
    dotsOptions: { color, type: dotStyle },
    cornersSquareOptions: { color, type: eyeStyle },
    cornersDotOptions: {
      color,
      type: eyeStyle === 'square' ? ('square' as const) : ('dot' as const),
    },
    backgroundOptions: { color: 'rgba(255,255,255,0)' },
  };
}

function Field({
  label,
  name,
  fields,
  setFields,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  fields: Fields;
  setFields: Dispatch<SetStateAction<Fields>>;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <Input
        className="h-10 rounded-xl bg-background"
        type={type}
        value={fields[name]}
        placeholder={placeholder}
        onChange={(event) =>
          setFields((current) => ({ ...current, [name]: event.target.value }))
        }
      />
    </label>
  );
}

export default function Home() {
  const [contentType, setContentType] = useState<ContentType>('url');
  const [fields, setFields] = useState<Fields>(INITIAL_FIELDS);
  const [shape, setShape] = useState<ShapeType>('circle');
  const [color, setColor] = useState('#11130f');
  const [dotStyle, setDotStyle] = useState<DotStyle>('dots');
  const [eyeStyle, setEyeStyle] = useState<EyeStyle>('extra-rounded');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRInstance | null>(null);
  const payload = useMemo(
    () => buildPayload(contentType, fields),
    [contentType, fields],
  );

  useEffect(() => {
    let cancelled = false;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return;
      const qr = new QRCodeStyling(
        qrOptions(payload, color, dotStyle, eyeStyle, shape),
      );
      qr.append(containerRef.current);
      qrRef.current = qr as unknown as QRInstance;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    qrRef.current?.update(qrOptions(payload, color, dotStyle, eyeStyle, shape));
  }, [payload, color, dotStyle, eyeStyle, shape]);

  function compositeSvg() {
    const inner = containerRef.current?.querySelector('svg')?.outerHTML;
    if (!inner) return '';
    const placements: Record<
      ShapeType,
      { x: number; y: number; size: number; background: string }
    > = {
      circle: {
        x: 70,
        y: 70,
        size: 620,
        background: '<circle cx="380" cy="380" r="360" fill="white"/>',
      },
      square: {
        x: 70,
        y: 70,
        size: 620,
        background:
          '<rect x="25" y="25" width="710" height="710" rx="58" fill="white"/>',
      },
      hexagon: {
        x: 100,
        y: 100,
        size: 560,
        background:
          '<polygon points="190,25 570,25 745,380 570,735 190,735 15,380" fill="white"/>',
      },
      triangle: {
        x: 170,
        y: 245,
        size: 420,
        background: '<polygon points="380,18 744,735 16,735" fill="white"/>',
      },
    };
    const current = placements[shape];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="760" viewBox="0 0 760 760">${current.background}<svg x="${current.x}" y="${current.y}" width="${current.size}" height="${current.size}" viewBox="0 0 640 640">${inner}</svg></svg>`;
  }

  async function download(extension: 'png' | 'svg') {
    const source = compositeSvg();
    if (!source || !payload) return;
    const name = `${shape}-${contentType}-qr`;
    if (extension === 'svg') {
      const url = URL.createObjectURL(
        new Blob([source], { type: 'image/svg+xml' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${name}.svg`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    const image = new Image();
    const sourceUrl = URL.createObjectURL(
      new Blob([source], { type: 'image/svg+xml' }),
    );
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1520;
      canvas.height = 1520;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0, 1520, 1520);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${name}.png`;
        anchor.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
      URL.revokeObjectURL(sourceUrl);
    };
    image.src = sourceUrl;
  }

  async function copyPayload() {
    if (!payload) return;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <QrCode className="size-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Open source tool
            </p>
            <p className="font-semibold tracking-tight">Round QR Studio</p>
          </div>
        </div>
        <span className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
          <ShieldCheck className="size-4 text-accent" /> High error correction
        </span>
      </header>

      <section className="mx-auto grid w-full max-w-[1440px] gap-6 px-5 pb-10 sm:px-8 lg:grid-cols-[minmax(470px,0.95fr)_minmax(500px,1.05fr)] lg:px-10 lg:pb-14">
        <div className="rounded-[30px] border bg-card p-5 shadow-[0_20px_70px_rgba(13,24,18,0.06)] sm:p-7">
          <span className="inline-flex rounded-full bg-accent/12 px-3 py-1.5 text-xs font-semibold text-accent">
            DESIGN / ENCODE / SCAN
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">
            Shape your scan.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Create recognizable QR actions for links, contacts, Wi-Fi and more —
            then wrap the reliable QR core in a distinctive silhouette.
          </p>

          <div className="mt-7 space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">
                1. Choose what it does
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setContentType(value)}
                    aria-pressed={contentType === value}
                    className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-medium transition hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="rounded-2xl border bg-[#f7f7f2] p-4">
              <ContentFields
                type={contentType}
                fields={fields}
                setFields={setFields}
              />
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">
                2. Pick a silhouette
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {SHAPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setShape(value)}
                    aria-pressed={shape === value}
                    className="rounded-xl border px-2 py-3 text-xs font-medium transition hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    <span className={`shape-swatch shape-swatch-${value}`} />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">
                3. Style the modules
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {DOT_STYLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDotStyle(value)}
                    aria-pressed={dotStyle === value}
                    className="rounded-xl border px-2 py-2.5 text-xs font-medium transition hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between rounded-2xl border bg-background p-3">
                <span>
                  <span className="block text-xs font-semibold">QR color</span>
                  <span className="font-mono text-[11px] uppercase text-muted-foreground">
                    {color}
                  </span>
                </span>
                <input
                  aria-label="QR color"
                  className="h-9 w-12 cursor-pointer rounded-lg border bg-transparent p-1"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </label>
              <label className="rounded-2xl border bg-background p-3">
                <span className="mb-1 block text-xs font-semibold">
                  Finder style
                </span>
                <select
                  className="w-full bg-transparent text-xs outline-none"
                  value={eyeStyle}
                  onChange={(event) =>
                    setEyeStyle(event.target.value as EyeStyle)
                  }
                >
                  <option value="extra-rounded">Rounded</option>
                  <option value="dot">Circular</option>
                  <option value="square">Square</option>
                </select>
              </label>
            </div>
          </div>

          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" />
            Everything is generated locally in your browser.
          </p>
        </div>

        <div className="sticky top-4 flex min-h-[720px] flex-col overflow-hidden rounded-[30px] bg-[#dff86a] p-5 sm:p-8 lg:h-[calc(100vh-32px)] lg:max-h-[940px]">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border-[44px] border-black/[0.045]" />
          <div className="relative z-10 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
            <span>{shape} preview</span>
            <span>
              {ready ? (payload ? 'Ready' : 'Waiting for data') : 'Loading'}
            </span>
          </div>
          <div className="relative z-10 flex flex-1 items-center justify-center py-8">
            <div className={`qr-shape qr-shape-${shape}`}>
              <div
                ref={containerRef}
                className={`qr-canvas qr-canvas-${shape} ${payload ? '' : 'opacity-0'} [&>svg]:h-full [&>svg]:w-full`}
                aria-label={
                  payload
                    ? `${contentType} QR code`
                    : 'QR preview waiting for data'
                }
              />
              {!payload && (
                <div className="absolute inset-0 z-20 grid place-items-center px-16 text-center text-sm font-semibold text-black/50">
                  Enter the details on the left to create your QR code.
                </div>
              )}
            </div>
          </div>
          <div className="relative z-10 mb-3 flex items-center gap-2 rounded-2xl bg-black/[0.06] p-2 text-xs text-black/60">
            <code className="min-w-0 flex-1 truncate px-2">
              {payload || 'No encoded data yet'}
            </code>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy encoded data"
              onClick={copyPayload}
              disabled={!payload}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3">
            <Button
              className="h-12 rounded-2xl bg-black text-white hover:bg-black/80"
              onClick={() => download('png')}
              disabled={!ready || !payload}
            >
              <Download data-icon="inline-start" /> PNG
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-black/15 bg-white/55 text-black hover:bg-white"
              onClick={() => download('svg')}
              disabled={!ready || !payload}
            >
              <Download data-icon="inline-start" /> SVG
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContentFields({
  type,
  fields,
  setFields,
}: {
  type: ContentType;
  fields: Fields;
  setFields: Dispatch<SetStateAction<Fields>>;
}) {
  if (type === 'url')
    return (
      <Field
        label="Website address"
        name="url"
        fields={fields}
        setFields={setFields}
        placeholder="example.com"
        type="url"
      />
    );
  if (type === 'text')
    return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          Plain text
        </span>
        <Textarea
          className="min-h-24 rounded-xl bg-white"
          value={fields.text}
          placeholder="Type anything you want to share"
          onChange={(event) =>
            setFields((current) => ({ ...current, text: event.target.value }))
          }
        />
      </label>
    );
  if (type === 'email')
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Recipient email"
          name="email"
          fields={fields}
          setFields={setFields}
          placeholder="hello@example.com"
          type="email"
        />
        <Field
          label="Subject"
          name="subject"
          fields={fields}
          setFields={setFields}
          placeholder="Hello"
        />
        <div className="sm:col-span-2">
          <Field
            label="Message"
            name="body"
            fields={fields}
            setFields={setFields}
            placeholder="Optional pre-filled message"
          />
        </div>
      </div>
    );
  if (type === 'phone')
    return (
      <Field
        label="Phone number"
        name="phone"
        fields={fields}
        setFields={setFields}
        placeholder="+1 555 123 4567"
        type="tel"
      />
    );
  if (type === 'sms')
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Phone number"
          name="smsPhone"
          fields={fields}
          setFields={setFields}
          placeholder="+1 555 123 4567"
          type="tel"
        />
        <Field
          label="Message"
          name="smsBody"
          fields={fields}
          setFields={setFields}
          placeholder="Optional message"
        />
      </div>
    );
  if (type === 'wifi')
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Network name (SSID)"
          name="ssid"
          fields={fields}
          setFields={setFields}
          placeholder="Studio Wi-Fi"
        />
        <Field
          label="Password"
          name="password"
          fields={fields}
          setFields={setFields}
          placeholder="Network password"
        />
        <label>
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Security
          </span>
          <select
            className="h-10 w-full rounded-xl border bg-white px-3 text-sm"
            value={fields.encryption}
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                encryption: event.target.value,
              }))
            }
          >
            <option value="WPA">WPA / WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">No password</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={fields.hidden === 'true'}
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                hidden: String(event.target.checked),
              }))
            }
          />
          Hidden network
        </label>
      </div>
    );
  if (type === 'contact')
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="First name"
          name="firstName"
          fields={fields}
          setFields={setFields}
          placeholder="Alex"
        />
        <Field
          label="Last name"
          name="lastName"
          fields={fields}
          setFields={setFields}
          placeholder="Morgan"
        />
        <Field
          label="Company"
          name="company"
          fields={fields}
          setFields={setFields}
          placeholder="Company"
        />
        <Field
          label="Job title"
          name="jobTitle"
          fields={fields}
          setFields={setFields}
          placeholder="Product designer"
        />
        <Field
          label="Phone"
          name="contactPhone"
          fields={fields}
          setFields={setFields}
          placeholder="+1 555 123 4567"
          type="tel"
        />
        <Field
          label="Email"
          name="contactEmail"
          fields={fields}
          setFields={setFields}
          placeholder="alex@example.com"
          type="email"
        />
        <Field
          label="Website"
          name="website"
          fields={fields}
          setFields={setFields}
          placeholder="https://example.com"
        />
        <Field
          label="Address"
          name="address"
          fields={fields}
          setFields={setFields}
          placeholder="Street, city, country"
        />
      </div>
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label="Event title"
        name="eventTitle"
        fields={fields}
        setFields={setFields}
        placeholder="Design review"
      />
      <Field
        label="Location"
        name="eventLocation"
        fields={fields}
        setFields={setFields}
        placeholder="Meeting room or address"
      />
      <Field
        label="Starts"
        name="eventStart"
        fields={fields}
        setFields={setFields}
        type="datetime-local"
      />
      <Field
        label="Ends"
        name="eventEnd"
        fields={fields}
        setFields={setFields}
        type="datetime-local"
      />
      <div className="sm:col-span-2">
        <Field
          label="Description"
          name="eventDescription"
          fields={fields}
          setFields={setFields}
          placeholder="Optional event details"
        />
      </div>
    </div>
  );
}
