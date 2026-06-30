# 🎨 ComfyUI Web

> ✨ 一个轻量级的 ComfyUI 网页端工具，让 AI 绘图变得更简单！

---

## 📥 下载

👉 [**点击下载 ComfyUI-Web v1.0.0（Windows 免安装版）**](https://github.com/mhmoma/comfyui-Web/releases/download/v1.0.0/ComfyUI-Web-v1.0.zip)

下载后解压，双击 `ComfyUI-Web.exe` 即可使用，无需安装 Python 🎉

---

## 🌟 功能特性

- 🖱️ **一键启动** — GUI 启动器，填入地址点击开始就能用
- 🔄 **内置反向代理** — 无需给 ComfyUI 加 CORS 参数
- 🏷️ **标签式提示词** — 分类标签快速构建 Prompt
- 🧠 **多架构支持** — SDXL (Checkpoint) / Anima (Diffusion Model)
- 🎛️ **丰富的可选模块** — LoRA、高清放大、ControlNet、img2img
- 📌 **系统托盘** — 最小化到托盘后台运行
- 📦 **开箱即用** — 解压即用，不需要任何环境

---

## 🚀 快速开始

1. 启动你的 **ComfyUI** 后端（默认地址 `http://127.0.0.1:8188`）
2. 双击 **ComfyUI-Web.exe**
3. 点击 **「启动服务」** — 浏览器自动打开 🎉

---

## 💡 工作原理

ComfyUI Web 在你的浏览器和 ComfyUI 后端之间充当代理：

```
浏览器 ←→ ComfyUI Web (8080) ←→ ComfyUI 后端 (8188)
```

它负责托管网页界面、转发 API 请求、自动处理跨域问题。

---

## 🛠️ 开发者指南

直接用 Python 运行：

```bash
# 运行代理服务器
python server.py

# 或使用 GUI 启动器
pip install Pillow pystray
python launcher.py
```

打包成独立 exe：

```bash
pip install pyinstaller Pillow pystray
python -m PyInstaller --onedir --noconsole --name "ComfyUI-Web" --icon icon.ico launcher.py
```

打包后将 `index.html`、`style.css`、`script.js`、`tags.json`、`icon.ico`、`server.py` 复制到 `dist/ComfyUI-Web/` 即可。

---

## 📄 License

MIT
