# PixelPic Studio – Dynamic Portfolio & Zero-Backend Admin CMS

This repository contains the marketing website, dynamic video portfolio, and a **100% serverless, zero-account, browser-native Admin CMS** for **PixelPic Studio**.

There are **zero external databases**, **zero cloud storage subscriptions**, and **zero accounts to manage**. Everything runs directly in the browser and loads statically on any hosting (Vercel, Netlify, GitHub Pages, or local).

---

## Key Features

1. **Zero External Accounts / Zero Backend Database:**
   - No Supabase, No Firebase, No AWS, No server maintenance.
   - Operates completely in the client's browser using `localStorage` and a clean static [`data/videos.json`](data/videos.json) file.

2. **Google Drive Video Driver ("Fix Drive & Play in Front"):**
   - Paste any Google Drive sharing link (`drive.google.com/file/d/FILE_ID/view?usp=sharing`).
   - The CMS automatically extracts the Google Drive file ID and fixes it into the preview embed link: `https://drive.google.com/file/d/FILE_ID/preview`.
   - Plays immediately in the front portfolio and inside the admin interactive preview!
   - Also supports YouTube (standard, Shorts, and youtu.be links).

3. **Browser-Native Image Upload & Compression:**
   - Upload custom thumbnails directly from your computer via standard file picker.
   - The browser automatically reads and compresses the image via HTML5 Canvas into a lightweight base64 Data URL, so it saves directly without any external image CDN.

4. **1-Click Download of `videos.json`:**
   - When you edit, add, delete, or reorder videos in `/admin/`, changes save immediately to your browser.
   - Click **Download videos.json** to save the updated JSON file and drop it into `data/videos.json` for permanent deployment across all visitors.

5. **Original Cinematic Website Untouched:**
   - Floating glass navigation, custom cursor, smooth scroll reveal, 16:9 and 9:16 portrait ratios, and fullscreen modal playback.
   - Instant local autoplay on mobile and desktop hero background videos remains intact.

---

## File Structure

```text
.
├── admin/
│   ├── index.html            # Standalone Browser Admin CMS
│   ├── css/
│   │   └── admin.css         # Studio CMS theme stylesheet
│   └── js/
│       └── admin.js          # CMS controller (Drive fixer, image compression, CRUD)
├── data/
│   └── videos.json           # All 21 portfolio videos in human-readable JSON
├── js/
│   ├── portfolio-store.js    # Zero-backend store, Drive parser, & image compressor
│   └── portfolio.js          # Dynamic portfolio loader for our-work.html
├── index.html                # Main landing page (hero video untouched)
├── our-work.html             # Portfolio page (dynamically connected to PortfolioStore)
├── vercel.json               # Vercel static clean URL configuration
└── README.md                 # This overview
```

---

## How to Use

### 1. Preview Locally
```bash
python3 -m http.server 8000
```
- **Live Portfolio:** `http://localhost:8000/our-work.html`
- **Admin CMS:** `http://localhost:8000/admin/` (or `http://localhost:8000/admin/login.html`)
  - **Default Password:** `pixelpic2026`
  - Passcode can be updated anytime inside **Security & Passcode** tab in the dashboard.

### 2. How to Add a Google Drive Video
1. Open the Admin CMS at `/admin/`.
2. Click **Add New Video**.
3. Select **Google Drive Link**.
4. Paste the sharing link (make sure Google Drive permission is set to *"Anyone with the link"*).
5. The CMS automatically converts it and shows a live player preview.
6. (Optional) Click **Choose file** under Thumbnail Image to upload an image from your computer.
7. Click **Save to Portfolio**. It updates `our-work.html` immediately in your browser!
8. To make the changes permanent for all public visitors on the web, click **Download videos.json** and place the file in the `data/` folder.
