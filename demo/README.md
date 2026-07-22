# 示例 Demo：中考集训地（单文件版）

本目录里的 `中考集训地-单文件.html` 是一个**可直接双击运行**的成品示例：
一个可漫步的 3D 课件广场，学生操控披风小猫走动，走近 5 块发光牌子
（Windows / 网络 / Word / Excel / PPT），按 `E` 或点击即可进入对应模块分小节学习。

> 用最新版 **Chrome / Edge** 双击打开即可；若浏览器不兼容，页面会提示
> 用本地服务器打开（见下方「本地运行」）。

---

## 这个单文件是怎么做出来的（制作过程）

它来自技能自带的示例课件 `templates/courseware.example.json`，
经过**两步生成**，最后**打包成单文件**：

### 第 1 步：用示例课件生成站点
```bash
python scripts/generate.py \
  --profile templates/courseware.example.json \
  --out 输出目录
```
`generate.py` 会读取课件 JSON（标题 / 欢迎语 / 多个模块：名称、图标、主题色、小节内容），
把 `templates/index.html` + `templates/app.js` + 内置的 `vendor/three.module.js`
复制并填充，产出一个**多文件站点**（需经 http 打开）。

示例 `courseware.example.json` 的结构（可照抄改成你自己的课）：
```json
{
  "title": "中考集训地",
  "subtitle": "信息科技 · 总复习",
  "intro": "欢迎来到中考集训地！用 W/A/S/D 或方向键移动……",
  "modules": [
    {
      "name": "Windows",
      "icon": "🪟",
      "color": "#4f8cff",
      "summary": "操作系统与文件管理",
      "content": "## 文件管理\n在资源管理器里……\n## 常用快捷键\nWin+D 显示桌面"
    }
  ]
}
```

### 第 2 步：打包成单文件 HTML
```bash
python scripts/pack_singlefile.py \
  --src 输出目录 \
  --out 中考集训地-单文件.html
```
`pack_singlefile.py` 做了三件事，解决「单文件 + ES Module + Three.js」的兼容难题：
1. 把 `three.module.js`（约 1.27 MB）源码内联进 HTML；
2. `app.js` 内联为 `<script type="module">`，并把原来的
   `import * as THREE from 'three'` 改为运行时 `await import(blobURL)` 注入 THREE 命名空间
   ——**不依赖 Import Map**，规避 `file://` 双击场景的兼容风险；
3. 保留已注入的 `window.PROFILE`（课件数据）。

最终得到一个**自包含、零外部依赖、可离线、可微信/U盘分享**的 `.html`。

---

## 本地运行（备用方案）

若双击打开后是空白（极少数老浏览器），在该文件所在目录：
1. 地址栏输入 `cmd` 回车，或按住 Shift 右键「在此处打开终端」；
2. 运行：`python -m http.server 8000`；
3. 浏览器访问 `http://localhost:8000/中考集训地-单文件.html`。

---

## 想做自己的课件？

见仓库根目录 `README.md`，或直接对 WorkBuddy 说：
「用 3D 课件技能做一个 XX 主题的课件，模块有……」。
自己改 JSON 后，重复上面两步即可生成属于你的单文件 3D 课件。
