export interface Env { ASSETS: Fetcher; INA_URL?: string }
const INA_URL = 'https://alerta.ina.gob.ar/a5/sim/calibrados/489/corridas/last?group_by_qualifier=true&includeProno=true&series_id=3405'
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-34.1633&longitude=-58.9592&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation&hourly=temperature_2m,precipitation_probability,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&forecast_days=5&timezone=America%2FArgentina%2FBuenos_Aires'
const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=600, s-maxage=600', 'access-control-allow-origin': '*' }

type InaPoint = { timestart: string; valor: number }
type InaSeries = { qualifier: string; pronosticos: InaPoint[] }
const isoDay = (date: string) => date.slice(0, 10)
const isRecent = (date: string) => new Date(date).getTime() >= Date.now() - 30 * 60 * 60 * 1000

function weatherLabel(code: number) {
  if (code === 0) return 'clear'; if ([1, 2, 3].includes(code)) return 'cloudy'; if ([45, 48].includes(code)) return 'fog'; if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle'; if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain'; if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'; return 'storm'
}
function direction(degrees: number) { const words = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; return words[Math.round(degrees / 45) % 8] }
function normalizeIna(payload: { forecast_date: string; series: InaSeries[] }) {
  const main = payload.series.find(s => s.qualifier === 'main')?.pronosticos ?? []
  const low = payload.series.find(s => s.qualifier === 'error_band_01')?.pronosticos ?? []
  const high = payload.series.find(s => s.qualifier === 'error_band_99')?.pronosticos ?? []
  const now = new Date()
  const points = main.filter(p => new Date(p.timestart).getTime() >= now.getTime() - 24 * 3600_000).map((p, i) => ({ time: p.timestart, level: Number(p.valor.toFixed(2)), lower: Number((low[i]?.valor ?? p.valor).toFixed(2)), upper: Number((high[i]?.valor ?? p.valor).toFixed(2)), observed: !isRecent(p.timestart) }))
  const daily = Object.values(points.reduce<Record<string, { date: string; min: number; max: number; last: number }>>((acc, point) => { const key = isoDay(point.time); const existing = acc[key]; acc[key] = existing ? { ...existing, min: Math.min(existing.min, point.level), max: Math.max(existing.max, point.level), last: point.level } : { date: key, min: point.level, max: point.level, last: point.level }; return acc }, {})).slice(0, 4)
  return { updatedAt: payload.forecast_date, current: points.find(p => new Date(p.time) >= now)?.level ?? points.at(-1)?.level ?? null, points, daily }
}
function normalizeWeather(payload: any) {
  const d = payload.daily, current = payload.current
  return { updatedAt: current.time, current: { temperature: current.temperature_2m, humidity: current.relative_humidity_2m, windSpeed: current.wind_speed_10m, windDirection: current.wind_direction_10m, windCardinal: direction(current.wind_direction_10m), precipitation: current.precipitation, condition: weatherLabel(current.weather_code), code: current.weather_code }, daily: d.time.map((date: string, i: number) => ({ date, high: d.temperature_2m_max[i], low: d.temperature_2m_min[i], rainChance: d.precipitation_probability_max[i], windSpeed: d.wind_speed_10m_max[i], windDirection: d.wind_direction_10m_dominant[i], windCardinal: direction(d.wind_direction_10m_dominant[i]), condition: weatherLabel(d.weather_code[i]), code: d.weather_code[i] })), hourly: payload.hourly.time.map((time: string, i: number) => ({ time, temperature: payload.hourly.temperature_2m[i], rainChance: payload.hourly.precipitation_probability[i], windSpeed: payload.hourly.wind_speed_10m[i], windDirection: payload.hourly.wind_direction_10m[i] })).slice(0, 48) }
}
async function fetchJson(url: string) { const response = await fetch(url, { headers: { 'user-agent': 'AXION Campana Conditions/1.0' }, signal: AbortSignal.timeout(9000), cf: { cacheTtl: 600, cacheEverything: true } }); if (!response.ok) throw new Error(`Upstream ${response.status}`); return response.json() }

export default { async fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname === '/health') return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), { headers })
  if (url.pathname === '/api/dashboard') {
    const [ina, weather] = await Promise.allSettled([fetchJson(env.INA_URL || INA_URL), fetchJson(WEATHER_URL)])
    const sourceStatus = { ina: ina.status === 'fulfilled' ? 'live' : 'unavailable', weather: weather.status === 'fulfilled' ? 'live' : 'unavailable' }
    if (ina.status === 'rejected' && weather.status === 'rejected') return new Response(JSON.stringify({ error: 'Both upstream sources are unavailable', sourceStatus, generatedAt: new Date().toISOString() }), { status: 503, headers })
    return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), sourceStatus, river: ina.status === 'fulfilled' ? normalizeIna(ina.value as { forecast_date: string; series: InaSeries[] }) : null, weather: weather.status === 'fulfilled' ? normalizeWeather(weather.value) : null, notices: Object.entries(sourceStatus).filter(([, status]) => status !== 'live').map(([source]) => `${source} data is temporarily unavailable`) }), { headers })
  }
  return env.ASSETS.fetch(request)
}} satisfies ExportedHandler<Env>
