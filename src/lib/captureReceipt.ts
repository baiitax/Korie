/**
 * KoriePay — Receipt export utilities.
 *
 * Two outputs, both driven by the on-screen `ReceiptDocument` element so the
 * export always matches what the customer sees:
 *
 *  1. `downloadReceiptPng(node)`  — rasterises the DOM node to a crisp PNG
 *     (2x density) and triggers a download. Uses SVG foreignObject, so it is
 *     dependency-free and preserves the rendered layout/typography.
 *  2. `downloadReceiptPdf()`      — uses the browser's native print-to-PDF
 *     against a dedicated print stylesheet, producing a searchable, selectable,
 *     A4-friendly PDF. (Printing is the most reliable dependency-free PDF path
 *     for a document like this.)
 */

const FONT_STACK =
  "var(--font-public, 'Public Sans'), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function addFontFaces(svg: SVGSVGElement): void {
  // Inline the fonts used by the receipt so the rasterised image is correct.
  const style = svg.querySelector("style");
  if (style) return;
  const s = document.createElementNS("http://www.w3.org/2000/svg", "style");
  s.textContent = `
    .tabular, .font-mono { font-variant-numeric: tabular-nums; }
    * { box-sizing: border-box; }
  `;
  svg.insertBefore(s, svg.firstChild);
}

export async function downloadReceiptPng(node: HTMLElement, filename: string): Promise<void> {
  if (typeof window === "undefined" || !node) return;
  const clone = node.cloneNode(true) as HTMLElement;
  // Force a fixed width so layout is stable for rasterisation.
  clone.style.width = "480px";
  clone.style.margin = "0 auto";
  clone.style.backgroundColor = "#ffffff";

  const rect = node.getBoundingClientRect();
  const width = Math.max(rect.width || 480, 480);
  const height = Math.max(rect.height || 1, 1);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width * 2));
  svg.setAttribute("height", String(height * 2));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const foreign = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
  foreign.setAttribute("width", "100%");
  foreign.setAttribute("height", "100%");
  foreign.setAttribute("x", "0");
  foreign.setAttribute("y", "0");

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.fontFamily = FONT_STACK;
  wrapper.style.colorScheme = "light";
  wrapper.appendChild(clone);

  foreign.appendChild(wrapper);
  svg.appendChild(foreign);
  addFontFaces(svg);

  const xml = new XMLSerializer().serializeToString(svg);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

  const img = new Image();
  const result = await new Promise<HTMLImageElement>(async (resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to rasterise receipt"));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(result, 0, 0, width * 2, height * 2);

  const pngDataUrl = canvas.toDataURL("image/png");
  triggerDownload(pngDataUrl, `${filename}.png`);
}

/**
 * Native print-to-PDF. A dedicated `@media print` stylesheet (see
 * globals.css) hides everything except the receipt and sets the page to A4.
 */
export function downloadReceiptPdf(): void {
  if (typeof window === "undefined") return;
  document.body.classList.add("receipt-printing");
  window.print();
  // Restore after print dialog closes.
  setTimeout(() => document.body.classList.remove("receipt-printing"), 1500);
}

/** Trigger a download from a data URL. */
function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
