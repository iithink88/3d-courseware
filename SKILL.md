---
name: 3d-courseware
display_name: 3D 课件展示生成器
description: 把老师要讲的内容做成一座可漫步的 3D 课件广场。学生操控小猫走近不同的「牌子」（学习模块），点击进入该模块的内容面板分小节学习。适合中小学各科复习/集训/微课展示。支持图形界面让老师零代码填内容一键生成。
type: skill
---

# 3D 可探索课件展示生成器（3d-courseware）

把老师的讲课内容变成一座 **可以漫步的 3D 广场**：操控披风小猫逛展台，每块「牌子」是一个学习模块（如 中考集训地 里的 Windows / 网络 / Word / Excel / PPT）。学生走近牌子按 `E` 或点击，弹出内容面板，左侧是小节导航、右侧是讲解正文，可一节一节学。

纯前端 Three.js，**无需联网、无需构建、内置 Three.js**（离线可用、不怕墙）。老师既可以用**图形界面**零代码生成，也可以直接在对话里让我生成。

## 触发场景
- 用户说「做个 3D 课件 / 3D 课件展示 / 把 XX 内容做成可探索的 3D 主页 / 中考集训地那样的 3D 学习广场」
- 用户想让**学生点击不同牌子进入不同内容学习**
- 教师需要把复习/集训/微课内容做成有趣的可交互展示

## 两种用法

### 用法 A：图形界面（推荐给老师自己用）
双击技能里的 `启动.bat`（需本机有 Python 3，或 WorkBuddy 自带的 Python）：
- 填「课程名称 / 副标题 / 欢迎语」
- 点「＋ 添加模块」添加若干学习模块，每张卡片填：名称、图标 emoji、主题色、一句话简介、内容
- 内容写法：用 `## 小节标题` 换行分隔不同小节，例如：
  ```
  ## 文件管理
  文件按 磁盘→文件夹→文件 层级存放
  ## 常用快捷键
  Win+D 回到桌面
  ```
  （支持 `**加粗**` 与 `` `代码` ``）
- 点「▶ 生成 3D 课件」产出站点；点「🌐 预览」本地起服务器并在浏览器打开；点「📁 打开文件夹」定位产物
- 第一次用可点「载入示例」看「中考集训地」五模块范例

### 用法 B：对话生成（老师给我主题，我出课件）
当用户在对话里给出课程主题 + 模块清单（或让我自己拟定），按以下步骤：
1. 整理成 `courseware.json` 数据结构（见下）
2. 调用 `scripts/generate.py` 生成站点：
   ```bash
   PY="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"
   "$PY" "$HOME/.workbuddy/skills/3d-courseware/scripts/generate.py" \
     --profile 你的courseware.json --out ./输出目录
   ```
3. 预览：进入输出目录 `python -m http.server 8000` → 打开 `http://localhost:8000`
4. 部署：整个目录推 GitHub 开 Pages，或丢到任意静态托管

## 数据结构（courseware.json）
```json
{
  "title": "中考集训地",
  "subtitle": "信息科技 · 中考冲刺",
  "intro": "欢迎来到中考集训地！走近每块牌子点击进入学习。",
  "modules": [
    {
      "name": "Windows",
      "icon": "🪟",
      "color": "#4f8cff",
      "summary": "操作系统与文件管理",
      "content": "## 认识 Windows\nWindows 是常用的操作系统...\n## 常用快捷键\nWin+D 回到桌面"
    }
  ]
}
```
- `modules` 是学习模块数组，每个就是广场上一块牌子
- 模块内容用小节（`## 标题`）组织；不写 `##` 则整段作为「内容」一节
- `color` 为主题色（十六进制），决定牌子颜色与面板主题色

## 操作说明（给学生）
- 移动：W A S D / 方向键
- 转视角：鼠标拖拽（手机：右半屏拖拽 / 左下半屏虚拟摇杆）
- 看内容：走近发光牌子，按 `E` 或 点击；面板内左侧切小节，底部翻上一节/下一节
- 开场有欢迎层，点「开始探索」进入

## 文件结构
```
3d-courseware/
├─ 启动.bat                 # 双击启动图形界面（老师用）
├─ SKILL.md
├─ gui/gui.py               # tkinter 图形界面
├─ scripts/generate.py      # 生成器（build(profile_dict, out_dir) 可被 GUI 直接调用）
├─ scripts/pack_singlefile.py  # 打包成单文件 html（便于分享）
├─ templates/
│  ├─ index.html            # 网页外壳（欢迎层 + 内容面板）
│  ├─ app.js                # 3D 引擎（小猫漫游 + 牌子 + 小节面板）
│  └─ courseware.example.json  # 中考集训地 示例
└─ vendor/three.module.js   # 内置 Three.js（离线可用）
```

## 单文件打包（方便分享给朋友）

生成的多文件站点不能直接发给朋友双击（ES Module 受 file:// 限制）。用自带脚本打包成
**一个自包含 .html**，Three.js 与所有脚本都内联进文件，双击即开：

```bash
PY="C:/Users/lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"
"$PY" "$HOME/.workbuddy/skills/3d-courseware/scripts/pack_singlefile.py" \
  --src 生成的站点目录 \
  --out 桌面/中考集训地-单文件.html
```

原理：把 `three.module.js` 内联为不执行的文本，运行时用 `await import(blobURL)` 动态加载，
去掉原 `import * as THREE from 'three'` 行，因此**不依赖 Import Map、file:// 双击也能用**。
若朋友浏览器过旧导致加载失败，页面会显示提示引导他们用 Chrome/Edge 或本地服务器。

## 踩坑 / 注意
- ES Module 必须走 http 打开，**不能直接双击 index.html**（file:// 会被浏览器拦截）→ 生成后务必用 `python -m http.server` 预览
- 想"发给朋友双击就玩"请用上面的 `pack_singlefile.py` 打成单文件 html
- 内容是纯文本小节，支持 `**加粗**` 与 `` `代码` ``，不写 HTML（已做转义防注入）
- 模块数量不限，太多牌子会绕一大圈，建议单课 ≤ 8 个模块
- Three.js 已内置，分享给朋友无需他们额外下载任何东西
