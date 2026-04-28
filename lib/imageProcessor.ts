export function rgbToOklab(r: number, g: number, b: number) {
  let r_ = r / 255;
  let g_ = g / 255;
  let b_ = b / 255;

  r_ = r_ > 0.04045 ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92;
  g_ = g_ > 0.04045 ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92;
  b_ = b_ > 0.04045 ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92;

  let l = 0.4122214708 * r_ + 0.5363325363 * g_ + 0.0514459929 * b_;
  let m = 0.2119034982 * r_ + 0.6806995451 * g_ + 0.1073969566 * b_;
  let s = 0.0883024619 * r_ + 0.2817188376 * g_ + 0.6299787005 * b_;

  l = Math.cbrt(l);
  m = Math.cbrt(m);
  s = Math.cbrt(s);

  return {
    l: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  };
}

export function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const lab1 = rgbToOklab(r1, g1, b1);
  const lab2 = rgbToOklab(r2, g2, b2);
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

// Simple K-Means clustering for RGB values
export function kMeans(pixels: {r: number, g: number, b: number}[], k: number, maxIterations = 10) {
  if (pixels.length === 0) return { centroids: [] as {r: number, g: number, b: number}[], clusters: [] as number[] };
  if (k > pixels.length) k = pixels.length;

  // Initialize centroids with KMeans++
  let centroids: {r: number, g: number, b: number}[] = [];
  
  // Pick first centroid randomly
  let firstIdx = Math.floor(Math.random() * pixels.length);
  centroids.push({ ...pixels[firstIdx] });
  
  // Distances to closest centroid
  let distances = new Float32Array(pixels.length).fill(Infinity);
  
  for (let c = 1; c < k; c++) {
    let sumDistSq = 0;
    
    // Update distances to closest centroid
    for (let i = 0; i < pixels.length; i++) {
        const dist = colorDistance(
            pixels[i].r, pixels[i].g, pixels[i].b, 
            centroids[c-1].r, centroids[c-1].g, centroids[c-1].b
        );
        // Square the distance to favor further points more strongly
        const distSq = dist * dist;
        if (distSq < distances[i]) {
            distances[i] = distSq;
        }
        sumDistSq += distances[i];
    }
    
    // Pick next centroid proportionally to distance squared
    let r = Math.random() * sumDistSq;
    let selectedIdx = pixels.length - 1;
    for (let i = 0; i < pixels.length; i++) {
        r -= distances[i];
        if (r <= 0) {
            selectedIdx = i;
            break;
        }
    }
    centroids.push({ ...pixels[selectedIdx] });
  }

  let clusters: number[] = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Assignment
    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity;
      let closestCentroid = 0;
      for (let j = 0; j < k; j++) {
        const dist = colorDistance(pixels[i].r, pixels[i].g, pixels[i].b, centroids[j].r, centroids[j].g, centroids[j].b);
        if (dist < minDist) {
          minDist = dist;
          closestCentroid = j;
        }
      }
      if (clusters[i] !== closestCentroid) {
        clusters[i] = closestCentroid;
        changed = true;
      }
    }

    if (!changed) break;

    // Update
    const newCentroids = Array(k).fill(0).map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    for (let i = 0; i < pixels.length; i++) {
      const c = clusters[i];
      newCentroids[c].r += pixels[i].r;
      newCentroids[c].g += pixels[i].g;
      newCentroids[c].b += pixels[i].b;
      newCentroids[c].count++;
    }

    for (let j = 0; j < k; j++) {
      if (newCentroids[j].count > 0) {
        centroids[j].r = newCentroids[j].r / newCentroids[j].count;
        centroids[j].g = newCentroids[j].g / newCentroids[j].count;
        centroids[j].b = newCentroids[j].b / newCentroids[j].count;
      }
    }
  }


  return { centroids, clusters };
}

import { getAllRecipes, RecipeMatch } from './colors';

export function processImageToLevelData(imageElement: HTMLImageElement | HTMLCanvasElement, size: number, maxColors: number = 20) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  // Disable image smoothing to prevent new color creation from interpolation
  ctx.imageSmoothingEnabled = false;
  
  // Draw scaled down
  ctx.drawImage(imageElement, 0, 0, size, size);
  
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 128) {
      // transparent becomes white or background... let's just make it white for now
      pixels.push({ r: 255, g: 255, b: 255 });
    } else {
      pixels.push({ r: data[i], g: data[i+1], b: data[i+2] });
    }
  }
  
  // Find top k colors using k-means
  const { centroids, clusters } = kMeans(pixels, maxColors);
  
  // Get all unique colors
  const recipes = getAllRecipes();
  
  // Map centroids to nearest recipes
  const centroidToRecipe = centroids.map(centroid => {
    // Force near-white pixels to pure white recipe to avoid blue/pink tint
    if (centroid.r > 240 && centroid.g > 240 && centroid.b > 240) {
      const whiteRecipe = recipes.find(r => r.ingredients === 'W');
      if (whiteRecipe) return whiteRecipe;
    }

    let closestDict = recipes[0];
    let minDist = Infinity;
    for (const r of recipes) {
      let d = colorDistance(centroid.r, centroid.g, centroid.b, r.r, r.g, r.b);
      
      if (d < minDist) {
        minDist = d;
        closestDict = r;
      }
    }
    return closestDict;
  });
  
  // Reconstruct level target
  const target: string[] = [];
  for (let i = 0; i < pixels.length; i++) {
     const clusterIndex = clusters[i] || 0;
     const recipe = centroidToRecipe[clusterIndex];
     
     // Optionally simplify white to empty string to represent blank canvas, if white is default.
     if (recipe.ingredients === 'W' && data[i*4 + 3] < 128) {
       target.push(""); // transparent
     } else {
       target.push(recipe.ingredients);
     }
  }
  
  return target;
}

