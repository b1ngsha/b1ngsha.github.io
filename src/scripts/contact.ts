/** 邮箱不直接写在 HTML 里：由脚本拼成可点击的链接，没有脚本时显示“user [at] host”。 */
document.querySelectorAll<HTMLElement>('[data-mail-user][data-mail-host]').forEach((el) => {
  const addr = `${el.dataset.mailUser}@${el.dataset.mailHost}`;
  const a = document.createElement('a');
  a.href = `mailto:${addr}`;
  a.textContent = addr;
  el.replaceChildren(a);
});

export {};
