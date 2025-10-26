#!/bin/bash

echo "=========================================="
echo "         阶段1: 基础VNC集成验证"
echo "=========================================="

# 验证结果计数
passed=0
failed=0

# 验证函数
verify_step() {
    local step_name="$1"
    local check_command="$2"
    local expected="$3"
    
    echo "🔍 验证: $step_name"
    
    if eval "$check_command"; then
        echo "   ✅ 通过"
        ((passed++))
    else
        echo "   ❌ 失败"
        ((failed++))
    fi
    echo ""
}

echo "开始验证阶段1完成情况..."
echo ""

# 1. 验证文件修改
echo "📁 文件结构验证:"
verify_step "electron/main.js 包含VNC管理功能" \
    "grep -q 'start-vnc' electron/main.js && grep -q 'VNC_PORTS' electron/main.js" \
    true

verify_step "electron/preload.js 暴露VNC API" \
    "grep -q 'vnc:' electron/preload.js" \
    true

verify_step "src/types/api.ts 类型定义文件存在" \
    "[ -f src/types/api.ts ] && grep -q 'VncStartResult' src/types/api.ts" \
    true

verify_step "src/App.tsx 包含VNC状态管理" \
    "grep -q 'vncState' src/App.tsx && grep -q 'ServiceHealth' src/App.tsx" \
    true

# 2. 验证Docker环境
echo "🐳 Docker环境验证:"
verify_step "Docker 服务运行正常" \
    "docker info > /dev/null 2>&1" \
    true

verify_step "aslan-spock-register.qiniu.io/devops/anthropic-quickstarts:computer-use-demo-latest 镜像存在" \
    "docker images | grep -q 'aslan-spock-register.qiniu.io/devops/anthropic-quickstarts.*computer-use-demo-latest'" \
    true

# 3. 验证端口可用性
echo "🔌 端口可用性验证:"
PORTS=(5900 6080 8501 8502)
for port in "${PORTS[@]}"; do
    verify_step "端口 $port 可用" \
        "! lsof -ti:$port > /dev/null 2>&1" \
        true
done

# 4. 验证构建
echo "🔨 项目构建验证:"
verify_step "项目可以正常构建" \
    "npm run build > /dev/null 2>&1" \
    true

# 5. 验证IPC处理器
echo "⚡ IPC处理器验证:"
verify_step "main.js 包含 start-vnc 处理器" \
    "grep -q 'ipcMain.handle.*start-vnc' electron/main.js" \
    true

verify_step "main.js 包含 stop-vnc 处理器" \
    "grep -q 'ipcMain.handle.*stop-vnc' electron/main.js" \
    true

verify_step "main.js 包含 vnc-status 处理器" \
    "grep -q 'ipcMain.handle.*vnc-status' electron/main.js" \
    true

# 6. 验证核心函数
echo "🔧 核心函数验证:"
verify_step "startVncInternal 函数存在" \
    "grep -q 'async function startVncInternal' electron/main.js" \
    true

verify_step "stopVncContainer 函数存在" \
    "grep -q 'async function stopVncContainer' electron/main.js" \
    true

verify_step "checkDockerAvailable 函数存在" \
    "grep -q 'async function checkDockerAvailable' electron/main.js" \
    true

verify_step "waitForServices 函数存在" \
    "grep -q 'async function waitForServices' electron/main.js" \
    true

# 7. 验证应用生命周期管理
echo "♻️  生命周期管理验证:"
verify_step "应用退出时清理容器" \
    "grep -q 'before-quit' electron/main.js" \
    true

verify_step "容器状态监控定时器" \
    "grep -A20 'setInterval' electron/main.js | grep -q '10000'" \
    true

# 总结
echo "=========================================="
echo "           验证结果总结"
echo "=========================================="
echo "通过: $passed 项"
echo "失败: $failed 项"
echo "总计: $((passed + failed)) 项"
echo ""

if [ $failed -eq 0 ]; then
    echo "🎉 阶段1验证全部通过！"
    echo "✅ 基础VNC集成功能已正确实现"
    echo ""
    echo "下一步:"
    echo "1. 可以开始阶段2: UI界面实现"
    echo "2. 或者先在Electron应用中测试VNC功能"
    echo ""
    echo "测试建议:"
    echo "1. 启动应用: npm run dev"
    echo "2. 在开发者控制台中测试 window.api.vnc.start()"
    echo "3. 验证VNC容器是否成功启动"
    echo ""
    exit 0
else
    echo "❌ 发现 $failed 个问题需要修复"
    echo ""
    echo "请检查失败的验证项并修复相关问题"
    echo "修复后重新运行此脚本进行验证"
    echo ""
    exit 1
fi