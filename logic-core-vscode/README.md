# LogicCore Architect (VS Code Edition) 🚀

LogicCore Architect 是一个基于 **Visual Studio Code** 深度定制的集成开发环境 (IDE)，专为追求极致性能、美学与本土化体验的开发者打造。

![Banner](https://img.shields.io/badge/LogicCore-Architect_v1.0-blueviolet?style=for-the-badge) ![Localization](https://img.shields.io/badge/Localization-CN_Deep-red?style=for-the-badge) ![Build](https://img.shields.io/badge/Build-Passing-success?style=for-the-badge)

---

## ✨ 核心特性 (Key Features)

### 1. 🌌 极致美学 (LogicCore Void Theme)
-   **深邃虚空**: 全新的 "LogicCore Void" 主题，采用高对比度的暗黑配色，减少视觉疲劳。
-   **去微软化**: 移除了所有 "Visual Studio Code" 和 "Microsoft" 的品牌标识，打造纯净的品牌体验。
-   **禅模式优化**: 深度优化的 Zen Mode，提供沉浸式的编码环境。

### 2. 🇨🇳 深度本土化 (Deep Localization)
-   **源码级汉化**: 不仅仅是语言包。我们深入源码层 (`workbench`, `files`, `search`)，对核心设置、菜单与描述进行了地道的中文重写。
-   **习惯优化**: 针对中文开发者习惯调整了默认配置（如文件编码、字体渲染等）。

### 3. 🔬 量子扫描 (Quantum Scanner)
-   **内置诊断工具**: 集成 "LogicCore Quantum Scanner" (Odradek Scan)。
-   **一键激活**: 通过 `Ctrl+Shift+P` -> `LogicCore: Toggle Quantum Scanner` 即可开启全界面扫描特效。

### 4. ⚡ 纯净架构
-   **隐私优先**: 移除了所有遥测 (Telemetry) 与数据收集模块。
-   **轻量化**: 剔除了冗余的云服务集成，专注于本地开发效率。

---

## 🛠️ 构建指南 (Build Guide)

本项目依赖严格的构建环境。请务必按照以下步骤操作：

### 环境要求 (Prerequisites)
-   **Node.js**: `v22.21.1` (必需，严格匹配)
-   **Visual Studio 2022**: 必须安装 **C++ 桌面开发** 和 **Spectre 缓解库 (Spectre-mitigated libs)**。
-   **Python 3**: 用于构建脚本。

### 快速开始 (Quick Start)

**1. 克隆仓库**
```bash
git clone https://github.com/lizuyi-6/newide.git
cd newide
```

**2. 安装依赖**
```cmd
npm install
```

**3. 启动开发模式**
```cmd
npm run watch
```
启动后，新的 IDE 窗口将自动弹出。

---

## 🏗️ 项目结构 (Project Structure)

-   `/src`: 核心源代码 (LogicCore 增强版)。
    -   `/vs/workbench`: 深度汉化的工作台组件。
    -   `/vs/platform`: 底层服务与配置。
-   `/scripts`: 自动化构建与汉化脚本。
-   `.npmrc`: 包含 Electron 镜像加速配置。

---

## 🤝 贡献 (Contributing)

欢迎提交 Issue 或 Pull Request 来帮助 LogicCore Architect 变得更好。

1.  Fork 本仓库
2.  创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  开启一个 Pull Request

---

## 📄 许可证 (License)

本项目基于 Visual Studio Code (MIT License) 二次开发。
LogicCore Architect 的修改部分同样遵循 MIT 协议。

Copyright (c) LogicCore Team.
Original Copyright (c) Microsoft Corporation.
