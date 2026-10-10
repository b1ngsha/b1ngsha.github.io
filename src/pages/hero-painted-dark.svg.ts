import { heroArt } from '../art/hero';

/** 首屏花丛上色后的样子，构建时生成一张静态 SVG：滤镜只在加载时算一次。 */
export const GET = () => new Response(heroArt().painted('dark'), { headers: { 'Content-Type': 'image/svg+xml' } });
