# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

来看这个人的访客，包括招聘方和朋友。他们打开站点，是要看到经历、文章和近况。作者自己不是主读者。

## Product Purpose

个人主页。把名字、经历、近况和文章放在同一处，让访客一次看完这个人是谁、做过什么、最近怎样，以及写过什么。成功是访客能把这四件事连起来，而不是把站点当成技术文档库来检索。

## Positioning

这是一个人的主页，不是笔记博客。邻近的做法（一份只列技能的简历，或一个按分类归档的学习笔记站）都不能同时给出名字、经历、近况和文章。机制是这四件事共用一个首页。

## Operating Context

作者在仓库里用 Markdown 写文章，生成静态站点后公开访问。读者从公开网址进入，没有登录，也没有要完成的操作流程。正文是中文。现有文章大多是学习笔记；`source/_posts/YearSummary/2025.md` 是一篇个人年度总结，写了工作、生活和旅行。

今天的发布方式：Hexo 7 生成静态页，`master` 上的 GitHub Actions 部署到 GitHub Pages，网址是 https://b1ngsha.github.io 。这是现状，不是之后必须守住的做法。

## Capabilities and Constraints

已定下来的（见 `docs/adr/` 和 `GLOSSARY.md`）：

- 站点名叫 “b1ngsha”（别名 Cheyne，只在首屏那句话里出现一次）。
- 用 Astro 构建纯静态站点，文章仍是仓库里的 Markdown；构建命令 `npm run build`，本地预览 `npm run dev`。
- 部署在 GitHub Pages，域名 `b1ngsha.site`（DNS 在火山引擎）。国内访问不理想时再换 Cloudflare Pages。
- 现有 74 篇文章全部保留，分成「系列」和「标签」；网址改成 `/posts/<slug>/`，老网址生成跳转页，订阅地址仍是 `/atom.xml`。
- 评论用 Giscus，只在文章页；老文章的 Gitalk 评论不迁移。
- 站内搜索用 Pagefind（纯静态）；支持明暗两种主题。
- 联系方式：GitHub、X（@B1ngsha）、Telegram（@b1ngsha）、邮箱，放在首页尾声和页脚。

仍未决定，不要写成承诺：

- 是否长期留在 GitHub Pages（见 `docs/dns.md` 的国内访问一节）。
- 老文章里的外链图片是否迁回仓库。

## Evidence on Hand

- `source/_posts/`：Rust、C++、Kubernetes、Go、设计模式、Missing Semester、安全、RabbitMQ、makefile、Python、重构等学习笔记，以及 `source/_posts/YearSummary/2025.md`。
- 没有独立的关于页。`source/_data/link.yml` 是空的。
- 没有可引用的客户、评价、数据或案例。经历、职位、联系方式只以作者已经写进文章里的文字为准，不要补写。
- 视觉探索（五个候选和最后选定的线稿方向）已存档在 git 标签 `design-previews-archive`（分支 `archive/design-previews`），不在主分支里；正式站点按其中 `lynn-round-3/f-ishida` 重做。

## Product Principles

1. 访客是来认识这个人的。经历、近况和文章要能在一次访问里接上。
2. 名字、经历、近况、文章是同一个主页上的四件事，不是四个分开的产品。
3. 只有作者自己写过的文字能当经历和近况的依据。不要编造职务、联系方式、客户或评价。
4. 今天的生成器、主题、评论和站点标题是实现现状。下一版可以换，除非作者以后把某一项定为承诺。
5. 学习笔记是素材。可以重组、取舍，不要求每篇都原样留在主页上。
