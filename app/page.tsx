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
  Code2,
  Copy,
  Download,
  FileText,
  Link,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import { Icon } from '@iconify/react';
import NextImage from 'next/image';
import {
  contrastRatio,
  ensureContrast,
  MIN_CONTRAST,
} from '@/lib/color-contrast';
import {
  composeQrSvg,
  QUIET_MODULES,
  type ShapeType,
  type DotStyle,
} from '@/lib/qr-shape';
import {
  INITIAL_FIELDS,
  MAX_QR_BYTES,
  prepareContent,
  toQrByteString,
  type ContentType,
  type FieldName,
  type Fields,
} from '@/lib/qr-content';

import { downloadQr } from '@/lib/qr-download';
import { Button } from '@/components/ui/button';
import {
  Dialog,
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

type EyeStyle = 'square' | 'dot' | 'extra-rounded';

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

function ModuleSample({ style }: { style: DotStyle }) {
  const cells = [
    [0, 0],
    [1, 0],
    [3, 0],
    [0, 1],
    [2, 1],
    [3, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 3],
    [1, 3],
  ];
  return (
    <svg
      viewBox="0 0 46 46"
      className="size-11"
      fill="currentColor"
      aria-hidden="true"
    >
      {cells.map(([x, y]) => {
        const key = `${x}-${y}`;
        if (style === 'dots')
          return <circle key={key} cx={x * 12 + 5} cy={y * 12 + 5} r="4" />;
        if (style === 'classy' || style === 'classy-rounded') {
          const radius = style === 'classy' ? 4 : 8;
          return (
            <path
              key={key}
              transform={`translate(${x * 12},${y * 12})`}
              d={`M${radius} 0H10V${10 - radius}Q10 10 ${10 - radius} 10H0V${radius}Q0 0 ${radius} 0Z`}
            />
          );
        }
        const radius = style === 'square' ? 0 : style === 'rounded' ? 2.5 : 5;
        return (
          <rect
            key={key}
            x={x * 12}
            y={y * 12}
            width="10"
            height="10"
            rx={radius}
          />
        );
      })}
    </svg>
  );
}

function qrOptions(
  payload: string,
  color: string,
  dotStyle: DotStyle,
  eyeStyle: EyeStyle,
  count: number,
  iconData: string,
) {
  return {
    width: 640,
    height: 640,
    type: 'svg' as const,
    shape: 'square' as const,
    data: payload || ' ',
    image: iconData || undefined,
    margin: (640 * QUIET_MODULES) / (count + QUIET_MODULES * 2),
    qrOptions: { errorCorrectionLevel: 'H' as const, mode: 'Byte' as const },
    dotsOptions: { color, type: dotStyle, roundSize: false },
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
  multiline = false,
  disabled = false,
  min,
}: {
  label: string;
  name: FieldName;
  fields: Fields;
  setFields: Dispatch<SetStateAction<Fields>>;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
  min?: string;
}) {
  const shared = {
    name,
    value: fields[name],
    placeholder,
    disabled,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setFields((current) => ({ ...current, [name]: event.target.value })),
  };
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {multiline ? (
        <Textarea className="min-h-24 rounded-sm bg-background" {...shared} />
      ) : (
        <Input
          className="h-10 rounded-sm bg-background"
          type={type}
          min={min}
          {...shared}
        />
      )}
    </label>
  );
}

