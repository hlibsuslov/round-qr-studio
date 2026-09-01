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
  ArrowLeftRight,
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
  Search,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const FOREGROUND_PRESETS = [
  '#11130f',
  '#173c2b',
  '#153e75',
  '#5b21b6',
  '#9f1239',
  '#ffffff',
];
const BACKGROUND_PRESETS = [
  '#ffffff',
  '#f4f1e8',
  '#dff86a',
  '#dff5ff',
  '#f3e8ff',
  '#11130f',
];
const CURATED_ICONS = [
  'mdi:account',
  'mdi:web',
  'mdi:email',
  'mdi:phone',
  'mdi:wifi',
  'mdi:map-marker',
  'mdi:calendar',
  'mdi:heart',
  'mdi:star',
  'mdi:instagram',
  'mdi:linkedin',
  'mdi:cart',
  'mdi:ticket',
  'mdi:coffee',
  'mdi:food',
  'mdi:music',
  'mdi:camera',
  'mdi:briefcase',
  'mdi:home',
  'mdi:airplane',
  'mdi:gift',
  'mdi:lightning-bolt',
  'mdi:check-circle',
  'mdi:arrow-right',
];

function luminance(hex: string) {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)
    ?.map((value) => parseInt(value, 16) / 255) ?? [0, 0, 0];
  const linear = rgb.map((value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first: string, second: string) {
  const high = Math.max(luminance(first), luminance(second));
  const low = Math.min(luminance(first), luminance(second));
  return (high + 0.05) / (low + 0.05);
}

function decorationPoints(shape: ShapeType) {
  const points: { x: number; y: number; r: number }[] = [];
  for (let y = 30; y <= 730; y += 18) {
    for (let x = 30; x <= 730; x += 18) {
      const jitter = ((x * 17 + y * 31) % 9) - 4;
      const px = x + jitter;
      const insideCircle = Math.hypot(px - 380, y - 380) <= 355;
      const insideSquare = px >= 28 && px <= 732 && y >= 28 && y <= 732;
      const insideHex =
        px >= 18 + Math.abs(y - 380) * 0.49 &&
        px <= 742 - Math.abs(y - 380) * 0.49;
      const halfWidth = Math.max(0, (y - 18) * 0.505);
      const insideTriangle =
        y >= 18 && px >= 380 - halfWidth && px <= 380 + halfWidth;
      const masks = {
        circle: insideCircle,
        square: insideSquare,
        hexagon: insideHex,
        triangle: insideTriangle,
      };
      const outsideCore =
        shape === 'triangle'
          ? !(px > 140 && px < 620 && y > 210 && y < 748)
          : !(px > 82 && px < 678 && y > 82 && y < 678);
      if (masks[shape] && outsideCore && (x * 3 + y * 5) % 13 !== 0) {
        points.push({ x: px, y, r: 5 + ((x + y) % 2) });
      }
    }
  }
  return points;
}

function decorativeSvg(shape: ShapeType, color: string, style: DotStyle) {
  return decorationPoints(shape)
    .map(({ x, y, r }) => {
      if (style === 'dots') {
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
      }
      const radius = style === 'square' || style === 'classy' ? 1.5 : r;
      return `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" rx="${radius}" fill="${color}"/>`;
    })
    .join('');
}

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
  iconData: string,
) {
  return {
    width: 640,
    height: 640,
    type: 'svg' as const,
    shape: shape === 'circle' ? ('circle' as const) : ('square' as const),
    data: payload || ' ',
    image: iconData || undefined,
    margin: 46,
    qrOptions: { errorCorrectionLevel: 'H' as const },
    dotsOptions: { color, type: dotStyle },
    cornersSquareOptions: { color, type: eyeStyle },
    cornersDotOptions: {
      color,
      type: eyeStyle === 'square' ? ('square' as const) : ('dot' as const),
    },
    backgroundOptions: { color: 'rgba(255,255,255,0)' },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.24,
      margin: 8,
    },
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
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [dotStyle, setDotStyle] = useState<DotStyle>('dots');
  const [eyeStyle, setEyeStyle] = useState<EyeStyle>('extra-rounded');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [iconData, setIconData] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRInstance | null>(null);
  const payload = useMemo(
    () => buildPayload(contentType, fields),
    [contentType, fields],
  );
  const contrast = contrastRatio(color, backgroundColor);

  useEffect(() => {
    if (!selectedIcon) {
      setIconData('');
      return;
    }
    const [prefix, ...parts] = selectedIcon.split(':');
    const name = parts.join(':');
    const controller = new AbortController();
    fetch(
      `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent(color)}`,
      { signal: controller.signal },
    )
      .then((response) =>
        response.ok
          ? response.text()
          : Promise.reject(new Error('Icon unavailable')),
      )
      .then((svg) =>
        setIconData(`data:image/svg+xml,${encodeURIComponent(svg)}`),
      )
      .catch(() => setIconData(''));
    return () => controller.abort();
  }, [selectedIcon, color]);

  useEffect(() => {
    let cancelled = false;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return;
      const qr = new QRCodeStyling(
        qrOptions(payload, color, dotStyle, eyeStyle, shape, iconData),
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
    qrRef.current?.update(
      qrOptions(payload, color, dotStyle, eyeStyle, shape, iconData),
    );
  }, [payload, color, dotStyle, eyeStyle, shape, iconData]);

  function compositeSvg() {
    const inner = containerRef.current?.querySelector('svg')?.outerHTML;
    if (!inner) return '';
    const placements: Record<
      ShapeType,
      { x: number; y: number; size: number }
    > = {
      circle: { x: 70, y: 70, size: 620 },
      square: { x: 70, y: 70, size: 620 },
      hexagon: { x: 100, y: 100, size: 560 },
      triangle: { x: 170, y: 245, size: 420 },
    };
    const backgrounds: Record<ShapeType, string> = {
      circle: `<circle cx="380" cy="380" r="360" fill="${backgroundColor}"/>`,
      square: `<rect x="25" y="25" width="710" height="710" rx="58" fill="${backgroundColor}"/>`,
      hexagon: `<polygon points="190,25 570,25 745,380 570,735 190,735 15,380" fill="${backgroundColor}"/>`,
      triangle: `<polygon points="380,18 744,735 16,735" fill="${backgroundColor}"/>`,
    };
    const current = placements[shape];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="760" viewBox="0 0 760 760">${backgrounds[shape]}${decorativeSvg(shape, color, dotStyle)}<svg x="${current.x}" y="${current.y}" width="${current.size}" height="${current.size}" viewBox="0 0 640 640">${inner}</svg></svg>`;
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

  function applyForeground(next: string) {
    setColor(next);
    if (contrastRatio(next, backgroundColor) < 4.5) {
      setBackgroundColor(luminance(next) > 0.5 ? '#11130f' : '#ffffff');
    }
  }

  function applyBackground(next: string) {
    setBackgroundColor(next);
    if (contrastRatio(color, next) < 4.5) {
      setColor(luminance(next) > 0.5 ? '#11130f' : '#ffffff');
    }
  }

  function makeHighContrast() {
    setColor(luminance(backgroundColor) > 0.5 ? '#11130f' : '#ffffff');
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
          <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">
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
              <div className="choice-strip grid grid-cols-4 gap-2">
                {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setContentType(value)}
                    aria-pressed={contentType === value}
                    className="choice-card flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border bg-background px-2 text-xs font-medium transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
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
              <div className="choice-strip grid grid-cols-4 gap-2">
                {SHAPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setShape(value)}
                    aria-pressed={shape === value}
                    className="choice-card rounded-xl border bg-background px-2 py-3 text-xs font-medium transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
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
              <div className="choice-strip grid grid-cols-3 gap-2">
                {DOT_STYLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDotStyle(value)}
                    aria-pressed={dotStyle === value}
                    className="choice-card min-h-11 rounded-xl border bg-background px-2 py-2.5 text-xs font-medium transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="mb-3 text-sm font-semibold">
                4. Refine the details
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Finder style
                  </span>
                  <Select
                    value={eyeStyle}
                    onValueChange={(value) => setEyeStyle(value as EyeStyle)}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl bg-background px-3 text-sm shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      className="rounded-xl p-1 shadow-xl"
                    >
                      <SelectItem value="extra-rounded" className="py-2.5">
                        Rounded corners
                      </SelectItem>
                      <SelectItem value="dot" className="py-2.5">
                        Circular eyes
                      </SelectItem>
                      <SelectItem value="square" className="py-2.5">
                        Classic square
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Center icon
                  </span>
                  <div className="flex gap-2">
                    <IconPicker
                      selected={selectedIcon}
                      onSelect={setSelectedIcon}
                    />
                    {selectedIcon && (
                      <Button
                        variant="outline"
                        size="icon-lg"
                        className="h-11 rounded-xl"
                        aria-label="Remove center icon"
                        onClick={() => setSelectedIcon('')}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  5. Choose a contrast-safe palette
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${contrast >= 4.5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                >
                  {contrast.toFixed(1)}:1 contrast
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorPicker
                  label="QR modules"
                  value={color}
                  presets={FOREGROUND_PRESETS}
                  onChange={applyForeground}
                />
                <ColorPicker
                  label="Shape background"
                  value={backgroundColor}
                  presets={BACKGROUND_PRESETS}
                  onChange={applyBackground}
                />
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl"
                  onClick={() => {
                    const previous = color;
                    setColor(backgroundColor);
                    setBackgroundColor(previous);
                  }}
                >
                  <ArrowLeftRight /> Swap colors
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl"
                  onClick={makeHighContrast}
                >
                  <Sparkles /> Auto contrast
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" />
            Everything is generated locally in your browser.
          </p>
        </div>

        <div className="flex min-h-[620px] flex-col overflow-hidden rounded-[30px] bg-[#dff86a] p-5 sm:min-h-[720px] sm:p-8 lg:sticky lg:top-4 lg:h-[calc(100vh-32px)] lg:max-h-[940px]">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border-[44px] border-black/[0.045]" />
          <div className="relative z-10 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
            <span>{shape} preview</span>
            <span>
              {ready ? (payload ? 'Ready' : 'Waiting for data') : 'Loading'}
            </span>
          </div>
          <div className="relative z-10 flex flex-1 items-center justify-center py-8">
            <div
              className={`qr-shape qr-shape-${shape}`}
              style={{ backgroundColor }}
            >
              {decorationPoints(shape).length > 0 && (
                <svg
                  className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
                  viewBox="0 0 760 760"
                  aria-hidden="true"
                >
                  {decorationPoints(shape).map(({ x, y, r }) =>
                    dotStyle === 'dots' ? (
                      <circle
                        key={`${x}-${y}`}
                        cx={x}
                        cy={y}
                        r={r}
                        fill={color}
                      />
                    ) : (
                      <rect
                        key={`${x}-${y}`}
                        x={x - r}
                        y={y - r}
                        width={r * 2}
                        height={r * 2}
                        rx={
                          dotStyle === 'square' || dotStyle === 'classy'
                            ? 1.5
                            : r
                        }
                        fill={color}
                      />
                    ),
                  )}
                </svg>
              )}
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
                <div
                  className="absolute inset-0 z-20 grid place-items-center px-16 text-center text-sm font-semibold"
                  style={{ color }}
                >
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

function ColorPicker({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-background p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold">{label}</span>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-2 py-1.5">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            {value}
          </span>
          <span
            className="size-5 rounded-md border"
            style={{ backgroundColor: value }}
          />
          <input
            className="sr-only"
            aria-label={`Custom ${label} color`}
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`Use color ${preset}`}
            aria-pressed={value === preset}
            onClick={() => onChange(preset)}
            className="aspect-square rounded-lg border border-black/10 shadow-sm outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-black"
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>
    </div>
  );
}

function IconPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>(CURATED_ICONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setResults(CURATED_ICONS);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(clean)}&limit=96`,
        { signal: controller.signal },
      )
        .then(
          async (response) => (await response.json()) as { icons?: string[] },
        )
        .then((data) => setResults(data.icons ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="h-11 flex-1 justify-start rounded-xl bg-background px-3"
          />
        }
      >
        {selected ? (
          <>
            <Icon icon={selected} className="size-5" />
            <span className="min-w-0 truncate">{selected}</span>
          </>
        ) : (
          <>
            <Search />
            <span>Browse icons</span>
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] max-w-2xl overflow-hidden rounded-3xl p-0">
        <DialogHeader className="border-b p-5 pr-14">
          <DialogTitle className="text-xl">Choose a center icon</DialogTitle>
          <DialogDescription>
            Search more than 300,000 open-source SVG icons from Iconify. The
            selected SVG is embedded into your download.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-1">
          <label className="flex h-12 items-center gap-2 rounded-xl border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
            <Search className="size-4 text-muted-foreground" />
            <Input
              className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons: coffee, camera, arrow…"
              autoFocus
            />
          </label>
        </div>
        <div className="min-h-56 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
              Searching Iconify…
            </div>
          ) : results.length ? (
            <div className="grid grid-cols-6 gap-2 pt-3 sm:grid-cols-8">
              {results.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  title={icon}
                  onClick={() => {
                    onSelect(icon);
                    setOpen(false);
                  }}
                  className="grid aspect-square place-items-center rounded-xl border bg-background text-foreground transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon icon={icon} className="size-6" />
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
              No icons found. Try another keyword.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
          <span>Powered by Iconify open-source icon sets</span>
          <DialogClose render={<Button variant="ghost" size="sm" />}>
            Close
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
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
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Security
          </span>
          <Select
            value={fields.encryption}
            onValueChange={(value) =>
              setFields((current) => ({
                ...current,
                encryption: value as string,
              }))
            }
          >
            <SelectTrigger className="h-10 w-full rounded-xl bg-white px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" className="rounded-xl p-1 shadow-xl">
              <SelectItem value="WPA" className="py-2.5">
                WPA / WPA2
              </SelectItem>
              <SelectItem value="WEP" className="py-2.5">
                WEP
              </SelectItem>
              <SelectItem value="nopass" className="py-2.5">
                No password
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
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
