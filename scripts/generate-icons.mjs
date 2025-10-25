// Generates PNG icons from assets/icons/icon.svg using Electron offscreen capture
import { app, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const sizes = [16, 32, 48, 128, 256, 512]
const assetsDir = path.join(process.cwd(), 'assets', 'icons')
const svgPath = path.join(assetsDir, 'icon.svg')

function encodeSvg(svg) {
  // Encode SVG for embedding into data URL
  return encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
}

async function renderSize(win, svgContent, size) {
  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#ffffff;">
    <img id="icon" src="data:image/svg+xml;charset=utf-8,${encodeSvg(svgContent)}" style="width:${size}px;height:${size}px;display:block"/>
  </body></html>`

  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
  await win.setSize(size, size)
  await win.loadURL(dataUrl)
  // Small delay to ensure layout/render complete
  await win.webContents.executeJavaScript('new Promise(r=>setTimeout(r,50))')
  const image = await win.capturePage()
  const outPath = path.join(assetsDir, `icon-${size}.png`)
  fs.writeFileSync(outPath, image.toPNG())
  return outPath
}

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found:', svgPath)
    process.exit(1)
  }
  const svgContent = fs.readFileSync(svgPath, 'utf-8')

  await app.whenReady()
  const win = new BrowserWindow({
    show: false,
    width: 512,
    height: 512,
    backgroundColor: '#ffffff',
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const outputs = []
  for (const size of sizes) {
    const out = await renderSize(win, svgContent, size)
    outputs.push(out)
    console.log('Generated:', out)
  }

  // Copy 512 as default icon.png
  const defaultPng = path.join(assetsDir, 'icon-512.png')
  const iconPng = path.join(assetsDir, 'icon.png')
  fs.copyFileSync(defaultPng, iconPng)
  console.log('Generated:', iconPng)

  await win.destroy()
  app.quit()
}

main().catch(err => {
  console.error('Icon generation failed:', err)
  try { app.quit() } catch {}
  process.exit(1)
})

