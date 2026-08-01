# Hermiona — Premium Photo Editor

A fast, fully frontend photo editor inspired by Lightroom and iOS Photos.  
Runs as a **single-page** app and hosts cleanly on **GitHub Pages**.

## Features

- **Light**: Exposure, Contrast, Highlights, Shadows, Whites, Blacks
- **Color**: Temperature, Tint, Saturation, Vibrance
- **Effects**: Clarity, Sharpen, Vignette, Grain
- **Presets**: ready looks (Portra, Cinestill, HP5, Lomo, Holga…) = film + camera + lens + grade
- **Age**: analog imperfections — soft corners, light leak, dust, scratches, film gate, barrel, CA, ghost, stains, Polaroid border, date stamp, halation
- **Crop**: 90° rotate, flip, straighten
- Before / After compare (hold photo or Space)
- Drag & drop + tap to upload
- Fully responsive and **mobile-friendly**
- Dark premium UI
- No backend, no build step, no dependencies

## Host on GitHub Pages

1. Create a GitHub repository (e.g. `hermiona-editor` or `photo-editor`)
2. Upload this folder (`index.html`, `styles.css`, `app.js`, `README.md`, `js/`, …)
3. Go to **Settings → Pages**
4. Under **Source** pick branch `main` (or `master`) and folder `/ (root)`
5. Save. After 30–60 seconds it will be live at:
   `https://your-username.github.io/repo-name/`

### Quick CLI path

```bash
git init
git add .
git commit -m "Initial commit — Hermiona photo editor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

Then enable Pages in GitHub.

## Local preview

Open `index.html` in a browser or use any static server:

```bash
npx serve .
# or
python -m http.server 8000
```

## Notes

- For smoother mobile performance, large photos are downscaled for live editing (working long edge ~1400px).
- Download re-runs the full pipeline at the chosen export size/quality.
- Works offline after the first load (portrait AI only downloads when DoF / Analyze is used).

---

Built with care. Enjoy editing. ✦
