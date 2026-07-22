#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
3D 可探索课件展示 · 教师输入图形界面（tkinter）
==============================================
老师填课程名 / 欢迎语，添加若干「学习模块」（名称、图标、主题色、一句话、内容），
点「生成」即可产出可漫步的 3D 课件广场；点「预览」本地起服务器并在浏览器打开。

内容写法：每个模块的内容框里，用 『## 小节标题』 换行分隔不同小节，
例如：
  ## 文件管理
  文件按 磁盘→文件夹→文件 层级存放
  ## 常用快捷键
  Win+D 回到桌面

防闪退要点（沿用 text-to-voiceover-video 经验）：
  入口 UTF-8 重配置；顶层 try/except 弹窗报错；重活放后台线程；UI 线程安全更新日志。
"""
import sys, os, re, json, threading, webbrowser, tempfile, subprocess
import tkinter as tk
from tkinter import filedialog, messagebox, ttk, scrolledtext

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(SKILL_DIR, "scripts"))
import generate  # noqa: 生成器（纯标准库）

COLORS = [
    ("蓝", "#4f8cff"), ("绿", "#2ecc71"), ("橙", "#ff8c42"),
    ("红", "#ff5d5d"), ("紫", "#9b8cff"), ("青", "#1ab9c9"),
    ("粉", "#ff7eb6"), ("黄", "#ffcf4d"),
]
COLOR_LABELS = [f"{n} {c}" for n, c in COLORS]
COLOR_MAP = {f"{n} {c}": c for n, c in COLORS}
BGM_HINT = "（内容里用 ## 小节标题 换行分隔不同小节；支持 **加粗** 与 `代码`）"


def sanitize(name):
    name = re.sub(r'[\\/:*?"<>|\r\n\t]+', "_", name).strip()
    return name[:40].strip() or "课件"


class ModuleCard:
    """一张模块卡片，持有自己的控件与取值。"""
    def __init__(self, parent, index, on_delete):
        self.frame = ttk.LabelFrame(parent, text=f"模块 {index}")
        self.name = tk.StringVar()
        self.icon = tk.StringVar(value="📘")
        self.color = tk.StringVar(value=COLOR_LABELS[0])
        self.summary = tk.StringVar()
        self.content = ""

        row = 0
        f = self.frame
        ttk.Label(f, text="名称：").grid(row=row, column=0, sticky="w", padx=4)
        ttk.Entry(f, textvariable=self.name, width=18).grid(row=row, column=1, sticky="we", padx=2)
        ttk.Label(f, text="图标：").grid(row=row, column=2, sticky="w")
        ttk.Entry(f, textvariable=self.icon, width=6).grid(row=row, column=3, padx=2)
        row += 1

        ttk.Label(f, text="主题色：").grid(row=row, column=0, sticky="w", padx=4)
        cb = ttk.Combobox(f, textvariable=self.color, width=14, state="readonly")
        cb["values"] = COLOR_LABELS
        cb.grid(row=row, column=1, columnspan=2, sticky="w", padx=2)
        ttk.Button(f, text="删除", command=on_delete).grid(row=row, column=3, padx=2)
        row += 1

        ttk.Label(f, text="一句话：").grid(row=row, column=0, sticky="w", padx=4)
        ttk.Entry(f, textvariable=self.summary, width=46).grid(row=row, column=1, columnspan=3, sticky="we", padx=2)
        row += 1

        ttk.Label(f, text="内容：").grid(row=row, column=0, sticky="nw", padx=4, pady=(2, 0))
        st = scrolledtext.ScrolledText(f, height=7, width=52, wrap="word")
        st.grid(row=row, column=1, columnspan=3, sticky="we", padx=2, pady=2)
        ttk.Label(f, text=BGM_HINT, font=("微软雅黑", 8), foreground="#888").grid(
            row=row + 1, column=1, columnspan=3, sticky="w", padx=2)
        self.text = st
        f.columnconfigure(1, weight=1)

    def get(self):
        return {
            "name": self.name.get().strip(),
            "icon": self.icon.get().strip() or "📘",
            "color": COLOR_MAP.get(self.color.get(), "#4f8cff"),
            "summary": self.summary.get().strip(),
            "content": self.text.get("1.0", "end").strip(),
        }

    def set(self, d):
        self.name.set(d.get("name", ""))
        self.icon.set(d.get("icon", "📘"))
        c = d.get("color", "#4f8cff")
        lab = next((k for k, v in COLOR_MAP.items() if v.lower() == c.lower()), COLOR_LABELS[0])
        self.color.set(lab)
        self.summary.set(d.get("summary", ""))
        self.text.delete("1.0", "end")
        self.text.insert("1.0", d.get("content", ""))


class App:
    def __init__(self, root):
        self.root = root
        self.root.title("3D 课件展示生成器  (3d-courseware)")
        self.root.geometry("760x760")
        try:
            self.root.iconbitmap()
        except Exception:
            pass

        self.title_var = tk.StringVar(value="中考集训地")
        self.subtitle_var = tk.StringVar(value="信息科技 · 中考冲刺")
        self.intro_var = tk.StringVar(value="欢迎来到中考集训地！走近每块牌子，点击进入对应模块学习。")
        self.out_dir = tk.StringVar()
        self.cards = []
        self.busy = False
        self.last_out = None

        self._build_ui()

    def _build_ui(self):
        top = ttk.Frame(self.root, padding=10)
        top.pack(fill="x")

        ttk.Label(top, text="课程名称：").grid(row=0, column=0, sticky="w")
        ttk.Entry(top, textvariable=self.title_var, width=26).grid(row=0, column=1, sticky="we", padx=2)
        ttk.Label(top, text="副标题/学科：").grid(row=0, column=2, sticky="w", padx=(10, 0))
        ttk.Entry(top, textvariable=self.subtitle_var, width=22).grid(row=0, column=3, sticky="we", padx=2)

        ttk.Label(top, text="欢迎语：").grid(row=1, column=0, sticky="w", pady=(6, 0))
        self.intro_st = scrolledtext.ScrolledText(top, height=2, width=70, wrap="word")
        self.intro_st.grid(row=1, column=1, columnspan=3, sticky="we", padx=2, pady=(6, 0))
        self.intro_st.insert("1.0", self.intro_var.get())
        top.columnconfigure(1, weight=1)

        # 模块区（可滚动）
        mid = ttk.Frame(self.root)
        mid.pack(fill="both", expand=True, padx=10, pady=6)
        bar = ttk.Scrollbar(mid)
        bar.pack(side="right", fill="y")
        self.canvas = tk.Canvas(mid, yscrollcommand=bar.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        bar.config(command=self.canvas.yview)
        self.card_host = ttk.Frame(self.canvas)
        self.canvas.create_window((0, 0), window=self.card_host, anchor="nw")
        self.card_host.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))

        ctrl = ttk.Frame(self.root, padding=(10, 4))
        ctrl.pack(fill="x")
        ttk.Button(ctrl, text="＋ 添加模块", command=self.add_card).pack(side="left", padx=3)
        ttk.Button(ctrl, text="载入示例", command=self.load_example).pack(side="left", padx=3)
        ttk.Button(ctrl, text="清空", command=self.clear_cards).pack(side="left", padx=3)

        # 输出 + 按钮
        bot = ttk.Frame(self.root, padding=(10, 6))
        bot.pack(fill="x")
        ttk.Label(bot, text="输出目录：").grid(row=0, column=0, sticky="w")
        ttk.Entry(bot, textvariable=self.out_dir, width=46).grid(row=0, column=1, sticky="we", padx=2)
        ttk.Button(bot, text="浏览…", command=self.pick_outdir).grid(row=0, column=2, padx=2)

        bf = ttk.Frame(self.root, padding=(10, 2))
        bf.pack(fill="x")
        self.btn_gen = ttk.Button(bf, text="▶ 生成 3D 课件", command=self.on_generate, width=20)
        self.btn_gen.pack(side="left", padx=3)
        self.btn_preview = ttk.Button(bf, text="🌐 预览", command=self.on_preview, width=14)
        self.btn_preview.pack(side="left", padx=3)
        self.btn_open = ttk.Button(bf, text="📁 打开文件夹", command=self.on_open, width=16)
        self.btn_open.pack(side="left", padx=3)

        ttk.Label(self.root, text="运行日志：").pack(anchor="w", padx=12)
        self.log = scrolledtext.ScrolledText(self.root, height=9, wrap="word")
        self.log.pack(fill="both", expand=True, padx=10, pady=(2, 8))

        # 默认给两张卡片
        self.add_card()
        self.add_card()

    # ---------- 模块卡片 ----------
    def add_card(self, data=None):
        idx = len(self.cards) + 1

        def delete():
            self.cards.remove(card)
            card.frame.destroy()
            self._renumber()
        card = ModuleCard(self.card_host, idx, delete)
        if data:
            card.set(data)
        card.frame.pack(fill="x", pady=5, padx=2)
        self.cards.append(card)
        self._renumber()
        self.canvas.update_idletasks()
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _renumber(self):
        for i, c in enumerate(self.cards, 1):
            c.frame.config(text=f"模块 {i}")

    def clear_cards(self):
        for c in self.cards:
            c.frame.destroy()
        self.cards.clear()

    def load_example(self):
        p = os.path.join(SKILL_DIR, "templates", "courseware.example.json")
        if not os.path.isfile(p):
            messagebox.showerror("示例缺失", "找不到示例文件 courseware.example.json")
            return
        try:
            data = json.load(open(p, "r", encoding="utf-8-sig"))
        except Exception as e:
            messagebox.showerror("读取失败", str(e))
            return
        self.title_var.set(data.get("title", ""))
        self.subtitle_var.set(data.get("subtitle", ""))
        self.intro_st.delete("1.0", "end")
        self.intro_st.insert("1.0", data.get("intro", ""))
        self.clear_cards()
        for m in data.get("modules", []):
            self.add_card(m)

    def pick_outdir(self):
        d = filedialog.askdirectory(title="选择输出目录")
        if d:
            self.out_dir.set(d)

    # ---------- 构建 profile ----------
    def _build_profile(self):
        modules = []
        for c in self.cards:
            m = c.get()
            if not m["name"] and not m["content"]:
                continue
            modules.append(m)
        profile = {
            "title": self.title_var.get().strip() or "我的课件",
            "subtitle": self.subtitle_var.get().strip(),
            "intro": self.intro_st.get("1.0", "end").strip(),
            "modules": modules,
        }
        return profile

    # ---------- 生成 ----------
    def on_generate(self):
        if self.busy:
            return
        profile = self._build_profile()
        if not profile["modules"]:
            messagebox.showerror("没有模块", "请至少添加一个有名称或内容的模块。")
            return
        out = self.out_dir.get().strip()
        if not out:
            out = os.path.join(tempfile.gettempdir(), sanitize(profile["title"]))
            self.out_dir.set(out)
        self.last_out = os.path.abspath(out)
        self._run_thread(lambda: self._do_generate(profile, self.last_out))

    def _do_generate(self, profile, out):
        self.log_ui(f"[开始] 生成 3D 课件 → {out}")
        self.log_ui(f"       课程：{profile['title']}  模块数：{len(profile['modules'])}")
        try:
            generate.build(profile, out)
        except Exception as e:
            self.log_ui(f"[错误] {e}")
            raise
        self.log_ui(f"[完成] 已生成！目录：{out}")
        self.log_ui(f"        预览：在该目录执行  python -m http.server 8000  然后打开 http://localhost:8000")
        self.root.after(0, lambda: messagebox.showinfo("生成完成", f"3D 课件已生成：\n{out}"))

    # ---------- 预览 ----------
    def on_preview(self):
        if not self.last_out or not os.path.isfile(os.path.join(self.last_out, "index.html")):
            messagebox.showinfo("先生成", "请先点『生成 3D 课件』，再预览。")
            return
        self._run_thread(lambda: self._do_preview(self.last_out), btn_enable=False)

    def _do_preview(self, out):
        import functools, http.server, socketserver
        port = 8137
        self.log_ui(f"[预览] 在 {out} 启动本地服务器（端口 {port}）…")
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=out)
        srv = socketserver.TCPServer(("", port), handler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        webbrowser.open(f"http://localhost:{port}")
        self.log_ui(f"[预览] 已打开浏览器 http://localhost:{port}（服务器在后台运行）")

    def on_open(self):
        if not self.last_out or not os.path.isdir(self.last_out):
            messagebox.showinfo("先生成", "请先生成课件，再打开文件夹。")
            return
        try:
            os.startfile(self.last_out) if os.name == "nt" else subprocess.Popen(["open", self.last_out])
        except Exception as e:
            self.log_ui(f"[提示] 无法打开文件夹：{e}")

    # ---------- 线程包装 ----------
    def _run_thread(self, target, btn_enable=True):
        if self.busy:
            return
        self.busy = True
        for b in (self.btn_gen, self.btn_preview, self.btn_open):
            b.config(state="disabled")
        threading.Thread(target=self._wrap, args=(target, btn_enable), daemon=True).start()

    def _wrap(self, target, btn_enable):
        try:
            target()
        except Exception as e:
            self.log_ui(f"[错误] {e}")
            self.root.after(0, lambda: messagebox.showerror("运行出错", str(e)))
        finally:
            self.busy = False
            if btn_enable:
                self.root.after(0, self._enable_buttons)

    def _enable_buttons(self):
        for b in (self.btn_gen, self.btn_preview, self.btn_open):
            b.config(state="normal")

    def log_ui(self, msg):
        self.root.after(0, lambda: self._append(msg))

    def _append(self, msg):
        self.log.insert("end", str(msg).rstrip() + "\n")
        self.log.see("end")


def main():
    try:
        root = tk.Tk()
        App(root)
        root.mainloop()
    except Exception as e:
        try:
            messagebox.showerror("启动失败", str(e))
        except Exception:
            pass
        try:
            open(os.path.join(tempfile.gettempdir(), "3d_courseware_gui_error.log"),
                 "w", encoding="utf-8").write(repr(e))
        except Exception:
            pass
        sys.exit(1)


if __name__ == "__main__":
    main()
