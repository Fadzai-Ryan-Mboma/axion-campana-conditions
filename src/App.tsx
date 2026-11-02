import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, CloudRain, Droplets, RefreshCw, Wind, Waves, AlertTriangle, Languages } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { copy, weatherText } from './i18n'
import { downloadReport } from './report'
import type { DashboardData, Language, WeatherDay } from './types'

const weatherIcon: Record<string, string> = { clear:'☀', cloudy:'☁', fog:'≋', drizzle:'☂', rain:'☔', snow:'❄', storm:'ϟ' }
const fmt = (date: string, language: Language, style: Intl.DateTimeFormatOptions = { weekday:'short', day:'numeric', month:'short' }) => new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-GB', { ...style, timeZone:'America/Argentina/Buenos_Aires' }).format(new Date(date))
const time = (date: string, language: Language) => new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'America/Argentina/Buenos_Aires' }).format(new Date(date))

function Metric({ label, value, detail, icon }: { label:string; value:string; detail:string; icon:React.ReactNode }) { return <article className="metric"><div className="metric-top"><span>{label}</span>{icon}</div><strong>{value}</strong><small>{detail}</small></article> }
function Condition({ day, language }: { day: WeatherDay; language:Language }) { const t = copy[language]; return <div className="forecast-day"><b>{fmt(day.date, language)}</b><span className="condition-icon" aria-hidden>{weatherIcon[day.condition]}</span><strong>{Math.round(day.high)}° <em>{Math.round(day.low)}°</em></strong><small>{weatherText[day.condition][language]}</small><small><CloudRain size={13}/> {day.rainChance}%</small><small><Wind size={13}/> {Math.round(day.windSpeed)} km/h {day.windCardinal}</small></div> }

