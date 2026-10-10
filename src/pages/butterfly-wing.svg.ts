import { butterflyWing } from '../art/hero';

export const GET = () => new Response(butterflyWing(), { headers: { 'Content-Type': 'image/svg+xml' } });