export default function Home() {
  const [contentType, setContentType] = useState<ContentType>('url');
  const [fields, setFields] = useState<Fields>(INITIAL_FIELDS);
  const [shape, setShape] = useState<ShapeType>('circle');
  const [color, setColor] = useState('#11130f');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [dotStyle, setDotStyle] = useState<DotStyle>('dots');
  const [eyeStyle, setEyeStyle] = useState<EyeStyle>('extra-rounded');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [iconData, setIconData] = useState({ key: '', data: '', error: '' });
  const [iconAttempt, setIconAttempt] = useState(0);
  const [copyState, setCopyState] = useState({ payload: '', status: '' });
  const copyAttempt = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [downloading, setDownloading] = useState(false);
  const downloadLock = useRef(false);
  const [downloadFailure, setDownloadFailure] = useState({
    key: '',
    message: '',
  });
  const [rendered, setRendered] = useState({ key: '', svg: '' });
  const [renderFailure, setRenderFailure] = useState({ key: '', message: '' });
  const content = useMemo(
    () => prepareContent(contentType, fields),
    [contentType, fields],
  );
  const { payload } = content;
  const renderPayload = content.error ? '' : payload;
  const contrast = contrastRatio(color, backgroundColor);
  const qrBackground = transparentBackground ? null : backgroundColor;
  const iconKey = selectedIcon ? `${selectedIcon}:${color}:${iconAttempt}` : '';
  const iconPending = !!selectedIcon && iconData.key !== iconKey;
  const iconError =
    selectedIcon && iconData.key === iconKey ? iconData.error : '';
  const activeIconData =
    selectedIcon && iconData.key === iconKey ? iconData.data : '';
  const renderKey = JSON.stringify([
    renderPayload,
    color,
    qrBackground,
    dotStyle,
    eyeStyle,
    shape,
    activeIconData,
  ]);
  const ready =
    !!renderPayload &&
    !iconPending &&
    !iconError &&
    rendered.key === renderKey &&
    !!rendered.svg;
  const renderError =
    !ready && renderFailure.key === renderKey ? renderFailure.message : '';
  const previewSvg = ready
    ? rendered.svg
    : composeQrSvg(shape, qrBackground, color, dotStyle, 21);
  const previewSrc = useMemo(
    () => `data:image/svg+xml,${encodeURIComponent(previewSvg)}`,
    [previewSvg],
  );
  const previewMessage =
    content.error ||
    iconError ||
    renderError ||
    (!payload
      ? 'Enter the details on the left to create your QR code.'
      : iconPending
        ? 'Loading center icon…'
        : !ready
          ? 'Creating QR code…'
          : '');
  const copyStatus = copyState.payload === payload ? copyState.status : '';

  useEffect(() => {
    if (!selectedIcon) return;
    const [prefix, ...parts] = selectedIcon.split(':');
    const name = parts.join(':');
    const controller = new AbortController();
    fetch(
      `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent(color)}`,
      {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(12000),
        ]),
      },
    )
      .then((response) =>
        response.ok
          ? response.text()
          : Promise.reject(new Error('Icon unavailable')),
      )
      .then((svg) => {
        if (!controller.signal.aborted)
          setIconData({
            key: iconKey,
            data: `data:image/svg+xml,${encodeURIComponent(svg)}`,
            error: '',
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setIconData({
            key: iconKey,
            data: '',
            error: 'Center icon could not be loaded. Retry or remove it.',
          });
      });
    return () => controller.abort();
  }, [selectedIcon, color, iconKey]);

  useEffect(
    () => () => {
      copyAttempt.current++;
      clearTimeout(copyTimer.current);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let renderTimeout: number | undefined;
    if (!renderPayload || iconPending || iconError) return;
    async function render() {
      const [{ default: QRCodeStyling }, { default: qrcode }] =
        await Promise.all([
          import('qr-code-styling'),
          import('qrcode-generator'),
        ]);
      if (cancelled) return;
      const byteString = toQrByteString(renderPayload);
      const matrix = qrcode(0, 'H');
      matrix.addData(byteString, 'Byte');
      matrix.make();
      const count = matrix.getModuleCount();
      const qr = new QRCodeStyling(
        qrOptions(byteString, color, dotStyle, eyeStyle, count, activeIconData),
      );
      const data = await Promise.race([
        qr.getRawData('svg'),
        new Promise<never>((_, reject) => {
          renderTimeout = window.setTimeout(
            () => reject(new Error('QR rendering timed out')),
            12000,
          );
        }),
      ]);
      window.clearTimeout(renderTimeout);
      if (!(data instanceof Blob)) throw new Error('QR rendering failed');
      // getRawData includes an XML declaration, which cannot be nested in SVG.
      const core = (await data.text())
        .replace(/<\?xml[^?]*\?>\s*/, '')
        .replace(/url\('#([^']+)'\)/g, 'url(#$1)')
        .replace(
          'shape-rendering="crispEdges"',
          'shape-rendering="geometricPrecision"',
        );
      if (!cancelled)
        setRendered({
          key: renderKey,
          svg: composeQrSvg(
            shape,
            qrBackground,
            color,
            dotStyle,
            count,
            core,
            matrix,
          ),
        });
    }
    const timer = window.setTimeout(() => {
      void render().catch(() => {
        window.clearTimeout(renderTimeout);
        if (!cancelled)
          setRenderFailure({
            key: renderKey,
            message:
              'Unable to create this QR code. Try editing the content or removing the icon.',
          });
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(renderTimeout);
    };
  }, [
    renderPayload,
    iconPending,
    iconError,
    color,
    qrBackground,
    dotStyle,
    eyeStyle,
    shape,
    activeIconData,
    renderKey,
  ]);

  async function download(extension: 'png' | 'svg') {
    if (!ready || !payload || downloadLock.current) return;
    downloadLock.current = true;
    setDownloading(true);
    setDownloadFailure({ key: '', message: '' });
    try {
      await downloadQr(
        rendered.svg,
        `${shape}-${contentType}-qr${transparentBackground ? '-transparent' : ''}`,
        extension,
      );
    } catch {
      setDownloadFailure({
        key: renderKey,
        message: 'Download failed. Please try again or choose another format.',
      });
    } finally {
      downloadLock.current = false;
      setDownloading(false);
    }
  }

  async function copyPayload() {
    if (!payload || content.error) return;
    const attempt = ++copyAttempt.current;
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(payload);
      if (attempt !== copyAttempt.current) return;
      setCopyState({ payload, status: 'success' });
      copyTimer.current = setTimeout(
        () => setCopyState({ payload: '', status: '' }),
        1600,
      );
    } catch {
      if (attempt === copyAttempt.current)
        setCopyState({ payload, status: 'error' });
    }
  }

  function applyForeground(next: string) {
    setColor(next);
    setBackgroundColor(ensureContrast(backgroundColor, next));
  }

  function applyBackground(next: string) {
    setBackgroundColor(next);
    setColor(ensureContrast(color, next));
  }

  function makeHighContrast() {
    setColor(ensureContrast(color, backgroundColor));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="studio-header">
        <div className="flex items-center gap-3">
          <NextImage
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-sm"
            unoptimized
          />
          <div>
            <p className="font-semibold tracking-tight">Round QR Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/hlibsuslov/round-qr-studio"
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-10 items-center justify-center rounded-sm border bg-card text-foreground hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="View Round QR Studio source on GitHub"
            title="View source on GitHub"
          >
            <Code2 className="size-4" />
          </a>
        </div>
      </header>

      <section className="studio-layout">
        <div className="studio-editor">
          <h1 className="text-2xl font-semibold tracking-tight">
            QR code generator
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Add your content, customize the design, and export your QR code.
          </p>

          <div className="editor-settings">
            <fieldset>
              <legend className="section-label">Content</legend>
              <div className="grid grid-cols-4 gap-2">
                {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setContentType(value)}
                    aria-pressed={contentType === value}
                    className="content-choice visual-choice"
                  >
                    <Icon
                      className="size-7"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                    <span className="text-[11px] opacity-75">{label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <section
              aria-label="QR content"
              aria-describedby="content-feedback"
            >
              <ContentFields
                type={contentType}
                fields={fields}
                setFields={setFields}
              />
              <output
                id="content-feedback"
                className={`mt-2 block text-xs leading-5 break-words ${content.error ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {content.error ||
                  (payload
                    ? `${content.bytes.toLocaleString('en-US')} / ${MAX_QR_BYTES.toLocaleString('en-US')} bytes`
                    : `Maximum ${MAX_QR_BYTES.toLocaleString('en-US')} encoded bytes. Text in any language is supported.`)}
              </output>
            </section>

            <fieldset>
              <legend className="section-label">Shape</legend>
              <div className="grid grid-cols-4 gap-2">
                {SHAPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setShape(value)}
                    aria-pressed={shape === value}
                    className="shape-choice group flex flex-col items-center gap-2 py-2 text-xs font-medium"
                  >
                    <span
                      className={`shape-swatch shape-swatch-${value}`}
                      aria-hidden="true"
                    >
                      {shape === value && (
                        <Check className="size-5" strokeWidth={2.5} />
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground group-aria-pressed:text-foreground">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="section-label">Modules</legend>
              <div className="grid grid-cols-6 gap-2">
                {DOT_STYLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDotStyle(value)}
                    aria-pressed={dotStyle === value}
                    aria-label={label}
                    title={label}
                    className="module-choice visual-choice"
                  >
                    <ModuleSample style={value} />
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="section-label">Details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <fieldset>
                  <legend className="mb-2 text-xs text-muted-foreground">
                    Finder style
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { value: 'square', label: 'Square', radius: 0 },
                        { value: 'extra-rounded', label: 'Rounded', radius: 7 },
                        { value: 'dot', label: 'Circle', radius: 12 },
                      ] as const
                    ).map(({ value, label, radius }) => (
                      <button
                        key={value}
                        type="button"
                        className="finder-choice visual-choice"
                        aria-pressed={eyeStyle === value}
                        aria-label={label + ' finder'}
                        onClick={() => setEyeStyle(value)}
                      >
                        <svg
                          viewBox="0 0 32 32"
                          className="size-7"
                          aria-hidden="true"
                        >
                          <rect
                            x="4"
                            y="4"
                            width="24"
                            height="24"
                            rx={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <rect
                            x="11"
                            y="11"
                            width="10"
                            height="10"
                            rx={value === 'square' ? 0 : 5}
                            fill="currentColor"
                          />
                        </svg>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <span className="mb-2 block text-xs text-muted-foreground">
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
                        className="h-[72px] rounded-sm"
                        aria-label="Remove center icon"
                        onClick={() => setSelectedIcon('')}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                  {iconError && (
                    <output className="mt-2 block text-xs text-destructive">
                      {iconError}{' '}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => setIconAttempt((current) => current + 1)}
                      >
                        Retry
                      </button>
                    </output>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="section-label mb-0">Colors</p>
                <span
                  className={`contrast-label ${contrast >= MIN_CONTRAST ? 'text-muted-foreground' : 'text-amber-800'}`}
                >
                  {transparentBackground
                    ? 'Contrast depends on placement'
                    : `${contrast.toFixed(1)}:1 contrast`}
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
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-sm"
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
                  className="h-9 rounded-sm"
                  onClick={makeHighContrast}
                >
                  <Sparkles /> Auto contrast
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="studio-preview"
          aria-busy={
            !!payload && !content.error && !iconError && !renderError && !ready
          }
        >
          <div className="qr-preview-stage">
            <div
              className={`qr-shape${transparentBackground ? ' qr-transparent' : ''}`}
            >
              <NextImage
                className="h-full w-full"
                width={760}
                height={760}
                unoptimized
                src={previewSrc}
                alt={
                  payload
                    ? `${contentType} QR code`
                    : 'QR preview waiting for data'
                }
              />
              {previewMessage && (
                <div
                  className="absolute inset-0 z-20 grid place-items-center px-16 text-center text-sm font-semibold"
                  style={{ color }}
                >
                  {previewMessage}
                </div>
              )}
            </div>
          </div>
          <div className="encoded-data">
            <code className="min-w-0 flex-1 truncate px-2">
              {payload
                ? `${payload.slice(0, 180)}${payload.length > 180 ? '…' : ''}`
                : 'No encoded data yet'}
            </code>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy encoded data"
              onClick={copyPayload}
              disabled={!payload || !!content.error}
            >
              {copyStatus === 'success' ? <Check /> : <Copy />}
            </Button>
          </div>
          <output
            className={`mb-2 block min-h-4 text-xs ${copyStatus === 'success' ? 'text-muted-foreground' : 'text-destructive'}`}
          >
            {copyStatus === 'error'
              ? 'Could not copy. Check clipboard access and try again.'
              : downloadFailure.key === renderKey
                ? downloadFailure.message
                : copyStatus === 'success'
                  ? 'Copied to clipboard.'
                  : ''}
          </output>
          <label className="relative z-10 mb-3 flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-black"
              checked={transparentBackground}
              onChange={(event) =>
                setTransparentBackground(event.target.checked)
              }
              aria-describedby="transparent-background-hint"
            />
            Transparent background
          </label>
          <p
            id="transparent-background-hint"
            className="mb-3 shrink-0 text-xs text-muted-foreground"
          >
            Keep only the QR code and decorative dots in PNG and SVG.
          </p>
          <div className="relative z-10 grid shrink-0 grid-cols-2 gap-3">
            <Button
              className="h-12 rounded-sm bg-black text-white hover:bg-black/80"
              onClick={() => download('png')}
              disabled={!ready || downloading}
            >
              <Download data-icon="inline-start" /> PNG
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-sm border-black/15 bg-white/55 text-black hover:bg-white"
              onClick={() => download('svg')}
              disabled={!ready || downloading}
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
    <div className="color-picker">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold">{label}</span>
        <label className="relative flex min-h-9 cursor-pointer items-center gap-2 border-b border-input px-1">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            {value}
          </span>
          <span
            className="size-5 rounded-sm border"
            style={{ backgroundColor: value }}
          />
          <input
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
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
            aria-label={`${label}: ${preset}`}
            aria-pressed={value === preset}
            onClick={() => onChange(preset)}
            className="color-swatch"
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
  const [results, setResults] = useState({
    query: '',
    icons: [] as string[],
    error: false,
  });
  const cleanQuery = query.trim();
  const loading = cleanQuery.length >= 2 && results.query !== cleanQuery;
  const searchError = results.query === cleanQuery && results.error;
  const visibleResults =
    cleanQuery.length < 2
      ? CURATED_ICONS
      : results.query === cleanQuery
        ? results.icons
        : [];

  useEffect(() => {
    if (!open || cleanQuery.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(cleanQuery)}&limit=96`,
        {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(12000),
          ]),
        },
      )
        .then(async (response) => {
          if (!response.ok) throw new Error('Icon search unavailable');
          return (await response.json()) as { icons?: string[] };
        })
        .then((data) => {
          if (!controller.signal.aborted)
            setResults({
              query: cleanQuery,
              icons: data.icons ?? [],
              error: false,
            });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResults({ query: cleanQuery, icons: [], error: true });
        });
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cleanQuery, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="icon-picker-trigger h-[72px] min-w-0 flex-1 justify-center rounded-sm bg-white px-3"
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
      <DialogContent className="icon-dialog flex max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-hidden rounded-sm p-0 md:h-[520px] md:max-w-[640px]">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14">
          <DialogTitle className="text-base">Choose a center icon</DialogTitle>
          <DialogDescription className="sr-only">
            Search Iconify and select an icon for the center of your QR code.
          </DialogDescription>
        </DialogHeader>
        <div className="shrink-0 px-5">
          <label
            htmlFor="icon-search"
            className="flex h-12 items-center gap-2 rounded-sm border bg-white px-3"
          >
            <Search className="size-4 text-muted-foreground" />
            <Input
              id="icon-search"
              aria-label="Search icons"
              className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              value={query}
              maxLength={100}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons: coffee, camera, arrow…"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
              Searching Iconify…
            </div>
          ) : visibleResults.length ? (
            <div className="grid grid-cols-6 gap-2 pt-3 sm:grid-cols-8">
              {visibleResults.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  title={icon}
                  aria-label={icon}
                  onClick={() => {
                    onSelect(icon);
                    setOpen(false);
                  }}
                  className="grid aspect-square place-items-center rounded-sm border bg-background text-foreground hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon icon={icon} className="size-6" />
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
              {searchError
                ? 'Icon search is unavailable. Try another keyword or choose a suggested icon by clearing the search.'
                : 'No icons found. Try another keyword.'}
            </div>
          )}
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
      <label htmlFor="plain-text" className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          Plain text
        </span>
        <Textarea
          id="plain-text"
          className="min-h-24 rounded-sm bg-white"
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
            multiline
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
          multiline
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
          disabled={fields.encryption === 'nopass'}
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
              value &&
              setFields((current) => ({
                ...current,
                encryption: value,
              }))
            }
          >
            <SelectTrigger
              aria-label="Wi-Fi security"
              className="h-10 w-full rounded-sm bg-white px-3"
            >
              <SelectValue>
                {fields.encryption === 'WPA'
                  ? 'WPA / WPA2'
                  : fields.encryption === 'nopass'
                    ? 'No password'
                    : 'WEP'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="rounded-sm p-1 shadow-md"
            >
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
        min={fields.eventStart || undefined}
        fields={fields}
        setFields={setFields}
        type="datetime-local"
      />
      <div className="sm:col-span-2">
        <Field
          label="Description"
          name="eventDescription"
          multiline
          fields={fields}
          setFields={setFields}
          placeholder="Optional event details"
        />
      </div>
    </div>
  );
}
