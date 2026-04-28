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

To build the application for production:
```bash
npm run build
```

The application produces a production-ready static-compatible build in the `dist/` directory.

### Deploying to GitHub Pages
Since this project produces a static-compatible build, you can deploy it to GitHub Pages:
1. Ensure your `next.config.ts` is configured for static export if required by your hosting environment.
2. Build the app using `npm run build`.
3. Use a tool like `gh-pages` or configure GitHub Actions to deploy the contents of the built output folder to your repository's `gh-pages` branch.
