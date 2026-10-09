/** 线稿用到的小工具。所有随机都用固定种子，每次构建画出来的东西一模一样。 */
export const seeded = (n: number) => {
  let s = n;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
export const f1 = (n: number) => Math.round(n * 10) / 10;
export type Pt = [number, number];
export const poly = (pts: Pt[]) => pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('');
export const bez = (a: Pt, b: Pt, c: Pt, d: Pt, n: number): Pt[] => {
  const o: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    o.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ]);
  }
  return o;
};

/** 一笔：pathLength=1，--dl 是什么时候落笔，--dur 是画多久 */
export const pen = (d: string, cls = '', dl = 0, dur?: number) =>
  `<path class="ln ${cls}" pathLength="1" d="${d}" style="--dl:${f1(dl * 100) / 100}s${dur ? `;--dur:${dur}s` : ''}"/>`;
