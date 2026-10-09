---
name: 冰沙的速写本
description: 一本正在被画的速写本：冷灰纸上的钢笔线，页面里只有一种颜色，红。
colors:
  paper: "#ecebe6"
  ink: "#121211"
  mute: "#55544e"
  faint: "rgba(18, 18, 17, 0.16)"
  red: "#c41230"
  code-bg: "#e1e0da"
  paper-dark: "#151514"
  ink-dark: "#ecebe6"
  mute-dark: "#a2a198"
  faint-dark: "rgba(236, 235, 230, 0.16)"
  red-dark: "#ff5468"
  code-bg-dark: "#1d1d1b"
typography:
  display:
    fontFamily: "'Noto Serif SC Variable', 'Noto Serif SC', 'Songti SC', 'STSong', serif"
    fontSize: "clamp(150px, 23vw, 340px)"
    fontWeight: 200
    lineHeight: 0.82
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Noto Serif SC Variable', 'Noto Serif SC', 'Songti SC', 'STSong', serif"
    fontSize: "clamp(64px, 8.4vw, 120px)"
    fontWeight: 200
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Noto Serif SC Variable', 'Noto Serif SC', 'Songti SC', 'STSong', serif"
    fontSize: "clamp(34px, 4.4vw, 56px)"
    fontWeight: 300
    lineHeight: 1.28
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Noto Serif SC Variable', 'Noto Serif SC', 'Songti SC', 'STSong', serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 2
  numeral:
    fontFamily: "'Bodoni Moda Variable', 'Bodoni 72', 'Didot', serif"
    fontSize: "16px"
    fontWeight: 400
    fontFeature: "italic; font-variant-numeric: oldstyle-nums"
  label:
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  note:
    fontFamily: "'Noto Serif SC Variable', 'Noto Serif SC', 'Songti SC', 'STSong', serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.95
  caption:
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: "'Noto Serif SC Variable', 'Noto Serif SC', 'Songti SC', 'STSong', serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  latin-sub:
    fontFamily: "'Bodoni Moda Variable', 'Bodoni 72', 'Didot', serif"
    fontSize: "clamp(18px, 1.6vw, 24px)"
    fontWeight: 400
    fontFeature: "italic"
  latin-name:
    fontFamily: "'Bodoni Moda Variable', 'Bodoni 72', 'Didot', serif"
    fontSize: "clamp(20px, 2vw, 28px)"
    fontWeight: 400
    fontFeature: "italic"
  display-narrow:
    fontFamily: "'Noto Serif SC Variable', 'Noto Serif SC', 'Songti SC', 'STSong', serif"
    fontSize: "clamp(130px, 38vw, 200px)"
    fontWeight: 200
    lineHeight: 0.82
    letterSpacing: "-0.03em"
  eye-note-narrow:
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', serif"
    fontSize: "27px"
    fontWeight: 400
rounded:
  hair: "2px"
spacing:
  gutter: "clamp(20px, 3.4vw, 52px)"
  section: "clamp(80px, 14vh, 170px)"
  column: "1240px"
  measure: "38em"
components:
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  list-row:
    textColor: "{colors.ink}"
    padding: "15px 0"
  code-block:
    backgroundColor: "{colors.code-bg}"
    rounded: "{rounded.hair}"
    padding: "16px 18px"
---

# Design System: 冰沙的速写本

## Overview

**Creative North Star: "正在被画的速写本"**

整个站点是一本正在被画的速写本，页面本身就是线稿。近黑的钢笔线画在冷灰纸上（暗色里是白线画在近黑的纸上），纸面有一层极轻的颗粒。线条先落浅灰草稿，再落墨，画完后轻微“沸腾”，像动画原画。页面里只有一种颜色：红。

字体有三个声部：200 字重的巨大宋体做标题，意大利体 Bodoni 做数字、日期和英文，手写楷体做批注和导航。版面是编辑式的单栏与双栏，靠细线分行，不靠盒子分块。阅读页是同一世界的安静版本：标题仍用细体，正文换成常规粗细。

**Key Characteristics:**
- 红是唯一的颜色，且只出现在“笔”的痕迹里。
- 标题 200 字重，正文 400 字重。
- 一切图形都是钢笔路径，先画后沸腾。
- 无卡片、无阴影、无圆角盒子；分隔只用发丝线。
- 首页只有眼睛是大面积动画时刻。

## Colors

冷灰纸、近黑墨、一支红笔。红在亮色里是深绯红，在暗色里提亮到粉红以保持对比。

### Primary
- **红笔 Red Pen** (`{colors.red}` 亮 / `{colors.red-dark}` 暗)：唯一的色彩。用于裂纹、红笔划线（`.mk`）、彼岸花、正字计数的斜线、太阳、阅读进度线、滚动刻度、目录当前节的红点、焦点轮廓、链接下划线、搜索高亮、光标。

