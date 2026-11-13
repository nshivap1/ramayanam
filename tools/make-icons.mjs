import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icons/icon.svg');
await sharp(svg, { density: 300 }).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile('public/icons/icon-512.png');
const inner = await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#7a1027' } }).composite([{ input: inner, gravity: 'center' }]).png().toFile('public/icons/icon-maskable-512.png');
console.log('icons ok');
