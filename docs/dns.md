# 域名和 HTTPS：b1ngsha.site

站点由 GitHub Pages 托管。域名在火山引擎注册、解析。

## 一、GitHub 这边（只做一次）

1. 仓库 **Settings → Pages**：Source 选 **GitHub Actions**。
2. 同一页的 **Custom domain** 填 `b1ngsha.site`，保存。（仓库里的 `public/CNAME` 已经写了同样的值，只是双保险。）
3. DNS 生效后，勾上 **Enforce HTTPS**。证书由 GitHub 自动签发，通常几分钟，最长一天。

## 二、火山引擎的 DNS 记录

在 `b1ngsha.site` 的解析设置里添加：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `www` | CNAME | `b1ngsha.github.io` |

> 这四个 IP 是 GitHub Pages 的官方地址，以 <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site> 上的最新为准。
> `www` 会被 GitHub 自动跳转到根域名。

检查是否生效：

```bash
dig b1ngsha.site +short          # 应该看到上面四个 IP
dig www.b1ngsha.site +short      # 应该看到 b1ngsha.github.io
curl -I https://b1ngsha.site     # 200
```

## 三、切换之后

- 旧网址 `https://b1ngsha.github.io/...` 会被 GitHub 自动 301 到新域名的同一路径；
  老文章路径 `/2025/02/01/Kubernetes/1/` 在新站里有跳转页，会再跳到 `/posts/<slug>/`。
- 订阅地址 `https://b1ngsha.site/atom.xml`，旧地址会被转过来，已订阅的人不用重新订阅。

## 四、国内访问

GitHub Pages 在国内有时慢，甚至偶尔打不开。上线后从国内网络实测几次：

- 能接受：继续用。
- 不行：改用 Cloudflare Pages（免费，构建命令 `npm run build`，输出目录 `dist`，Node 版本 22），DNS 里把记录改到 Cloudflare 给的地址即可。站点本身是纯静态文件，换托管只是换一份部署配置。
- 不考虑自建国内 CDN，因为需要 ICP 备案。