### Neutral
- **冷灰纸 Cold Paper** (`{colors.paper}` / `{colors.paper-dark}`)：页面底，叠一层 feTurbulence 颗粒（亮色黑点 alpha .1，暗色白点 alpha .07）。
- **近黑墨 Ink** (`{colors.ink}` / `{colors.ink-dark}`)：正文、钢笔线、粗分隔线。
- **灰墨 Mute** (`{colors.mute}` / `{colors.mute-dark}`)：次要文字、草稿构图线（`.ln.g`，透明度 .55）。
- **发丝线 Faint** (`{colors.faint}` / `{colors.faint-dark}`)：行间分隔，墨色 16% 透明。
- **代码底 Code Ground** (`{colors.code-bg}` / `{colors.code-bg-dark}`)：行内代码、代码块、文章配图底。

代码着色只用三色：墨（正文）、灰（注释，斜体）、红（关键字与数字，亮 `#a80f27`、暗 `#ff7385`），定义在 `config/shiki-themes.mjs`。

### Named Rules
**The One Red Rule.** 红是页面里唯一的颜色。不增加第二种色相；灰度之外的一切都是红。
**The Ink Inversion Rule.** 暗色不是另一套设计，是同一张纸翻面：纸变近黑，线变白，红保留（并提亮）。

## Typography

**Display Font:** Noto Serif SC Variable（回退 Songti SC, STSong, serif）
**Numeral / Latin Font:** Bodoni Moda Variable 意大利体（回退 Bodoni 72, Didot）
**Hand / Label Font:** LXGW WenKai（回退 Kaiti SC, STKaiti）
**Mono:** ui-monospace, SF Mono, JetBrains Mono, Menlo（仅代码）

**Character:** 极细的宋体像铅笔勾的大字，Bodoni 意大利体像页边的数字与英文注脚，楷体像手写批注。三者各管一类信息，不互相替代。

### Hierarchy
- **Display** (200, clamp(150px, 23vw, 340px), 0.82)：首页姓名「冰沙」，字距 -0.03em。
- **Headline** (200, clamp(64px, 8.4vw, 120px), 1)：首页章节标题与列表页标题（`.page-title`），旁边挂一个灰色 Bodoni 意大利体英文名。404 的 h1 同为 200，clamp(70px, 14vw, 180px)。
- **Title** (300, clamp(34px, 4.4vw, 56px), 1.28)：阅读页文章标题。`.big` 句子 300，clamp(30px, 3.3vw, 48px)，1.4，可带红笔划线。
- **Body** (400, 17px 阅读页 / 16px 全站, 行高 2 / 1.95)：正文，阅读栏宽 38em。文内 h2 400，h3/h4 600。
- **Numeral** (Bodoni 意大利体 400, 14 至 24px, oldstyle-nums)：日期、年谱年份、计数、联系方式的标签。
- **Label** (楷体 400, 13 至 15px)：导航、面包屑、分类、图注、标签、页脚。

### Named Rules
**The Weight Split Rule.** 展示字 200，阅读正文 400；中间的 300 只给阅读页标题、`.big` 句和搜索输入。不要给大标题加粗。
**The Three Voices Rule.** 宋体说话，Bodoni 意大利体记数，楷体批注。新文字先问它属于哪个声部。

## Layout

纸面式编辑版面。外边距 `--gutter`（clamp(20px, 3.4vw, 52px)），内容列最大 1240px 居中；章节上下留白 clamp(80px, 14vh, 170px)。首屏：眼睛绝对定位在右上，约 76vh；姓名压在左下；介绍小段在右下。

内容区多为两栏不对称网格：近况 0.9fr / 1.1fr，文章 1.25fr / 0.75fr，尾声 1.1fr / 0.9fr，间距 clamp(32px, 6vw, 96px)。阅读页是 40em 正文列加 15em 的粘性目录。年谱左侧留 150px 给荆棘线。行与行之间用 1px 发丝线，列表顶部用 1.5px 墨线起笔。

响应式：900px 以下首页所有双栏塌成单列，眼睛改为流内元素，姓名缩到 clamp(130px, 38vw, 200px)；1000px 以下阅读页隐藏目录；640px 以下导航收紧并隐藏长项。顶栏固定，底下是纸色渐变遮罩。

## Elevation & Depth

没有阴影，也没有层叠面。深度只靠纸的颗粒、线的粗细（0.8 / 1.3 / 2.4）和灰度草稿线与墨线的前后关系表达。姓名在亮色下用 `mix-blend-mode: multiply` 压进眼睛线稿，像墨叠在墨上。

