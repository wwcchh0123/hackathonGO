// 生成 macOS (.icns) 和 Windows (.ico) 图标文件
const fs = require('node:fs')
const path = require('node:path')
const { exec } = require('node:child_process')
const { promisify } = require('node:util')

const execAsync = promisify(exec)

const assetsDir = path.join(process.cwd(), 'assets', 'icons')
const iconPng = path.join(assetsDir, 'icon-512.png')
const iconIcns = path.join(assetsDir, 'icon.icns')
const iconIco = path.join(assetsDir, 'icon.ico')

async function generateIcns() {
  // 创建 iconset 目录
  const iconsetDir = path.join(assetsDir, 'icon.iconset')
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir)
  }

  // 定义需要的尺寸
  const sizes = [
    { size: 16, scale: 1 },
    { size: 16, scale: 2 },
    { size: 32, scale: 1 },
    { size: 32, scale: 2 },
    { size: 128, scale: 1 },
    { size: 128, scale: 2 },
    { size: 256, scale: 1 },
    { size: 256, scale: 2 },
    { size: 512, scale: 1 },
    { size: 512, scale: 2 }
  ]

  // 使用 sips 命令缩放图片（macOS 内置）
  for (const { size, scale } of sizes) {
    const actualSize = size * scale
    const suffix = scale === 2 ? '@2x' : ''
    const outputName = `icon_${size}x${size}${suffix}.png`
    const outputPath = path.join(iconsetDir, outputName)

    try {
      await execAsync(`sips -z ${actualSize} ${actualSize} "${iconPng}" --out "${outputPath}"`)
      console.log(`✓ 生成: ${outputName}`)
    } catch (error) {
      console.error(`✗ 生成失败: ${outputName}`, error.message)
    }
  }

  // 使用 iconutil 生成 .icns 文件（macOS 内置）
  try {
    await execAsync(`iconutil -c icns "${iconsetDir}" -o "${iconIcns}"`)
    console.log(`✓ 生成 macOS 图标: ${iconIcns}`)

    // 清理 iconset 目录
    fs.rmSync(iconsetDir, { recursive: true, force: true })
  } catch (error) {
    console.error('✗ 生成 .icns 失败:', error.message)
    throw error
  }
}

async function generateIco() {
  // Windows .ico 文件需要包含多个尺寸的图标
  // 我们使用 ImageMagick 的 convert 命令（需要安装）
  const sizes = [16, 32, 48, 128, 256]
  const pngPaths = sizes.map(size => path.join(assetsDir, `icon-${size}.png`))

  // 检查所有必需的 PNG 文件是否存在
  const missingFiles = pngPaths.filter(p => !fs.existsSync(p))
  if (missingFiles.length > 0) {
    console.error('✗ 缺少以下 PNG 文件:')
    missingFiles.forEach(f => console.error(`  - ${f}`))
    throw new Error('请先运行 npm run icons 生成所有尺寸的 PNG 文件')
  }

  try {
    // 尝试使用 ImageMagick
    await execAsync(`which convert`)
    await execAsync(`convert ${pngPaths.join(' ')} "${iconIco}"`)
    console.log(`✓ 生成 Windows 图标: ${iconIco}`)
  } catch (error) {
    console.warn('⚠ ImageMagick 未安装，尝试使用备用方法...')

    // 备用方法：复制最大的 PNG 文件并重命名为 .ico
    // 这不是理想的方法，但在没有 ImageMagick 的情况下可以工作
    const largestPng = path.join(assetsDir, 'icon-256.png')
    fs.copyFileSync(largestPng, iconIco)
    console.log(`⚠ 使用简化方法生成 Windows 图标: ${iconIco}`)
    console.log('  提示: 安装 ImageMagick 可以生成更标准的 .ico 文件:')
    console.log('  brew install imagemagick')
  }
}

async function main() {
  console.log('开始生成平台特定图标...\n')

  // 检查源文件
  if (!fs.existsSync(iconPng)) {
    console.error(`✗ 源文件不存在: ${iconPng}`)
    console.error('请先运行: npm run icons')
    process.exit(1)
  }

  // 检查平台
  const isMac = process.platform === 'darwin'

  try {
    // 生成 macOS 图标
    if (isMac) {
      console.log('生成 macOS 图标 (.icns)...')
      await generateIcns()
      console.log()
    } else {
      console.log('⊘ 跳过 macOS 图标生成（仅在 macOS 上可用）\n')
    }

    // 生成 Windows 图标
    console.log('生成 Windows 图标 (.ico)...')
    await generateIco()
    console.log()

    console.log('✅ 所有图标生成完成！')
  } catch (error) {
    console.error('\n❌ 图标生成失败:', error.message)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('发生错误:', err)
  process.exit(1)
})
