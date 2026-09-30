/** Generates a small tileable film-grain PNG via canvas and installs it as
 * the `--grain-image` CSS variable. Run once at startup.
 *
 * WKWebView (the macOS Tauri webview) doesn't reliably rasterize SVG
 * feTurbulence filters referenced from a CSS background-image data URI:
 * the grain layer silently renders as nothing. A canvas-rasterized PNG
 * data URL sidesteps that entirely; canvas 2D pixel output has no such
 * gap in WKWebView.
 */
export function installFilmGrain(size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  document.documentElement.style.setProperty("--grain-image", `url(${canvas.toDataURL("image/png")})`);
  document.documentElement.style.setProperty("--grain-size", `${size}px`);
}
