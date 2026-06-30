# ComfyUI Web

A portable desktop application that provides a clean, user-friendly web interface for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) image generation.

## Features

- **One-click launch** — GUI launcher with built-in reverse proxy, no CORS configuration needed
- **Tag-based prompt builder** — categorized tags for easy prompt creation
- **Model support** — SDXL (Checkpoint) and Anima (Diffusion Model) architectures
- **Optional modules** — LoRA, Hires Fix, ControlNet, img2img
- **System tray** — minimize to tray and keep running in the background
- **Portable** — just unzip and double-click `ComfyUI-Web.exe`, no Python required

## Quick Start

1. Start your ComfyUI backend (default: `http://127.0.0.1:8188`)
2. Run `ComfyUI-Web.exe`
3. Click **Start** — the browser opens automatically

## How It Works

ComfyUI Web acts as a proxy between your browser and the ComfyUI backend. It serves a modern web UI and forwards API requests to ComfyUI, handling CORS automatically.

## Development

Run directly with Python:

```bash
python server.py
```

Or use the GUI launcher:

```bash
pip install Pillow pystray
python launcher.py
```

## Build

Package as a standalone executable:

```bash
pip install pyinstaller Pillow pystray
python -m PyInstaller --onedir --noconsole --name "ComfyUI-Web" --icon icon.ico launcher.py
```

Then copy `index.html`, `style.css`, `script.js`, `tags.json`, `icon.ico`, and `server.py` into the `dist/ComfyUI-Web/` folder.

## License

MIT
