document.querySelectorAll<HTMLElement>('[data-mail-user][data-mail-host]').forEach((el) => {
  const addr = `${el.dataset.mailUser}@${el.dataset.mailHost}`;
  const a = document.createElement('a');
  a.href = `mailto:${addr}`;
  a.textContent = addr;
  el.replaceChildren(a);
});

export {};
