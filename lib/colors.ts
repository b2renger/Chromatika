export interface BaseColor {
  id: string;
  hex: string;
  name: string;
}

export const BASE_COLORS: Record<string, BaseColor> = {
  R: { id: 'R', hex: '#EF4444', name: 'Rouge' },
  B: { id: 'B', hex: '#3B82F6', name: 'Bleu' },
  Y: { id: 'Y', hex: '#EAB308', name: 'Jaune' },
  W: { id: 'W', hex: '#FFFFFF', name: 'Blanc' },
  K: { id: 'K', hex: '#09090B', name: 'Noir' },
};

// We transition from hand-coded colors to a fully procedural pigment 
// physical model, but keep this exported for any legacy usages or forced overrides.
export const MIX_RECIPES: Record<string, string> = {};

export const MUD_COLOR = '#5C4033'; // Boue pour les mÃ©langes invalides

export function getIngredientsKey(ingredients: string[]): string {
  if (!ingredients || ingredients.length === 0) return '';
  const filtered = ingredients.filter(Boolean);
  if (filtered.length === 0) return '';
  // Utilise sort() pour conserver la fréquence des couleurs
  return filtered.sort().join(',');
}

export function getHexColor(ingredients: string[] | string): string {
  const ingredientsStr = typeof ingredients === 'string' ? ingredients : getIngredientsKey(ingredients);
  if (MIX_RECIPES[ingredientsStr]) return MIX_RECIPES[ingredientsStr];

  const arr = typeof ingredients === 'string' ? ingredients.split(',').filter(Boolean) : ingredients;
  if (arr.length === 0) return 'transparent';
  if (arr.length === 1) return BASE_COLORS[arr[0]]?.hex || 'transparent';
  
  let rProd = 1, gProd = 1, bProd = 1;
  let rSum = 0, gSum = 0, bSum = 0;
  let count = 0;
  
  for (const d of arr) {
    const color = BASE_COLORS[d];
    if (!color) continue;
    const hex = color.hex;
    const cr = parseInt(hex.slice(1,3), 16) || 0;
    const cg = parseInt(hex.slice(3,5), 16) || 0;
    const cb = parseInt(hex.slice(5,7), 16) || 0;
    
    rProd *= Math.max(1, cr);
    gProd *= Math.max(1, cg);
    bProd *= Math.max(1, cb);
    
    rSum += cr;
    gSum += cg;
    bSum += cb;
    count++;
  }
  
  if (count === 0) return 'transparent';
  
  // Geometric mean acts as Subtractive mixing (paint absorption)
  const rGeo = Math.pow(rProd, 1/count);
  const gGeo = Math.pow(gProd, 1/count);
  const bGeo = Math.pow(bProd, 1/count);
  
  // Arithmetic mean acts as Additive mixing (light reflection)
  const rAri = rSum / count;
  const gAri = gSum / count;
  const bAri = bSum / count;
  
  // Averaging them achieves an incredibly accurate perceptual model 
  // for physical pigment mixing without needing spectral curve conversions.
  const r = Math.min(255, Math.round(rGeo * 0.5 + rAri * 0.5));
  const g = Math.min(255, Math.round(gGeo * 0.5 + gAri * 0.5));
  const b = Math.min(255, Math.round(bGeo * 0.5 + bAri * 0.5));
  
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

export interface RecipeMatch {
  ingredients: string;
  hex: string;
  r: number;
  g: number;
  b: number;
}

let RECIPES_CACHE: RecipeMatch[] | null = null;

export function getAllRecipes(): RecipeMatch[] {
  if (RECIPES_CACHE) return RECIPES_CACHE;
  
  const keys = ['R', 'B', 'Y', 'W', 'K'];
  const results: RecipeMatch[] = [];
  const seen = new Set<string>();
  
  function mix(currentIngredients: string[]) {
    if (currentIngredients.length > 0) {
      const ingredientsStr = [...currentIngredients].sort().join(',');
      if (!seen.has(ingredientsStr)) {
        seen.add(ingredientsStr);
        const hex = getHexColor(currentIngredients);
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        results.push({ ingredients: ingredientsStr, hex, r, g, b });
      }
    }
    // Max 5 drops for custom level palette generation so we don't blow up combinations
    if (currentIngredients.length < 5) {
      for (const k of keys) {
        if (currentIngredients.length === 0 || k >= currentIngredients[currentIngredients.length - 1]) {
          mix([...currentIngredients, k]);
        }
      }
    }
  }
  
  mix([]);
  RECIPES_CACHE = results;
  return results;
}
