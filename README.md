# AXION Campana Loading Conditions

A bilingual operational information dashboard for Campana refinery ship-loading planning. It combines the Instituto Nacional del Agua (INA) Campana river forecast with Open-Meteo weather and wind forecasts. It is not a loading authorization.

## Run locally

```bash
npm install
npm run worker:dev
```

Open `http://localhost:8787`. `worker:dev` builds the React client and serves it through the Cloudflare Worker, which is required for the `/api/dashboard` data layer.

## Docker

```bash
docker compose up --build
```

The container serves the production build at `http://localhost:8787`, proxies `/api/dashboard` to the deployed Cloudflare Worker, and exposes `GET /health`. Override `API_ORIGIN` when pointing a container at another Worker environment.

## Quality checks

```bash
npm run build
npm test
```

## Deploy to Cloudflare

```bash
npx wrangler login
npm run deploy
```

The Worker deploys the API and the built `dist/` client as a single public application. No API key is required for the public INA and Open-Meteo sources. Optionally set `INA_URL` as a Worker secret/variable to override the standard Campana source.

### Continuous deployment

Every push to `main` runs the GitHub Actions build and test gate. To enable automatic production deployment after that gate passes, add a repository secret named `CLOUDFLARE_API_TOKEN` with a least-privilege Cloudflare API token that can edit Workers for this account, then set the repository variable `CLOUDFLARE_DEPLOY_ENABLED` to `true`. The repository account ID variable is already configured.

## Data behavior

- INA's source is an experimental four-day river-level forecast. The dashboard does not infer a fifth river day.
- Open-Meteo supplies current weather and a five-day forecast for Campana.
- The Worker uses a ten-minute cache policy and reports a source state clearly. It retains the last verified INA/Open-Meteo payload at the edge for one hour; a source outage therefore shows the retained data as stale rather than silently inventing values. While an open dashboard tab is visible, it refreshes at the same ten-minute cadence and refreshes again when the user returns to it.
- The **Operational interval** lens is shared across river, weather, wind, and the river summary: 1 h, 4 h, 8 h, 12 h, or Daily. Four hours is the default and the chosen interval persists on that device. Hourly displays the next 24 hours; larger intervals expand the horizon through the available source forecasts.
- PDF is generated in the browser from the currently shown data, language, and selected operational interval.

## Architecture

`Browser → Cloudflare Worker /api/dashboard → INA + Open-Meteo`.

The Worker normalizes upstream shapes and serves the Vite-built React assets. The browser creates the downloadable PDF locally, so forecast data is not sent to another reporting service.

## Solution document

The two-slide stakeholder solution document is available in [Figma Slides](https://www.figma.com/slides/f2sr8NVDwLaCTl1QJwzZnC).
