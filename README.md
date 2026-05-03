# AI Pixel Art Recreation

An interactive web application built with [Next.js](https://nextjs.org/) that challenges users to recreate famous paintings using a constrained pixel grid and color mixing system.

## Concept
The game takes a source image and restricts it to a specific grid size (e.g., 64x64) and a limited color palette. Users must strategically mix primary colors to recreate the target image, testing both their artistic eye and their understanding of color theory.

## Project Structure and Architecture
The project is a standard Next.js 15+ application using the App Router.

- **/app**: Contains the main page layout and client-side UI components handling user interaction.
- **/components**: Shared reusable UI components (shadcn/ui based).
- **/lib**: The core engine of the application.
  - `colors.ts`: Defines primary colors, valid mix recipes, and hex color mapping.
  - `imageProcessor.ts`: Handles the conversion of source images to the target grid representation by calculating color distances.
  - `levels.ts`: JSON-like storage for level data, including target artwork patterns.
- **/hooks**: Custom React hooks for state management and UI logic.

### Key Implementation Decisions
- **Color Mixing**: Color combinations are determined by a recipe system defined in `lib/colors.ts`. Colors are mapped deterministically—providing a specific set of ingredients returns a corresponding hex code.
- **Image Processing**: We use the native Canvas API to downsample source images into a target grid size and match pixels against our predefined `MIX_RECIPES` based on color distance calculations.
- **Performance**: Game logic is contained within client-side components to ensure responsive, real-time feedback during the mixing process (enabled by `'use client'`).

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building and Deployment

By default `next.config.ts` is configured with `output: 'standalone'`, which produces a Node.js server bundle under `.next/standalone` (intended for a Node host). For GitHub Pages we instead produce a fully static export and publish it to an orphan branch named `live`.

The site is served at `https://b2renger.github.io/Chromatika/`, so the static assets must be prefixed with `/Chromatika`. GitHub Pages also runs Jekyll by default, which strips any directory whose name starts with an underscore — and Next.js outputs all assets under `_next/`. Both quirks are handled by the procedure below.

### Manual deploy: build and push to the `live` branch

Run these steps from the project root. They edit `next.config.ts` temporarily, build, push the artifacts to the orphan `live` branch, then restore the config.

1. **Edit `next.config.ts`** — replace the `images` and `output` lines so the export uses the right asset paths:
   ```ts
   images: {
     unoptimized: true,
     remotePatterns: [/* unchanged */],
   },
   output: 'export',
   basePath: '/Chromatika',
   assetPrefix: '/Chromatika/',
   ```

2. **Build the static site**:
   ```bash
   rm -rf out
   npm run build
   ```
   The static site lands in `out/`. Verify the asset paths look right:
   ```bash
   grep -o 'href="[^"]*"' out/index.html | head
   # expect: href="/Chromatika/_next/static/..."
   ```

3. **Restore `next.config.ts`** so `main` keeps its original config:
   ```bash
   git checkout -- next.config.ts
   ```

4. **Stage the build in an orphan worktree** and add the `.nojekyll` flag:
   ```bash
   git worktree add --detach ../Chromatika-live-tmp
   cd ../Chromatika-live-tmp
   git checkout --orphan live
   git rm -rf .
   cp -r ../Chromatika/out/. .
   touch .nojekyll
   ```

5. **Commit and force-push** (force-push replaces the previous build — this is the standard pattern for a single-artifact deploy branch):
   ```bash
   git add -A
   git commit -m "Build: static export from main@$(cd ../Chromatika && git rev-parse --short HEAD)"
   git push --force-with-lease origin live
   ```

6. **Clean up** the temporary worktree and local `live` branch:
   ```bash
   cd ../Chromatika
   git worktree remove ../Chromatika-live-tmp
   git branch -D live
   ```

### One-time GitHub Pages setup

In the repo's GitHub settings → **Pages**: set **Source** to *Deploy from a branch*, **Branch** to `live`, **Folder** to `/ (root)`. After the first push, propagation usually takes 30–60 seconds. Hard-reload (Ctrl+Shift+R) to bypass the browser/CDN cache.

### Troubleshooting

- **404s on `/_next/static/...` assets** → either `basePath` is missing/wrong, or `.nojekyll` is missing on the `live` branch.
- **Renaming the repo** → update `basePath` and `assetPrefix` in step 1 to match the new repo name.
- **Custom domain** (e.g. via `CNAME`) → drop `basePath` and `assetPrefix` entirely; also commit a `CNAME` file into the `live` branch in step 4.
