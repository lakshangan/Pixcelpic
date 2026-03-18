# PixelPic Studio Website

This folder contains a static marketing website and portfolio for a creative media studio. The site is built with plain HTML, inline CSS, and inline JavaScript, with no build step or framework.

## Project Overview

The project currently consists of two hand-authored pages:

- `index.html`: Main landing page with hero section, services, about, featured work, pricing, and footer/contact links
- `our-work.html`: Portfolio page with filtered video work, lazy-loaded YouTube embeds, and fullscreen modal playback

The visual direction is cinematic and motion-heavy. Most interactivity is implemented directly in the page scripts using DOM APIs, `IntersectionObserver`, scroll listeners, and modal/menu handlers.

## Key Features

- Floating glass-style navigation with mobile drawer
- Animated preloader and reveal effects on the homepage
- Services section with staged content blocks and imagery
- Featured work embeds using YouTube iframes
- Portfolio filtering by content category
- Fullscreen video modal on the portfolio page
- Custom cursor effects on desktop
- Responsive layouts for desktop, tablet, and mobile

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Google Fonts
- YouTube embeds for video content
- External Google Form and social media links for contact/distribution

## File Structure

```text
.
├── index.html
├── our-work.html
├── PixelPix_Studio.png
├── Film Icon.svg
├── Edit Icon (1).svg
├── Editing Software PNG/
│   ├── Thinking.png
│   ├── Script Write.png
│   ├── Shoot.png
│   ├── Edit.png
│   ├── Deliver.png
│   └── Publish.png
├── *.png
└── venv/
```

Notes:

- `venv/` is a local Python virtual environment and is not part of the website runtime.
- The folder also contains several standalone PNG assets that look like design/branding resources rather than page-entry files.

## How To Run Locally

Because this is a static site, you can preview it in either of these ways:

1. Open `index.html` directly in a browser.
2. Or serve the folder locally for cleaner asset loading:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`.

## Important Observations

- The homepage title uses `PIXCEL Studio`, while other visible branding uses `PixelPic Studio` / `PixelPix_Studio`. Branding is inconsistent and should be standardized.
- `index.html` references `bg.mp4`.
- `our-work.html` references `Comp 1.mp4`.
- No local `.mp4` files are present in this folder, so those background video features will not work unless the assets are added.
- The pages depend on external resources such as Google Fonts, YouTube embeds, and a Google Form, so full functionality requires internet access.

## Maintenance Notes

- Styling and behavior are embedded directly in each HTML file, so shared changes must be updated in both pages manually.
- If this site grows further, the next sensible cleanup would be to extract shared CSS/JS into separate files and remove unused assets from the root folder.

## Recommended Next Steps

- Standardize studio naming across titles, alt text, and visible copy
- Add the missing local video assets or replace them with hosted sources
- Move shared CSS and JavaScript into reusable files
- Add a `.gitignore` so `venv/` and temporary assets are not committed
