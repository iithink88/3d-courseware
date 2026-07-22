#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
3D 可探索课件展示 · 生成器
读取 courseware.json（课程标题 + 欢迎语 + 多个学习模块），
产出可部署的静态站点（index.html + app.js + vendor/three.module.js）。

用法：
  python generate.py --profile courseware.json --out ./中考集训地
  python generate.py --profile courseware.json --out ./中考集训地 --serve   # 启动本地预览

作为库调用（GUI 用）：
  from generate import build
  build(profile_dict, out_dir)
"""
import argparse
import json
import os
import shutil
import sys
import http.server
import socketserver

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def log(msg):
    print("[3d-course] " + msg, flush=True)


def sanitize(s):
    s = (s or '').strip().replace('/', '_').replace('\\', '_')
    return s[:60] or '课件'


def build(profile, out_dir, serve=False, port=8000):
    """根据课件字典生成站点。profile 必须含 title 与 modules 列表。"""
    profile.setdefault('title', '我的课件')
    profile.setdefault('subtitle', '')
    profile.setdefault('intro', '')
    profile.setdefault('modules', [])
    if not profile['modules']:
        log("警告：没有任何学习模块，将生成空广场。")

    os.makedirs(out_dir, exist_ok=True)

    # 复制 three.js 与 app.js
    vendor_src = os.path.join(SKILL_DIR, 'vendor', 'three.module.js')
    vendor_dst = os.path.join(out_dir, 'vendor', 'three.module.js')
    os.makedirs(os.path.dirname(vendor_dst), exist_ok=True)
    shutil.copyfile(vendor_src, vendor_dst)
    shutil.copyfile(os.path.join(SKILL_DIR, 'templates', 'app.js'),
                    os.path.join(out_dir, 'app.js'))

    # 渲染 index.html
    with open(os.path.join(SKILL_DIR, 'templates', 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()
    title = sanitize(profile['title'])
    html = (html
            .replace('__TITLE__', profile['title'])
            .replace('__SUBTITLE__', profile['subtitle'])
            .replace('__INTRO__', profile['intro'])
            .replace('__PROFILE__', json.dumps(profile, ensure_ascii=False)))

    with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    log(f"已生成：{out_dir}")
    log(f"  - index.html  ({len(html)} bytes)")
    log(f"  - app.js / vendor/three.module.js")
    log(f"学习模块数：{len(profile['modules'])}")

    if serve:
        serve_site(out_dir, port)
    else:
        log("本地预览：在该目录执行  python -m http.server 8000  然后浏览器打开 http://localhost:8000")
        log("部署：把整个目录推送到 GitHub 并开启 Pages，或放到任意静态托管。")


def generate(profile_path, out_dir, serve=False, port=8000):
    profile_path = os.path.abspath(profile_path)
    if not os.path.isfile(profile_path):
        log(f"错误：找不到 profile 文件：{profile_path}")
        sys.exit(1)
    with open(profile_path, 'r', encoding='utf-8-sig') as f:
        profile = json.load(f)
    build(profile, out_dir, serve, port)


def serve_site(out_dir, port):
    os.chdir(out_dir)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), handler) as httpd:
        log(f"预览服务器已启动：http://localhost:{port}  （Ctrl+C 停止）")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            log("已停止预览服务器。")


def main():
    ap = argparse.ArgumentParser(description="生成 3D 可探索课件展示")
    ap.add_argument('--profile', required=True, help='courseware.json 路径')
    ap.add_argument('--out', default='./my-courseware', help='产出目录')
    ap.add_argument('--serve', action='store_true', help='生成后启动本地预览服务器')
    ap.add_argument('--port', type=int, default=8000, help='预览端口')
    args = ap.parse_args()
    generate(args.profile, args.out, args.serve, args.port)


if __name__ == '__main__':
    main()
