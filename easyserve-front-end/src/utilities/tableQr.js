// Download and print the table QR images. The backend draws the restaurant
// name and table number under each code, so the image is print-ready as is.

const fileNameFor = ({ restaurant, number }) =>
  `${String(restaurant || "table").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-table-${number}.png`;

export const downloadTableQr = async (table) => {
  try {
    const blob = await (await fetch(table.qrCode)).blob();
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: fileNameFor(table) });
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    // Media served without CORS: let the browser open it so it can be saved.
    window.open(table.qrCode, "_blank");
  }
};

// Opens a print sheet with one QR per cell and prints once the images load.
// Returns false when a popup blocker stopped the window.
export const printTableQrs = (tables) => {
  const win = window.open("", "_blank");
  if (!win) return false;
  const images = tables
    .filter((table) => table.qrCode)
    .map((table) => `<img src="${table.qrCode}" alt="Table ${table.number}">`)
    .join("");
  win.document.write(`<!doctype html><title>Table QR codes</title>
<style>
  body { margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12mm; padding: 12mm; }
  img { width: 100%; break-inside: avoid; }
</style>
${images}
<script>
  Promise.all([...document.images].map((img) => img.complete || new Promise((done) => { img.onload = img.onerror = done; })))
    .then(() => print());
</script>`);
  win.document.close();
  return true;
};
