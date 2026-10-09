// 代码着色只用三种颜色：墨黑（正文）、灰（注释）、红（关键字）。
// 和页面的线稿保持一致：红色是页面里唯一的颜色。
const make = (name, type, c) => ({
  name,
  type,
  colors: { 'editor.foreground': c.fg, 'editor.background': c.bg },
  settings: [
    { settings: { foreground: c.fg } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: c.comment, fontStyle: 'italic' } },
    {
      scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.operator.new', 'constant.language', 'support.type.primitive', 'entity.name.tag'],
      settings: { foreground: c.keyword },
    },
    { scope: ['string', 'string.quoted', 'constant.character.escape'], settings: { foreground: c.string } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function'], settings: { foreground: c.fg, fontStyle: 'bold' } },
    { scope: ['constant.numeric', 'variable.other.constant'], settings: { foreground: c.keyword } },
  ],
});

export const lightTheme = make('ink-light', 'light', {
  fg: '#121211', bg: '#e1e0da', comment: '#5f5e58', keyword: '#a80f27', string: '#3a3935',
});
export const darkTheme = make('ink-dark', 'dark', {
  fg: '#ecebe6', bg: '#1d1d1b', comment: '#a3a29a', keyword: '#ff7385', string: '#cdccc4',
});