export default function App() {
  const [language, setLanguage] = useState<Language>('es'), [data, setData] = useState<DashboardData | null>(null), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('')
  const t = copy[language]
  const load = async () => { setRefreshing(true); setError(''); try { const res = await fetch('/api/dashboard'); if (!res.ok) throw new Error(); setData(await res.json()) } catch { setError(t.unavailable) } finally { setLoading(false); setRefreshing(false) } }
  useEffect(() => { void load() }, [])
  const riverChart = useMemo(() => (data?.river?.points.filter((_, i) => i % 6 === 0).map(p => ({ ...p, label: fmt(p.time, language, { day:'numeric', hour:'2-digit' }) })) ?? []), [data, language])
  const weatherChart = useMemo(() => (data?.weather?.hourly.filter((_, i) => i % 4 === 0).map(p => ({ ...p, label: fmt(p.time, language, { day:'numeric', hour:'2-digit' }) })) ?? []), [data, language])
  const peak = data?.river?.daily.reduce((a, b) => a.max > b.max ? a : b)
  if (loading) return <main className="loading"><img src="/logo-axion-blanco.webp" alt="AXION energy"/><p>{t.loading}</p></main>
  const current = data?.weather?.current
  return <main data-report>
    <header className="topbar"><div className="brand"><img src="/logo-axion-blanco.webp" alt="AXION energy"/><div><span>{t.site}</span><b>{t.place}</b></div></div><div className="actions"><small>{data && `${t.updated} ${time(data.generatedAt, language)} ART`}</small><button className="lang" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')} aria-label="Change language"><Languages size={16}/>{language.toUpperCase()}</button><button onClick={() => void load()} disabled={refreshing} aria-label={t.refresh}><RefreshCw size={16} className={refreshing ? 'spin' : ''}/><span>{t.refresh}</span></button><button className="download" onClick={() => void downloadReport(language)}><ArrowDownToLine size={16}/><span>{t.download}</span></button></div></header>
    <section className="hero"><p className="eyebrow">{t.site}</p><h1>{t.title}</h1><p>{t.place}</p></section>
    {error && <div className="notice"><AlertTriangle size={17}/>{error}</div>}
    {data?.notices?.map(n => <div className="notice" key={n}><AlertTriangle size={17}/>{n}</div>)}
    <section className="metrics" aria-label="Current operational measures">
      <Metric label={t.currentLevel} value={data?.river?.current == null ? '—' : `${data.river.current.toFixed(2)} m`} detail={data?.river ? `${t.updated} ${time(data.river.updatedAt, language)}` : t.unavailable} icon={<Waves/>}/>
      <Metric label={t.riverPeak} value={peak ? `${peak.max.toFixed(2)} m` : '—'} detail={peak ? fmt(peak.date, language) : t.unavailable} icon={<Droplets/>}/>
      <Metric label={t.temperature} value={current ? `${current.temperature.toFixed(1)}°C` : '—'} detail={current ? weatherText[current.condition][language] : t.unavailable} icon={<span className="metric-weather">{current ? weatherIcon[current.condition] : '—'}</span>}/>
      <Metric label={t.wind} value={current ? `${Math.round(current.windSpeed)} km/h` : '—'} detail={current ? `${current.windCardinal} · ${current.windDirection}°` : t.unavailable} icon={<Wind/>}/>
    </section>
    <section className="workspace">
      <article className="panel river-panel"><div className="panel-head"><div><h2>{t.riverForecast}</h2><p>{t.riverCaption}</p></div><span className="source-tag">INA</span></div>{data?.river ? <><div className="legend"><i className="band"/> {language === 'es' ? 'Banda de incertidumbre' : 'Uncertainty band'} <i className="line"/> {language === 'es' ? 'Pronóstico' : 'Forecast'}</div><div className="chart river-chart"><ResponsiveContainer><ComposedChart data={riverChart}><CartesianGrid vertical={false}/><XAxis dataKey="label" minTickGap={26}/><YAxis unit=" m" width={46}/><Tooltip/><Area type="monotone" dataKey="upper" stroke="none" fill="#BFE3E7" fillOpacity={.8}/><Area type="monotone" dataKey="lower" stroke="none" fill="#F8FAFA" fillOpacity={1}/><Line type="monotone" dataKey="level" stroke="#087E8B" strokeWidth={3} dot={false}/></ComposedChart></ResponsiveContainer></div><h3>{t.dailySummary}</h3><div className="table-wrap"><table><thead><tr><th>{t.date}</th><th>{t.min}</th><th>{t.max}</th><th>{t.last}</th></tr></thead><tbody>{data.river.daily.map(d => <tr key={d.date}><td>{fmt(d.date, language)}</td><td>{d.min.toFixed(2)} m</td><td>{d.max.toFixed(2)} m</td><td>{d.last.toFixed(2)} m</td></tr>)}</tbody></table></div></> : <p className="empty">{t.unavailable}</p>}</article>
      <aside className="side-stack"><article className="panel now-panel"><div className="panel-head"><h2>{t.weatherNow}</h2><span className="source-tag">Open-Meteo</span></div>{current ? <div className="now"><span>{weatherIcon[current.condition]}</span><strong>{current.temperature.toFixed(1)}°C</strong><p>{weatherText[current.condition][language]} · {current.humidity}% RH · {current.precipitation} mm</p><p><Wind size={15}/> {Math.round(current.windSpeed)} km/h {current.windCardinal}</p></div> : <p className="empty">{t.unavailable}</p>}</article><article className="panel forecast-panel"><div className="panel-head"><h2>{t.forecast}</h2><span>{language === 'es' ? 'Clima' : 'Weather'}</span></div><div className="forecast-grid">{data?.weather?.daily.map(d => <Condition day={d} language={language} key={d.date}/>)}</div></article><article className="panel weather-chart"><div className="panel-head"><h2>{t.tempRain}</h2><span>48 h</span></div>{weatherChart.length > 0 ? <div className="chart"><ResponsiveContainer><LineChart data={weatherChart}><CartesianGrid/><XAxis dataKey="label" minTickGap={36}/><YAxis yAxisId="temp"/><YAxis yAxisId="rain" orientation="right" domain={[0, 100]} unit="%"/><Tooltip/><Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#DD3737" strokeWidth={2.5} dot={false}/><Area yAxisId="rain" type="monotone" dataKey="rainChance" stroke="#1976D2" fill="#BFE3E7" fillOpacity={.75}/></LineChart></ResponsiveContainer></div> : <p className="empty">{t.unavailable}</p>}</article></aside>
    </section>
    <footer><div><b>{t.source}:</b> <a href="https://www.ina.gov.ar/alerta/index.php?seccion=10" target="_blank">{t.riverSource}</a> · <a href="https://open-meteo.com/" target="_blank">{t.weatherSource}</a></div><p>{t.disclaimer}</p></footer>
  </main>
}
