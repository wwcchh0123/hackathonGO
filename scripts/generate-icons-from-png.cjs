// 从 PNG 图标生成多种尺寸的图标文件
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const sizes = [16, 32, 48, 128, 256, 512]
const assetsDir = path.join(process.cwd(), 'assets', 'icons')
const sourcePng = path.join(assetsDir, 'icon.png')

async function renderSize(win, pngPath, size) {
  // 读取 PNG 文件并转换为 base64
  const pngBuffer = fs.readFileSync(pngPath)
  const base64 = pngBuffer.toString('base64')

  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#ffffff;">
    <img id="icon" src="data:image/png;base64,${base64}" style="width:${size}px;height:${size}px;display:block;image-rendering: high-quality;"/>
  </body></html>`

  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
  await win.setSize(size, size)
  await win.loadURL(dataUrl)
  // 等待渲染完成
  await new Promise(r => setTimeout(r, 100))
  const image = await win.capturePage()
  const outPath = path.join(assetsDir, `icon-${size}.png`)
  fs.writeFileSync(outPath, image.toPNG())
  return outPath
}

async function main() {
  if (!fs.existsSync(sourcePng)) {
    console.error('源 PNG 文件未找到:', sourcePng)
    process.exit(1)
  }

  console.log('开始从', sourcePng, '生成图标...')

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
    const out = await renderSize(win, sourcePng, size)
    outputs.push(out)
    console.log('已生成:', out)
  }

  await win.destroy()
  app.quit()
  console.log('所有图标生成完成!')
}

main().catch(err => {
  console.error('图标生成失败:', err)
  try { app.quit() } catch {}
  process.exit(1)
})
