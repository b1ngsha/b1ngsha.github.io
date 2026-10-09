/** 邮箱不直接写在 HTML 里：页面加载后，脚本把它拼成 mailto 链接。链接上只显示 “Email”。 */
document.querySelectorAll<HTMLElement>('[data-mail-user][data-mail-host]').forEach((el) => {
  const a = document.createElement('a');
  a.href = `mailto:${el.dataset.mailUser}@${el.dataset.mailHost}`;
  a.setAttribute('aria-label', 'Email');
  a.append(...Array.from(el.childNodes));
  el.replaceChildren(a);
});

export {};