### Named Rules
**The Flat Paper Rule.** 一切平放在纸上。想强调就加粗一笔或换成红，不加阴影、不抬升、不做卡片。

## Shapes

形来自钢笔路径：圆角端点、圆角连接（`stroke-linecap: round`），线宽 1.3 为基准，0.8 为细（`.t`），2.4 为粗（`.b`），灰草稿线 0.7。页面框线是手绘“粗糙边”（home.ts 生成），不是 CSS 边框。CSS 里的几何只有发丝横线、2px 的代码块圆角、以及目录当前节的 7px 红点。

## Components

### Pen Line（签名构件）
所有图形（眼睛、年谱荆棘线、彼岸花、近况与尾声线稿、正字计数、阅读页分隔线）都是 SVG 路径，`pathLength=1`，用 `stroke-dasharray: 1` 加 `stroke-dashoffset` 的 `pen` 动画落笔，延迟由 `--dl` 排定（默认时长 `--dur` 1.4s，缓动 cubic-bezier(0.55, 0, 0.25, 1)）。填充物（瞳孔、红花）在 `--dl` 后淡入。画完加 `.done`，之后带 `boil` 的线套 SVG 湍流滤镜产生轻微沸腾，仅在 `prefers-reduced-motion: no-preference` 且精细指针悬停设备上开启。暗色里实心填充变成“描边的暗盘”，避免刺眼的白。

### Eye
首屏唯一的大面积动画：先画草稿线约 7 秒，之后瞳孔跟随鼠标，每隔几秒眨眼（eye.ts）。404 复用同一只眼睛。

### Navigation
固定顶栏，左为 Bodoni 意大利体字标（22px），右为楷体 15px 链接，间距 26px。悬停、聚焦、当前页时下方 1px 墨线从左向右展开（0.5s，`--ease`）。主题切换是 18px 线描太阳/月亮图标。

### Index Row（文章索引）
顶 1.5px 墨线，每行三列：Bodoni 日期（7.2em）、标题（宋体 17px）、楷体分类。悬停时标题下用红笔“划”一道（`.scr`，stroke-dashoffset 0.7s）。

### Timeline（年谱）
年份用 Bodoni 意大利体 24px（oldstyle 数字），标题 400。荆棘线随滚动生长，尽头开出红色彼岸花。“下一站”的条目文字变红。

### Tally（正字计数）
每个类别一行，右侧是红色斜线与墨线组成的正字计数。

### Reading Page
38em 正文，链接下划线为红，引用只有一条 1px 墨色左线，图片和表格只用发丝线。目录是一条 1px 墨线，当前节在线上点红点；顶部 2px 红色进度线随滚动 scaleX。代码块背景 `{colors.code-bg}`，发丝边框，2px 圆角。

### Chips（标签）
列表页的系列和标签是文字加一条发丝下划线，没有边框、没有圆角；悬停或当前页下划线转红。

### Search
无框输入，只有一条 1.5px 墨线做底，聚焦时这条线转红；输入文字用 300 字重；命中词标红，不加背景。

## Do's and Don'ts

### Do:
- **Do** 把红当作唯一的颜色：裂纹、红笔划线、彼岸花、正字斜线、太阳、阅读进度线、滚动刻度、目录红点都用 `{colors.red}`，且只在“笔迹”里出现。
- **Do** 展示字用 200 字重，阅读正文用 400 字重。
- **Do** 所有图形用钢笔路径画：`pathLength=1`，用 `--dl` 排落笔顺序，先浅灰草稿线，再落墨，画完才沸腾。
- **Do** 用 1px 发丝线（`{colors.faint}`）分行，用 1.5px 墨线起列表。
- **Do** 暗色做成同一张纸的翻面：纸近黑、线变白、红提亮到 `{colors.red-dark}`。
- **Do** 保持减少动态偏好下线条直接显示、不沸腾、不划线动画。
- **Do** 日期与计数用 Bodoni 意大利体加 oldstyle 数字，批注与导航用楷体。

### Don't:
- **Don't** 增加第二种颜色，也不要用红的大面积填充。
- **Don't** 使用卡片、阴影、圆角盒子或描边容器去分块。
- **Don't** 给大标题加粗，或用 400 以上字重做展示字。
- **Don't** 在首页再加第二个大面积动画；眼睛是唯一的大动画时刻。
- **Don't** 用位图、图标字体或字形图标代替钢笔路径。
- **Don't** 用 CSS 边框去模仿手绘框；粗糙边由 home.ts 生成。

## 未入规的构建现状

（此前标签 chips 曾带 99px 圆角，与“无圆角盒子”的规则冲突，已改成文字加下划线，不再有偏差。）
