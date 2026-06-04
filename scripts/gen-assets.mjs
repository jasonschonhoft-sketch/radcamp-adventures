// Generates PWA icons + the social (OG) preview image from the brand logo.
// Run with:  node scripts/gen-assets.mjs   (sharp is a devDependency)
import sharp from 'sharp';

const LOGO = 'public/logo.svg';
const DARK = { r: 15, g: 17, b: 23, alpha: 1 }; // #0f1117 (theme background)

// A square app icon: the logo centered on the dark brand background, with `pad`
// fractional padding on each side (maskable icons need a larger safe zone).
async function icon(size, pad, out) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(LOGO, { density: 512 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: DARK } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log('wrote', out);
}

// 1200x630 social preview: logo on the left, title + tagline on the right.
async function og(out) {
  const W = 1200, H = 630, LOGO_SIZE = 380;
  const logo = await sharp(LOGO, { density: 512 })
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#0f1117"/>
    <rect x="0" y="${H - 12}" width="${W}" height="12" fill="#a3e635"/>
    <text x="478" y="278" font-family="Helvetica, Arial, sans-serif" font-size="62" font-weight="700" fill="#ffffff">RadCamp Adventures</text>
    <text x="480" y="342" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="600" fill="#a3e635">AI-Powered Colorado Adventure Map</text>
    <text x="480" y="398" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="400" fill="#8a9bb0">Dirt bikes &#183; OHV &#183; Snowmobile &#183; MTB &#183; Hiking</text>
  </svg>`;
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, left: 64, top: Math.round((H - LOGO_SIZE) / 2) }])
    .png()
    .toFile(out);
  console.log('wrote', out);
}

await icon(192, 0.14, 'public/icon-192.png');
await icon(512, 0.14, 'public/icon-512.png');
await icon(512, 0.22, 'public/icon-maskable-512.png');
await og('public/og.png');
