# b1ngsha

b1ngsha（aka Cheyne）的个人主页：经历，和写过的笔记。线稿风格，Astro 构建的纯静态站点，部署在 GitHub Pages，网址 <https://b1ngsha.site>。

术语见 [GLOSSARY.md](./GLOSSARY.md)，产品背景见 [PRODUCT.md](./PRODUCT.md)，重要的技术决定见 [docs/adr/](./docs/adr)。

## 日常维护

### 写一篇新文章

```bash
npm run new -- rust-lifetimes "Rust：生命周期" --series rust --tags linux
```

- 第一个参数是网址里的名字（`/posts/rust-lifetimes/`），只能用小写英文、数字、连字符。
- `--series` 可选。系列必须先在 `src/content/series.yml` 里登记；序号（`part`）会自动接在最后一篇后面。
- `--tags` 可选，逗号分隔，小写英文。
- 生成的文件在 `src/content/posts/<系列>/`，里面有 `draft: true`：草稿不会发布。写完删掉这一行。
- 摘要：写在正文开头，到 `<!-- more -->` 为止的文字会出现在文章列表、订阅和分享里。
- 图片：放在文章同名的文件夹里（`src/content/posts/rust/rust-lifetimes/a.png`），在文章里用相对路径引用。老文章的图片仍是阿里云 OSS 外链，不用动。
- 首页想把某篇置顶：头信息里加 `featured: true`。

写完提交并推送到 `master`，GitHub Actions 会检查、构建、上线，大约一两分钟。

### 更新近况

```bash
npm run new -- now
```

会生成 `src/content/now/<今天>.md`。首页显示最新的一条，旧的在 `/now/` 里。头信息里：`quote` 是首页的大字（可以空），`mark` 是引文里要用红笔划线的那几个字，`plans` 是接下来想做的事。

### 更新年谱

直接编辑 `src/content/timeline.yml`，加一条 `when / title / text`。`order` 决定先后（小的在前），已经留了空档。

### 改站名、联系方式、评论

都在 `src/data/site.ts`。邮箱不会直接写进页面，由脚本拼出来。

## 本地开发

```bash
npm install
npm run dev        # 本地预览：http://localhost:4321
npm run check      # 类型检查 + 文章头信息校验
npm run build      # 构建，并生成搜索索引
npm run preview    # 预览构建结果（搜索只在这里能用）
npm run verify     # check + build + 死链检查，等同于 CI
```

需要 Node 22 或更高（见 `.nvmrc`）。

## 目录

```
src/content/posts/   文章（按系列分文件夹，文件夹只是整理用，系列以头信息为准）
src/content/now/     近况，一天一个文件
src/content/series.yml, timeline.yml
src/data/site.ts     站点级的固定信息
src/data/redirects.json  老 Hexo 网址 → 新网址（构建时生成跳转页）
src/art/             线稿：蛋挞、富士山、彼岸花、「正」字计数……
src/scripts/         首屏的眼睛、年谱的荆棘线、明暗切换、搜索
src/styles/          tokens（配色、字体）、base、home、post
config/              代码着色主题、图片懒加载插件
scripts/             new.mjs（新建文章）、verify-dist.mjs（构建后检查）
docs/                决策记录、DNS 说明、迁移记录
```

## 上线与域名

见 [docs/dns.md](./docs/dns.md)。
