// Gera icon-192.png e icon-512.png para o PWA — sem dependências externas
const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// CRC-32 para o formato PNG
const CRC = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  CRC[n] = c
}
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = CRC[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type)
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length)
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([l, t, data, c])
}

// Design: fundo escuro + 4 barras verdes + linha teal de tendência
function renderPixel(x, y, W) {
  const f = W / 512

  // Fundo externo: #0a0a0f
  let r = 10, g = 10, b = 15

  // Card interno: #12121a
  const m = 30 * f
  if (x >= m && x <= W - m && y >= m && y <= W - m) {
    r = 18; g = 18; b = 26
  }

  // 4 barras (bar chart) crescentes, alinhadas à base
  const bw       = 54 * f
  const bx0      = 72 * f
  const bxStep   = 92 * f
  const bBottom  = W - m - 50 * f
  const heights  = [95, 160, 230, 300].map(h => h * f)

  for (let i = 0; i < 4; i++) {
    const bx = bx0 + i * bxStep
    const bh = heights[i]
    if (x >= bx && x < bx + bw && y >= bBottom - bh && y < bBottom) {
      const pct = (bBottom - y) / bh
      r = Math.round(200 * (0.5 + 0.5 * pct))
      g = Math.round(245 * (0.5 + 0.5 * pct))
      b = 0
    }
  }

  // Linha de tendência conectando o topo de cada barra
  const lPts = heights.map((h, i) => [bx0 + i * bxStep + bw / 2, bBottom - h])
  const thick = 9 * f

  for (let i = 0; i < lPts.length - 1; i++) {
    const [x1, y1] = lPts[i]
    const [x2, y2] = lPts[i + 1]
    const dx = x2 - x1, dy = y2 - y1
    const len2 = dx * dx + dy * dy
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2))
    const px = x1 + t * dx, py = y1 + t * dy
    const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
    if (dist < thick) { r = 0; g = 245; b = 200 }
  }

  // Ponto no final da linha (topo da última barra)
  const [dotX, dotY] = lPts[3]
  if (Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2) < 18 * f) {
    r = 0; g = 245; b = 200
  }

  return [r, g, b]
}

function generatePNG(size) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2  // 8-bit RGB

  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3)
    raw[row] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      const [pr, pg, pb] = renderPixel(x, y, size)
      const off = row + 1 + x * 3
      raw[off] = pr; raw[off + 1] = pg; raw[off + 2] = pb
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const out = path.join(__dirname, '..', 'public')
fs.mkdirSync(out, { recursive: true })

process.stdout.write('Gerando icon-192.png...')
fs.writeFileSync(path.join(out, 'icon-192.png'), generatePNG(192))
console.log(' ok')

process.stdout.write('Gerando icon-512.png...')
fs.writeFileSync(path.join(out, 'icon-512.png'), generatePNG(512))
console.log(' ok')

console.log('Ícones gerados em public/')
