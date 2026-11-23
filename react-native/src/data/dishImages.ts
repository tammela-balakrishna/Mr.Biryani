const base = 'https://images.unsplash.com';

export const DISH_IMAGES: Record<string, string> = {
  hero: `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1200&q=80`,
  dum: `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80`,
  fry: `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80`,
  special: `${base}/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80`,
  mutton: `${base}/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=600&q=80`,
  starter: `${base}/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80`,
  paneer: `${base}/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80`,
  wings: `${base}/photo-1527477378408-1bc09c233134?auto=format&fit=crop&w=600&q=80`,
  fish: `${base}/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80`,
  prawns: `${base}/photo-1559742811-822873691df8?auto=format&fit=crop&w=600&q=80`,
  family: `${base}/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=85`,
  egg: `${base}/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80`,
};

export function getDishImage(dishName: string, categoryName: string = ''): string {
  const n = dishName.toLowerCase();
  const c = categoryName.toLowerCase();

  if (n.includes('mutton')) return DISH_IMAGES.mutton;
  if (n.includes('prawn')) return DISH_IMAGES.prawns;
  if (n.includes('fish')) return DISH_IMAGES.fish;
  if (n.includes('paneer') || n.includes('veg')) return DISH_IMAGES.paneer;
  if (n.includes('egg')) return DISH_IMAGES.egg;
  if (n.includes('wings') || n.includes('lollipop')) return DISH_IMAGES.wings;
  if (n.includes('family')) return DISH_IMAGES.family;
  if (n.includes('fry') || n.includes('chilly') || c.includes('starter')) return DISH_IMAGES.starter;
  if (n.includes('special')) return DISH_IMAGES.special;
  if (n.includes('dum')) return DISH_IMAGES.dum;
  return DISH_IMAGES.fry;
}
