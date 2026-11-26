# PixelMint — Vercel edition

Professional V3 interface, Python FastAPI + Pillow, batch queue of up to 10 images, custom resize, social presets, output format, and individual/ZIP downloads.

## Deploy to Vercel via GitHub
1. Extract this ZIP. Create a GitHub repository and upload the **contents** of the `pixelmint-vercel` folder at its root (including `vercel.json`, `app.py`, `image_core.py`, `requirements.txt` and `public/`).
2. Sign in at https://vercel.com/new, import the repository, and select the root containing `vercel.json`.
3. Framework preset: FastAPI. Leave build, install and output overrides at defaults. No environment variables required.
4. Deploy. Open the assigned URL and test a small JPG/PNG, a batch of ten, and the ZIP download.

Alternatively, with Node.js installed, open a terminal in the extracted project folder and run `npx vercel@latest login`, followed by `npx vercel@latest --prod`. Follow the prompts to create or link a project.

## Local development
Run `python -m pip install -r requirements.txt`, then `python app.py`. Open http://127.0.0.1:8765. On Windows, `start.bat` also installs dependencies and starts the local server; open the URL again if the browser opens before startup completes.

## Limits and privacy
The app sends one image per API request (4,000,000 bytes max, both input and output). Ten images can be queued together, totaling up to 40,000,000 bytes of input. ZIP creation is in the browser; no combined ZIP goes through Vercel. If an output is over 4 MB, reduce dimensions or quality, or choose JPEG/WEBP. PNG quality is not adjusted by the slider. Animated images are unsupported; max 8192 pixels per side and 32 megapixels. Files are processed in server memory and the application does not persist images. Unlike the local-only edition, the deployed website uploads images to Vercel for processing. Public deployment has no application-level authentication/rate limiting; use deployment protection or configure appropriate access and rate limits before exposing it broadly. Vercel Hobby is for personal, non-commercial use; choose an appropriate plan for commercial usage.

Metadata removal is intended for privacy and normal image editing. Common fields are verified after re-encoding. It cannot guarantee removal of all provenance signals or prevent social media AI labels; follow disclosure rules.

## Verification
`python -m pip install -r requirements-dev.txt` then `python -m unittest -v`. Nine tests cover the existing processing core, the API, static routes, input and output size limits, and ten sequential images. JS syntax and ten-entry ZIP CRC verified locally. Live Vercel deployment and browser E2E still require testing.
