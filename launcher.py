"""
ComfyUI Web 桌面启动器
- GUI 界面填写 ComfyUI 地址
- 一键启动/停止服务器
- 最小化到系统托盘
"""

import sys
import os
import threading
import webbrowser
import json
import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image

if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w')
if sys.stderr is None:
    sys.stderr = open(os.devnull, 'w')

def _get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR = _get_base_dir()
CONFIG_FILE = os.path.join(BASE_DIR, 'launcher_config.json')
ICON_PATH = os.path.join(BASE_DIR, 'icon.ico')

sys.path.insert(0, BASE_DIR)
import server


def load_config():
    defaults = {
        'comfyui_url': 'http://127.0.0.1:8188',
        'port': 8080,
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
            defaults.update(saved)
        except Exception:
            pass
    return defaults


def save_config(cfg):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


class LauncherApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title('ComfyUI Web')
        self.root.resizable(False, False)
        self.root.geometry('420x320')

        if os.path.exists(ICON_PATH):
            self.root.iconbitmap(ICON_PATH)

        self.httpd = None
        self.server_thread = None
        self.tray_icon = None
        self.running = False

        self._build_ui()
        self._load_saved()

        self.root.protocol('WM_DELETE_WINDOW', self._on_close)

    def _build_ui(self):
        self.root.configure(bg='#f5f5f5')

        style = ttk.Style()
        style.theme_use('clam')
        style.configure('Title.TLabel', font=('Microsoft YaHei UI', 16, 'bold'),
                        background='#f5f5f5', foreground='#333')
        style.configure('TLabel', font=('Microsoft YaHei UI', 10),
                        background='#f5f5f5')
        style.configure('TEntry', font=('Consolas', 10))
        style.configure('Start.TButton', font=('Microsoft YaHei UI', 11, 'bold'),
                        padding=(20, 8))
        style.configure('Link.TButton', font=('Microsoft YaHei UI', 9))
        style.configure('Status.TLabel', font=('Microsoft YaHei UI', 9),
                        background='#f5f5f5', foreground='#888')

        main = ttk.Frame(self.root, padding=24)
        main.configure(style='TFrame')
        style.configure('TFrame', background='#f5f5f5')
        main.pack(fill='both', expand=True)

        ttk.Label(main, text='ComfyUI Web', style='Title.TLabel').pack(pady=(0, 16))

        frm_url = ttk.Frame(main)
        frm_url.pack(fill='x', pady=4)
        ttk.Label(frm_url, text='ComfyUI 地址:').pack(side='left')
        self.var_url = tk.StringVar()
        self.ent_url = ttk.Entry(frm_url, textvariable=self.var_url, width=32)
        self.ent_url.pack(side='right', fill='x', expand=True, padx=(8, 0))

        frm_port = ttk.Frame(main)
        frm_port.pack(fill='x', pady=4)
        ttk.Label(frm_port, text='本地端口:').pack(side='left')
        self.var_port = tk.StringVar()
        self.ent_port = ttk.Entry(frm_port, textvariable=self.var_port, width=10)
        self.ent_port.pack(side='right', padx=(8, 0))

        frm_btns = ttk.Frame(main)
        frm_btns.pack(pady=20)

        self.btn_start = ttk.Button(frm_btns, text='启动服务', style='Start.TButton',
                                    command=self._toggle_server)
        self.btn_start.pack(side='left', padx=6)

        self.btn_open = ttk.Button(frm_btns, text='打开网页', style='Link.TButton',
                                   command=self._open_browser, state='disabled')
        self.btn_open.pack(side='left', padx=6)

        self.btn_tray = ttk.Button(frm_btns, text='最小化到托盘', style='Link.TButton',
                                   command=self._minimize_to_tray)
        self.btn_tray.pack(side='left', padx=6)

        self.lbl_status = ttk.Label(main, text='状态: 未启动', style='Status.TLabel')
        self.lbl_status.pack(pady=(8, 0))

    def _load_saved(self):
        cfg = load_config()
        self.var_url.set(cfg['comfyui_url'])
        self.var_port.set(str(cfg['port']))

    def _toggle_server(self):
        if not self.running:
            self._start_server()
        else:
            self._stop_server()

    def _start_server(self):
        url = self.var_url.get().strip()
        try:
            port = int(self.var_port.get().strip())
        except ValueError:
            messagebox.showerror('错误', '端口必须是数字')
            return

        if not url:
            messagebox.showerror('错误', '请填写 ComfyUI 地址')
            return

        save_config({'comfyui_url': url, 'port': port})

        server.COMFYUI_URL = url.rstrip('/')
        server.PORT = port
        server.STATIC_DIR = BASE_DIR

        from urllib.parse import urlparse
        parsed = urlparse(server.COMFYUI_URL)
        host = parsed.hostname or '127.0.0.1'
        comfy_port = parsed.port or 8188

        try:
            server.start_ws_proxy(port, host, comfy_port)
            self.httpd = server.ThreadedHTTPServer(('0.0.0.0', port), server.Handler)
        except OSError as e:
            messagebox.showerror('错误', f'端口 {port} 被占用：{e}')
            return
        except Exception as e:
            messagebox.showerror('错误', f'服务器启动失败：{e}')
            return

        self.server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.server_thread.start()
        self.running = True

        self.btn_start.configure(text='停止服务')
        self.btn_open.configure(state='normal')
        self.ent_url.configure(state='disabled')
        self.ent_port.configure(state='disabled')
        self.lbl_status.configure(text=f'状态: 运行中  ·  http://127.0.0.1:{port}',
                                  foreground='#2e7d32')

        threading.Timer(0.5, lambda: webbrowser.open(f'http://127.0.0.1:{port}')).start()

    def _stop_server(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd = None
        self.running = False

        self.btn_start.configure(text='启动服务')
        self.btn_open.configure(state='disabled')
        self.ent_url.configure(state='normal')
        self.ent_port.configure(state='normal')
        self.lbl_status.configure(text='状态: 已停止', foreground='#888')

    def _open_browser(self):
        port = self.var_port.get().strip()
        webbrowser.open(f'http://127.0.0.1:{port}')

    def _minimize_to_tray(self):
        self.root.withdraw()
        self.root.update()
        self._create_tray()

    def _create_tray(self):
        import pystray

        if os.path.exists(ICON_PATH):
            icon_image = Image.open(ICON_PATH)
        else:
            icon_image = Image.new('RGB', (64, 64), '#4a90d9')

        menu = pystray.Menu(
            pystray.MenuItem('显示窗口', self._show_window, default=True),
            pystray.MenuItem('打开网页', lambda: self._open_browser()),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('退出', self._quit_app),
        )

        self.tray_icon = pystray.Icon('ComfyUI-Web', icon_image, 'ComfyUI Web', menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def _show_window(self, icon=None, item=None):
        if self.tray_icon:
            self.tray_icon.stop()
            self.tray_icon = None
        self.root.after(0, self.root.deiconify)

    def _quit_app(self, icon=None, item=None):
        if self.tray_icon:
            self.tray_icon.stop()
            self.tray_icon = None
        self._stop_server()
        self.root.after(0, self.root.destroy)

    def _on_close(self):
        if self.running:
            self._minimize_to_tray()
        else:
            self._quit_app()

    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    app = LauncherApp()
    app.run()
