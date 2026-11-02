async function svgToPng(source: Blob) {
  const sourceUrl = URL.createObjectURL(source);
  const image = new Image();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error('Image loading timed out.')),
        15000,
      );
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to load the QR image.'));
      image.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1520;
    canvas.height = 1520;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG export is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Unable to create the PNG file.'));
      }, 'image/png');
    });
  } finally {
    clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function downloadQr(
  source: string,
  name: string,
  extension: 'png' | 'svg',
) {
  const svg = new Blob([source], { type: 'image/svg+xml' });
  const blob = extension === 'png' ? await svgToPng(svg) : svg;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = `${name}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Give the browser time to consume the URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
