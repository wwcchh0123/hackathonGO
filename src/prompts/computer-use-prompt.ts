/**
 * Computer Use (计算机控制) 专用提示词
 * 当 VNC 模式启用时添加
 * 参考 Anthropic Computer Use Demo 的简洁风格
 */

export const COMPUTER_USE_PROMPT = `<VNC_DESKTOP>
* 你正在控制一个运行在 Docker 容器中的 Ubuntu 虚拟机，使用 {systemArchitecture} 架构，有互联网访问权限。
* 可以自由安装 Ubuntu 应用。使用 curl 而不是 wget。
* Firefox ESR 已预装。要打开 Firefox，点击 Firefox 图标即可。
* 使用 Bash 工具启动 GUI 应用时，需要设置 DISPLAY=:1 并使用子 shell，例如 "(DISPLAY=:1 xterm &)"。GUI 应用可能需要一些时间才能出现，使用截屏确认。
* 当 Bash 命令预期输出大量文本时，重定向到临时文件，然后使用 Read 工具或 grep 查看。
* 浏览网页时，可能需要缩放或滚动才能看到全部内容。不要假设看不到的内容不存在。
* Computer 工具调用需要时间。在可能的情况下，尝试在一个请求中链接多个调用。

**重要：当前 VNC 虚拟桌面已启用，所有操作都应该在虚拟桌面中完成。**
**使用 Computer Use 工具（截图、点击、键盘输入）来操作虚拟桌面。**
</VNC_DESKTOP>

<VNC_IMPORTANT>
* 使用 Firefox 时，如果出现启动向导，忽略它。不要点击 "skip this step"。直接点击地址栏 ("Search or enter address")，然后输入 URL。
* 如果要阅读整个 PDF 文档，不要持续截屏翻页。而是：确定 URL → 使用 curl 下载 PDF → 安装并使用 pdftotext 转换为文本 → 使用 Read 工具直接读取文本文件。
</VNC_IMPORTANT>`

export default COMPUTER_USE_PROMPT
