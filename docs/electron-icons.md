# 桌面应用图标接入指南（Electron + Vite）

本文档说明如何在当前项目中为桌面应用添加图标，覆盖开发运行时窗口/Dock 图标、网页 favicon，以及打包分发时的图标配置与生成方式。

## 目录布局与前提

- 图标源文件：`assets/icons/icon.svg`
- 图标生成脚本：`scripts/generate-icons.cjs`
- Electron 入口：`electron/main.js`
- 网页入口：`index.html`

确保已安装依赖：

- Node.js + npm
- 项目依赖已安装：`npm install`

## 快速开始（推荐）

1. 准备 SVG 源图

- 将你的应用图标（矢量）放在：`assets/icons/icon.svg`

2. 生成 PNG 图标文件

- 运行：`npm run icons`
- 脚本会从 `icon.svg` 自动生成多尺寸 PNG：16、32、48、128、256、512，并复制 512 尺寸为默认图：`assets/icons/icon.png`

3. 开发运行时显示图标

- 窗口图标（Windows/Linux）：已在 `electron/main.js` 中配置 `BrowserWindow` 的 `icon` 指向 `assets/icons/icon.png`。
- Dock 图标（macOS）：已在 `electron/main.js` 中通过 `app.dock.setIcon(...)` 设置。

4. 网页端 favicon（开发预览）

- 已在 `index.html` 中添加：`<link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />`，浏览器开发预览时会显示网页标签图标。

## 代码位置说明

- 窗口图标设置：`electron/main.js:38`
  - `icon: path.join(process.cwd(), 'assets', 'icons', 'icon.png'),`
- macOS Dock 图标：`electron/main.js:56`
  - `app.dock.setIcon(nativeImage.createFromPath(dockIconPath))`
- favicon：`index.html:6`
  - `<link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />`
- 生成脚本：`scripts/generate-icons.cjs`
  - Electron 无界面渲染 SVG 到 PNG，多尺寸输出到 `assets/icons/`。

## 打包分发（可选）

若需要发布到不同平台，建议生成对应平台的专用格式，并在打包器配置里指定：

- macOS：`assets/icons/icon.icns`
- Windows：`assets/icons/icon.ico`
- Linux：主 PNG：`assets/icons/icon.png`（可保留多尺寸）

生成方式示例（macOS 工具链）：

- 先得到高分辨率 PNG（例如 1024×1024）。可以用已有脚本生成的 `icon-512.png` 作为基础，再用图形工具导出 1024×1024。
- 生成 `.icns`：
  - `mkdir -p tmp.iconset`
  - 使用 `sips` 生成各尺寸 PNG 到 `tmp.iconset/`（16、32、64、128、256、512、1024），文件名如 `icon_16x16.png`、`icon_32x32.png` 等。
  - 执行：`iconutil -c icns tmp.iconset -o assets/icons/icon.icns`

生成 `.ico`（任选工具）：

- 可用 ImageMagick、`sharp` 或在线工具，将多尺寸 PNG 合并为 `assets/icons/icon.ico`

打包配置（以 electron-builder 为例）：

- 在 `package.json` 顶层添加：

```
"build": {
  "appId": "com.example.app",
  "mac": { "icon": "assets/icons/icon.icns" },
  "win": { "icon": "assets/icons/icon.ico" },
  "linux": { "icon": "assets/icons/icon.png" }
}
```

- 安装：`npm i -D electron-builder`
- 脚本示例：`"dist:electron": "electron-builder -mwl"`
- 构建：`npm run build:web && npm run dist:electron`

## 常见问题与提示

- macOS 窗口标题栏不显示 `BrowserWindow.icon`：这是预期行为，macOS 会在 Dock 中显示应用图标，窗口本身通常不显示图标。
- Windows/Linux 开发模式图标不生效：请确认已执行 `npm run icons` 并生成了 `assets/icons/icon.png`；同时窗口图标仅在原生 Electron 窗口中显示，浏览器预览不显示。
- SVG 太复杂导致导出异常：可以先用设计工具将 SVG 简化或导出为高分辨率 PNG，再转为各尺寸。
- 打包后的图标与开发不同：打包时以打包器的 `icon` 字段为准，确保 `.icns/.ico/.png` 路径正确。

## 结论

开发阶段使用 `npm run icons` 即可快速生成并接入图标；分发阶段建议准备 `.icns/.ico` 并在打包器里声明，以获得更好的平台一致性与显示效果。
