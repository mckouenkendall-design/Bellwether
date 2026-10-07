// Makes the home-screen icon (a PNG, embedded in the page as data) from an SVG drawn here.
const sharp = require('sharp'); const fs = require('fs'); const path = require('path');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" fill="#0E1B2C"/>
<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#B98E2C"/><stop offset=".35" stop-color="#F0C860"/><stop offset="1" stop-color="#8A6418"/></linearGradient></defs>
<circle cx="90" cy="36" r="10" fill="#8A6418"/><circle cx="90" cy="146" r="12" fill="#8A6418"/>
<path d="M76 40c-28 6-25 62-48 92-3 11 3 12 12 12h100c9 0 15-1 12-12-23-30-20-86-48-92z" fill="url(#g)"/>
<ellipse cx="72" cy="86" rx="7" ry="27" fill="#fff" opacity=".35" transform="rotate(7 72 86)"/><rect x="34" y="134" width="112" height="8" fill="#8A6418"/></svg>`;
sharp(Buffer.from(svg)).resize(180, 180).png({ compressionLevel: 9 }).toBuffer().then((b) => { fs.writeFileSync(path.join(__dirname, '..', 'src', 'icon.b64'), b.toString('base64')); console.log('icon', b.length, 'bytes'); });
