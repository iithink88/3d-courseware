#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 3d-courseware 生成的站点打包成「单文件 HTML」。

难点：站点用 ES Module，app.js 里 `import * as THREE from 'three'` 依赖 Import Map
指向 ./vendor/three.module.js。普通单文件工具不会内联这个模块，导致双击空白。

本脚本做法（不依赖 import map，file:// 双击也能用）：
  1. 把 three.module.js 原文放进 <script type="text/plain" id="three-src">（不执行）
  2. 把 app.js 内联为 <script type="module">，开头用
     `const THREE = await import(URL.createObjectURL(blob))` 动态加载 three，
     并去掉 app.js 原有的 `import * as THREE from 'three'` 行
  3. 保留已注入的 window.PROFILE
产出：自包含 .html，无需任何周边文件，双击即可在 Chrome/Edge 打开，可微信/U盘分享。
"""
import sys, os, re, argparse


def escape_script(s: str) -> str:
    # 避免内联内容里的 </script> 提前闭合
    return s.replace("</script", "<\\/script")


def pack(src_dir: str, out_path: str):
    idx = os.path.join(src_dir, "index.html")
    app = os.path.join(src_dir, "app.js")
    three = os.path.join(src_dir, "vendor", "three.module.js")
    for f in (idx, app, three):
        if not os.path.isfile(f):
            raise SystemExit(f"[错误] 找不到必需文件：{f}")

    html = open(idx, encoding="utf-8").read()
    app_js = open(app, encoding="utf-8").read()
    three_js = open(three, encoding="utf-8").read()

    # 1) 去掉原 importmap（指向 ./vendor/three.module.js，单文件里不存在）
    html = re.sub(r'<script type="importmap">.*?</script>', "", html, flags=re.S)

    # 2) 去掉 app.js 里的 `import * as THREE from 'three'`（改为运行时 await import(blob)）
    app_js = re.sub(
        r'^\s*import\s+\*\s+as\s+THREE\s+from\s+[\'"]three[\'"];?\s*$',
        "", app_js, flags=re.M,
    )

    # 3) 把 <script type="module" src="./app.js"></script> 替换为一个自包含 module：
    #    - 先 await import(blobURL) 拿到 THREE（等价于 `import * as THREE from 'three'`）
    #    - 再执行 app.js 正文（其中已移除 import 行）
    #    这种方式不依赖 import map，file:// 双击也能用。
    app_inline = (
        '<script type="module">\n'
        "const __threeSrc = document.getElementById('three-src').textContent;\n"
        "const __threeBlob = new Blob([__threeSrc], {type:'text/javascript'});\n"
        "let THREE;\n"
        "try {\n"
        "  THREE = await import(URL.createObjectURL(__threeBlob));\n"
        "} catch (err) {\n"
        "  const d = document.createElement('div');\n"
        "  d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;"
        "padding:24px;text-align:center;font-family:sans-serif;color:#234;background:#cfe8ff;z-index:999;line-height:1.8';\n"
        "  d.innerHTML = '⚠️ 此 3D 互动页面需要较新的 Chrome / Edge 浏览器。<br>'"
        " + '请用最新版 Chrome 或 Edge 双击打开本文件。<br>'"
        " + '若仍空白：在文件所在文件夹按住 Shift 右键 → 在此处打开终端，输入 '"
        " + '<code>python -m http.server 8000</code> 后访问 http://localhost:8000';\n"
        "  document.body.appendChild(d);\n"
        "  throw err;\n"
        "}\n"
        "/* ===== app.js 正文 ===== */\n"
        + escape_script(app_js)
        + "\n</script>"
    )
    html = re.sub(
        r'<script type="module"\s+src="[^"]*app\.js[^"]*"></script>',
        lambda m: app_inline,
        html,
    )

    # 4) 把 three.module.js 源码放进一个不执行的 text/plain 脚本（放在 PROFILE 之后、app module 之前）
    three_holder = (
        '<script type="text/plain" id="three-src">'
        + escape_script(three_js)
        + "</script>\n"
    )
    m = re.search(r'(<script type="module">\s*window\.PROFILE.*?</script>)', html, flags=re.S)
    if m:
        html = html[: m.end()] + "\n" + three_holder + html[m.end():]
    else:
        html = html.replace("</body>", three_holder + "</body>")

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    size = os.path.getsize(out_path)
    print(f"[单文件] 已生成：{out_path}")
    print(f"[单文件] 大小：{size/1024:.0f} KB")
    print(f"[单文件] 内联模块：three.module.js（blob+动态import）+ app.js；PROFILE 已写入")
    print(f"[单文件] 校验：import 行已移除 = {('import * as THREE from' not in app_inline)}")
    print(f"[单文件] 校验：three-src 占位存在 = {('id=\"three-src\"' in html)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="生成的站点目录（含 index.html / app.js / vendor/three.module.js）")
    ap.add_argument("--out", required=True, help="输出单文件 HTML 路径")
    a = ap.parse_args()
    pack(a.src, a.out)


if __name__ == "__main__":
    main()
