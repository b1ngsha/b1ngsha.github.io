import { f1, pen, seeded } from './draw';

export function tallySketch(count: number, seed: number): string {
  const groups = Math.ceil(count / 5);
  const w = Math.max(60, groups * 38);
  const tr = seeded(count * 7 + seed);
  const o: string[] = [];
  for (let g = 0; g < groups; g++) {
    const n5 = Math.min(5, count - g * 5);
    const x0 = g * 38 + 4;
    for (let b = 0; b < Math.min(4, n5); b++)
      o.push(pen(`M${f1(x0 + b * 6 + (tr() - 0.5))} ${f1(3 + tr() * 2)} L${f1(x0 + b * 6 + (tr() - 0.5) * 1.5)} ${f1(22 + tr() * 2)}`, '', seed * 0.1 + g * 0.25 + b * 0.05, 0.4));
    if (n5 === 5) o.push(pen(`M${f1(x0 - 4)} ${f1(18 + tr() * 2)} L${f1(x0 + 27)} ${f1(7 + tr() * 2)}`, 'r', seed * 0.1 + g * 0.25 + 0.3, 0.5));
  }
  return `<svg viewBox="0 0 ${w} 26" preserveAspectRatio="xMinYMid meet" aria-hidden="true">${o.join('')}</svg>`;
}


export function scribble(width: number, seed: number): string {
  const sr = seeded(seed + 3);
  let x = 2;
  let d = 'M2 7';
  while (x < width - 6) {
    x += 8 + sr() * 10;
    d += ` L${f1(x)} ${f1(3 + sr() * 8)}`;
  }
  return `<svg class="scr" viewBox="0 0 ${width} 12" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" pathLength="1"/></svg>`;
}
