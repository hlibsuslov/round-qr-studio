'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, QrCode, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DEFAULT_URL = 'https://mypenger.com/onboarding';
type DotStyle = 'dots' | 'rounded' | 'classy-rounded';
type QRInstance = {
  append: (element: HTMLElement) => void;
  update: (options: Record<string, unknown>) => void;
  download: (options: {
    name: string;
    extension: 'png' | 'svg';
  }) => Promise<void>;
};

function qrOptions(url: string, color: string, dotStyle: DotStyle) {
  return {
    width: 640,
    height: 640,
    type: 'svg' as const,
    shape: 'circle' as const,
    data: url || DEFAULT_URL,
    margin: 44,
    qrOptions: { errorCorrectionLevel: 'H' as const },
    dotsOptions: { color, type: dotStyle },
    cornersSquareOptions: { color, type: 'extra-rounded' as const },
    cornersDotOptions: { color, type: 'dot' as const },
    backgroundOptions: { color: '#ffffff' },
  };
}

export default function Home() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [color, setColor] = useState('#11130f');
  const [dotStyle, setDotStyle] = useState<DotStyle>('dots');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return;
      const qr = new QRCodeStyling(qrOptions(url, color, dotStyle));
      qr.append(containerRef.current);
      qrRef.current = qr as unknown as QRInstance;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // Initialise once; later changes use update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    qrRef.current?.update(qrOptions(url, color, dotStyle));
  }, [url, color, dotStyle]);

  async function download(extension: 'png' | 'svg') {
    let hostname = 'link';
    try {
      hostname = new URL(url || DEFAULT_URL).hostname.replaceAll('.', '-');
    } catch {
      hostname = 'custom-link';
    }
    await qrRef.current?.download({ name: `round-qr-${hostname}`, extension });
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <QrCode className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Open source tool
            </p>
            <p className="font-semibold tracking-tight">Round QR Studio</p>
          </div>
        </div>
        <span className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
          <ShieldCheck className="size-4 text-accent" aria-hidden="true" /> QR
          correction: High
        </span>
      </header>

      <section className="mx-auto grid w-full max-w-[1320px] gap-6 px-5 pb-10 sm:px-8 lg:grid-cols-[minmax(340px,0.86fr)_minmax(480px,1.14fr)] lg:px-10 lg:pb-14">
        <div className="flex flex-col justify-between rounded-[30px] border bg-card p-6 shadow-[0_20px_70px_rgba(13,24,18,0.06)] sm:p-8">
          <div>
            <span className="mb-7 inline-flex rounded-full bg-accent/12 px-3 py-1.5 text-xs font-semibold text-accent">
              CIRCLE / QR
            </span>
            <h1 className="max-w-lg text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">
              Круглый QR-код, который действительно сканируется.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Круглые модули и силуэт — внутри стандартное QR-ядро с
              сохранёнными маркерами и белым защитным полем.
            </p>

            <div className="mt-9 space-y-6">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Ссылка</span>
                <span className="flex items-center gap-2 rounded-2xl border bg-background p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
                  <Input
                    aria-label="Ссылка для QR-кода"
                    className="h-11 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    type="url"
                  />
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Копировать ссылку"
                    onClick={copyUrl}
                  >
                    {copied ? <Check /> : <Copy />}
                  </Button>
                </span>
              </label>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  Стиль точек
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['dots', 'Точки'],
                      ['rounded', 'Мягкий'],
                      ['classy-rounded', 'Плавный'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDotStyle(value)}
                      aria-pressed={dotStyle === value}
                      className="rounded-xl border px-3 py-3 text-sm font-medium transition hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-center justify-between rounded-2xl border bg-background p-3">
                <span>
                  <span className="block text-sm font-semibold">Цвет QR</span>
                  <span className="mt-0.5 block font-mono text-xs uppercase text-muted-foreground">
                    {color}
                  </span>
                </span>
                <input
                  aria-label="Цвет QR-кода"
                  className="h-10 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </label>
            </div>
          </div>

          <p className="mt-9 flex items-center gap-2 text-xs leading-5 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" />
            Генерация происходит локально в браузере. Ссылка никуда не
            отправляется.
          </p>
        </div>

        <div className="relative flex min-h-[650px] flex-col overflow-hidden rounded-[30px] bg-[#dff86a] p-5 sm:p-8 lg:min-h-[760px]">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border-[44px] border-black/[0.045]" />
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
            <span>Live preview</span>
            <span>{ready ? 'Ready' : 'Loading'}</span>
          </div>
          <div className="relative z-10 flex flex-1 items-center justify-center py-8">
            <div className="qr-shell grid aspect-square w-full max-w-[560px] place-items-center rounded-full bg-white p-[5.5%] shadow-[0_34px_80px_rgba(28,38,10,0.20)]">
              <div
                ref={containerRef}
                className="qr-canvas aspect-square w-full overflow-hidden rounded-full [&>svg]:h-full [&>svg]:w-full"
                aria-label={`QR-код для ${url}`}
              />
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3">
            <Button
              className="h-12 rounded-2xl bg-black text-white hover:bg-black/80"
              onClick={() => download('png')}
              disabled={!ready}
            >
              <Download data-icon="inline-start" /> PNG
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-black/15 bg-white/55 text-black hover:bg-white"
              onClick={() => download('svg')}
              disabled={!ready}
            >
              <Download data-icon="inline-start" /> SVG
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
