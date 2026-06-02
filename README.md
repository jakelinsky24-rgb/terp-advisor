# TerpAdvisor — UMD Schedule Builder

A full website for UMD students to build personalized course schedules, search courses, chat with an AI advisor, and track degree progress.

## Features

- **Schedule Builder** — Input major, year, credits, GPA target, time preferences → AI generates a full semester plan with a visual weekly calendar
- **Course Search** — Live course data from umd.io with PlanetTerp GPA averages and professor history
- **AI Advisor Chat** — Claude-powered advisor with deep UMD curriculum knowledge
- **Degree Audit** — Track CORE gen-ed and major requirements, estimate graduation timeline

## Powered by

- [umd.io](https://umd.io) — Free public UMD course data API (no auth required)
- [PlanetTerp API](https://planetterp.com/api) — Free professor reviews and grade distributions (no auth required)
- [Anthropic Claude API](https://anthropic.com) — AI advisor and schedule generation (**requires API key**)

---

## Setup

### 1. Add your Anthropic API key

The app calls `https://api.anthropic.com/v1/messages` directly from the browser. For a quick local demo this works, but **in production you must proxy these calls through your own backend** to protect your key.

**Option A — Quick local test (key in browser, dev only):**

In `js/api.js`, find the `claudeChat` and `claudeJSON` functions and add an `x-api-key` header:

```js
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'sk-ant-YOUR_KEY_HERE',
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
},
```

**Option B — Backend proxy (recommended for production):**

Create a simple Express/Vercel/Netlify function that forwards requests to Anthropic:

```js
// api/claude.js (Vercel serverless)
export default async function handler(req, res) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.json(data);
}
```

Then in `js/api.js`, change the fetch URL from `https://api.anthropic.com/v1/messages` to `/api/claude`.

---

## File structure

```
terp-advisor/
├── index.html              ← Landing page
├── css/
│   └── style.css           ← All styles
├── js/
│   ├── api.js              ← umd.io, PlanetTerp, Claude helpers
│   └── nav.js              ← Navigation / hamburger menu
└── pages/
    ├── builder.html        ← Schedule builder
    ├── courses.html        ← Course search
    ├── advisor.html        ← AI advisor chat
    └── audit.html          ← Degree audit tracker
```

---

## Deployment

### Vercel (easiest)
1. Push to a GitHub repo
2. Connect to [vercel.com](https://vercel.com) → Import project
3. Set environment variable: `ANTHROPIC_API_KEY=sk-ant-...`
4. Update the fetch URL in `js/api.js` to point to your serverless function
5. Deploy

### Netlify
Same process — use Netlify Functions for the Claude proxy.

### GitHub Pages (static only)
Works for the UI, but Claude API calls need a proxy. You can host the proxy separately on Railway, Render, or any Node.js host.

---

## Local development

Since this is pure HTML/CSS/JS with no build step, just open with any static server:

```bash
# Python
python -m http.server 3000

# Node
npx serve .

# VS Code
# Use the "Live Server" extension
```

Then visit `http://localhost:3000`.

---

## Customization

- **Add more majors** — Edit the `<select id="bMajor">` dropdowns and the `MAJOR_REQS` object in `audit.html`
- **Update gen-ed codes** — Edit the `CORE_REQS` array in `audit.html`
- **Change colors** — Edit CSS variables at the top of `css/style.css`
- **Add more departments to search** — Edit the dept list in `courses.html` and `builder.html`
