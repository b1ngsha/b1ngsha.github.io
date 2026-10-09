# 评论从 Gitalk 改成 Giscus

Gitalk 要求把 GitHub OAuth 的 `clientSecret` 放在公开仓库的配置里，每篇文章还要手动初始化一个 issue。Giscus 把评论放进仓库的 Discussions，不需要 secret，也不需要初始化。

只在文章页开启评论；老文章在 Gitalk 里的评论不迁移，仍留在原来的 issue 里。
