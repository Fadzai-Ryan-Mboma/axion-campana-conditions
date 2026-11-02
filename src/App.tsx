import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  CloudRain,
  Droplets,
  RefreshCw,
  Wind,
  Waves,
  AlertTriangle,
  Languages,
  Moon,
  Sun,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { copy, weatherText } from "./i18n";
import { downloadReport } from "./report";
import type {
  DashboardData,
  Language,
  OperationalInterval,
  RiverPoint,
  WeatherDay,
} from "./types";

const intervals: OperationalInterval[] = [1, 4, 8, 12, 24];
const intervalKey: Record<OperationalInterval, "hourly" | "fourHour" | "eightHour" | "twelveHour" | "daily"> = {
  1: "hourly",
  4: "fourHour",
  8: "eightHour",
  12: "twelveHour",
  24: "daily",
};
const horizonFor: Record<OperationalInterval, number> = { 1: 24, 4: 48, 8: 72, 12: 96, 24: 120 };
const periodStart = (date: string, hours: number) => {
  const value = new Date(date).getTime();
  return new Date(Math.floor(value / (hours * 3_600_000)) * hours * 3_600_000).toISOString();
};
const cardinal = (degrees: number) =>
  ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8];
const trend = (first: number, last: number) =>
  Math.abs(last - first) < 0.02 ? "→" : last > first ? "↑" : "↓";

function aggregateRiver(points: RiverPoint[], interval: OperationalInterval) {
  if (interval === 24) return [];
  const groups = new Map<string, RiverPoint[]>();
  for (const point of points) {
    const key = periodStart(point.time, interval);
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }
  return [...groups.entries()].map(([time, values]) => {
    const first = values[0], last = values.at(-1)!;
    return {
      time,
      level: last.level,
      last: last.level,
      lower: Math.min(...values.map((value) => value.lower)),
      upper: Math.max(...values.map((value) => value.upper)),
      min: Math.min(...values.map((value) => value.level)),
      max: Math.max(...values.map((value) => value.level)),
      trend: trend(first.level, last.level),
      observed: values.every((value) => value.observed),
    };
  });
}

function aggregateWeather(
  hourly: NonNullable<DashboardData["weather"]>["hourly"],
  interval: OperationalInterval,
) {
  const groups = new Map<string, typeof hourly>();
  for (const point of hourly) {
    const key = periodStart(point.time, interval);
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }
  return [...groups.entries()].map(([time, values]) => {
    const strongest = values.reduce((winner, value) =>
      value.windSpeed > winner.windSpeed ? value : winner,
    );
    return {
      time,
      temperature:
        values.reduce((total, value) => total + value.temperature, 0) / values.length,
      rainChance: Math.max(...values.map((value) => value.rainChance)),
      windSpeed: strongest.windSpeed,
      windDirection: strongest.windDirection,
      windCardinal: cardinal(strongest.windDirection),
    };
  });
}

const weatherIcon: Record<string, string> = {
  clear: "☀",
  cloudy: "☁",
  fog: "≋",
  drizzle: "☂",
  rain: "☔",
  snow: "❄",
  storm: "ϟ",
};
const fmt = (
  date: string,
  language: Language,
  style: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  },
) =>
  new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-GB", {
    ...style,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(date));
const time = (date: string, language: Language) =>
  new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(date));
const axisStamp = (date: string, language: Language) =>
  new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  })
    .format(new Date(date))
    .replace(",", " ·");

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="metric">
      <div className="metric-top">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function Condition({ day, language }: { day: WeatherDay; language: Language }) {
  const t = copy[language];
  return (
    <div className="forecast-day">
      <b>{fmt(day.date, language)}</b>
      <span className="condition-icon" aria-hidden>
        {weatherIcon[day.condition]}
      </span>
      <strong>
        {Math.round(day.high)}° <em>{Math.round(day.low)}°</em>
      </strong>
      <small>{weatherText[day.condition][language]}</small>
      <small>
        <CloudRain size={13} /> {day.rainChance}%
      </small>
      <small>
        <Wind size={13} /> {Math.round(day.windSpeed)} km/h {day.windCardinal}
      </small>
    </div>
  );
}
function WeatherPeriod({
  period,
  language,
}: {
  period: { time: string; temperature: number; rainChance: number; windSpeed: number; windCardinal: string };
  language: Language;
}) {
  return (
    <div className="forecast-day period-day">
      <b>{axisStamp(period.time, language)}</b>
      <strong>{period.temperature.toFixed(1)}°</strong>
      <small><CloudRain size={13} /> {period.rainChance}%</small>
      <small><Wind size={13} /> {Math.round(period.windSpeed)} km/h {period.windCardinal}</small>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>("es"),
    [theme, setTheme] = useState<"light" | "dark">(() =>
      localStorage.getItem("axion-theme") === "dark" ? "dark" : "light",
    ),
    [data, setData] = useState<DashboardData | null>(null),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [interval, setInterval] = useState<OperationalInterval>(() => {
      const stored = Number(localStorage.getItem("axion-operational-interval"));
      return intervals.includes(stored as OperationalInterval)
        ? (stored as OperationalInterval)
        : 4;
    }),
    [clock, setClock] = useState(() => Date.now());
  const t = copy[language];
  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error();
      const next = (await res.json()) as DashboardData;
      if (next.river) {
        localStorage.setItem(
          "axion-last-river",
          JSON.stringify({ river: next.river, savedAt: next.generatedAt }),
        );
      } else {
        const saved = localStorage.getItem("axion-last-river");
        if (saved) {
          const previous = JSON.parse(saved) as {
            river: NonNullable<DashboardData["river"]>;
          };
          next.river = previous.river;
          next.riverStale = true;
        }
      }
      setData(next);
    } catch {
      setError(t.unavailable);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.unavailable]);
  useEffect(() => {
    void load();
    const tick = window.setInterval(() => setClock(Date.now()), 1_000);
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 600_000);
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(refresh);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [load]);
  const chooseInterval = (next: OperationalInterval) => {
    setInterval(next);
    localStorage.setItem("axion-operational-interval", String(next));
  };
  const riverChart = useMemo(() => {
    const cutoff = data?.river ? new Date(data.river.updatedAt).getTime() : 0;
    const source = data?.river
      ? interval === 24
        ? data.river.daily.map((day) => ({
            time: `${day.date}T12:00:00-03:00`,
            level: day.last,
            lower: day.min,
            upper: day.max,
            observed: false,
          }))
        : aggregateRiver(data.river.points, interval)
      : [];
    return (
      source
        .map((p) => ({
          ...p,
          label: axisStamp(p.time, language),
          observedLevel: new Date(p.time).getTime() <= cutoff ? p.level : null,
          forecastLevel: new Date(p.time).getTime() > cutoff ? p.level : null,
          uncertaintyUpper:
            new Date(p.time).getTime() > cutoff ? p.upper : null,
          uncertaintyLower:
            new Date(p.time).getTime() > cutoff ? p.lower : null,
        }))
    );
  }, [data, interval, language]);
  const weatherChart = useMemo(
    () => {
      const source = data?.weather
        ? interval === 24
          ? data.weather.daily.map((day) => ({
              time: `${day.date}T12:00:00-03:00`,
              temperature: (day.high + day.low) / 2,
              rainChance: day.rainChance,
              windSpeed: day.windSpeed,
              windDirection: day.windDirection,
              windCardinal: day.windCardinal,
            }))
          : aggregateWeather(data.weather.hourly, interval).slice(
              0,
              Math.ceil(horizonFor[interval] / interval),
            )
        : [];
      return source
        .map((p) => ({
          ...p,
          label: axisStamp(p.time, language),
        }));
    },
    [data, interval, language],
  );
  const windChart = useMemo(
    () =>
      weatherChart.map((d) => ({
        ...d,
        color:
          Math.round(d.windSpeed) < 20
            ? "#087E8B"
            : Math.round(d.windSpeed) < 25
              ? "#E3A008"
              : "#DD3737",
      })),
    [weatherChart],
  );
  const riverRows = useMemo(() => {
    if (!data?.river) return [];
    if (interval === 24)
      return data.river.daily.map((day) => ({
        time: `${day.date}T12:00:00-03:00`,
        min: day.min,
        max: day.max,
        last: day.last,
        trend: "→",
      }));
    return aggregateRiver(data.river.points, interval);
  }, [data, interval]);
  const secondsToRefresh = Math.max(0, 600 - Math.floor((clock - new Date(data?.generatedAt ?? clock).getTime()) / 1000));
  const countdown = `${Math.floor(secondsToRefresh / 60)}:${String(secondsToRefresh % 60).padStart(2, "0")}`;
  const peak = data?.river?.daily.reduce((a, b) => (a.max > b.max ? a : b));
  if (loading)
    return (
      <main className="loading">
        <img src="/logo-axion-blanco.webp" alt="AXION energy" />
        <p>{t.loading}</p>
      </main>
    );
  const current = data?.weather?.current;
  const toggleTheme = () =>
    setTheme((previous) => {
      const next = previous === "light" ? "dark" : "light";
      localStorage.setItem("axion-theme", next);
      return next;
    });
  return (
    <main data-report className={`theme-${theme}`}>
      <header className="topbar">
        <div className="brand">
          <img src="/logo-axion-blanco.webp" alt="AXION energy" />
          <div>
            <span>{t.site}</span>
            <b>{t.place}</b>
          </div>
        </div>
        <div className="actions">
          <small>
            {data && `${t.updated} ${time(data.generatedAt, language)} ART`}
          </small>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? t.dark : t.light}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === "light" ? t.dark : t.light}</span>
          </button>
          <button
            className="lang"
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            aria-label="Change language"
          >
            <Languages size={16} />
            {language.toUpperCase()}
          </button>
          <button
            onClick={() => void load()}
            disabled={refreshing}
            aria-label={t.refresh}
          >
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            <span>{t.refresh}</span>
          </button>
          <button
            className="download"
            onClick={() => void downloadReport(language, interval)}
          >
            <ArrowDownToLine size={16} />
            <span>{t.download}</span>
          </button>
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t.site}</p>
          <h1>{t.title}</h1>
          <p>{t.place}</p>
        </div>
        <div
          className={`source-health ${data?.notices?.length ? "degraded" : ""}`}
        >
          <span className="health-dot" />
          <div>
            <b>{data?.notices?.length ? t.sourceIssue : t.liveSources}</b>
            <small>INA · Open-Meteo</small>
          </div>
        </div>
        <div className="interval-control" aria-label={t.operationalInterval}>
          <div className="interval-copy">
            <b>{t.operationalInterval}</b>
            <small>{t.intervalHint}</small>
          </div>
          <div className="interval-options" role="group" aria-label={t.operationalInterval}>
            {intervals.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => chooseInterval(option)}
                className={interval === option ? "selected" : ""}
                aria-pressed={interval === option}
              >
                {t[intervalKey[option]]}
              </button>
            ))}
          </div>
        </div>
        <p className="freshness" aria-live="polite">
          {data && `${t.updated} ${time(data.generatedAt, language)} ART · ${t.nextRefresh} ${countdown}`}
          <span>{t.refreshesEvery}</span>
        </p>
      </section>
      {error && (
        <div className="notice">
          <AlertTriangle size={17} />
          {error}
        </div>
      )}
      {data?.notices?.map((n) => (
        <div className="notice" key={n}>
          <AlertTriangle size={17} />
          {n}
        </div>
      ))}
      {data?.riverStale && (
        <div className="notice stale-notice">
          <AlertTriangle size={17} />
          {t.staleRiver} {t.updated} {time(data.river!.updatedAt, language)} ART.
        </div>
      )}
      <section className="metrics" aria-label="Current operational measures">
        <Metric
          label={t.currentLevel}
          value={
            data?.river?.current == null
              ? "—"
              : `${data.river.current.toFixed(2)} m`
          }
          detail={
            data?.river
              ? `${t.updated} ${time(data.river.updatedAt, language)}`
              : t.unavailable
          }
          icon={<Waves />}
        />
        <Metric
          label={t.riverPeak}
          value={peak ? `${peak.max.toFixed(2)} m` : "—"}
          detail={peak ? fmt(peak.date, language) : t.unavailable}
          icon={<Droplets />}
        />
        <Metric
          label={t.temperature}
          value={current ? `${current.temperature.toFixed(1)}°C` : "—"}
          detail={
            current ? weatherText[current.condition][language] : t.unavailable
          }
          icon={
            <span className="metric-weather">
              {current ? weatherIcon[current.condition] : "—"}
            </span>
          }
        />
        <Metric
          label={t.wind}
          value={current ? `${Math.round(current.windSpeed)} km/h` : "—"}
          detail={
            current
              ? `${current.windCardinal} · ${current.windDirection}°`
              : t.unavailable
          }
          icon={<Wind />}
        />
      </section>
      <section className="workspace">
        <article className="panel river-panel">
          <div className="panel-head">
            <div>
              <h2>{t.riverForecast}</h2>
              <p>{t.riverCaption}</p>
            </div>
            <span className="source-tag">INA</span>
          </div>
          {data?.river ? (
            <>
              <div className="legend">
                <i className="observed" /> {t.observed} <i className="line" />{" "}
                {t.forecastLine} <i className="band" /> {t.uncertainty}
              </div>
              <div className="axis-note">{t.unitLevel}</div>
              <div className="chart river-chart">
                <ResponsiveContainer>
                  <ComposedChart data={riverChart}>
                    <CartesianGrid vertical strokeDasharray="3 3" />
                    <XAxis dataKey="label" minTickGap={70} tickLine={false} />
                    <YAxis unit=" m" width={52} tickLine={false} />
                    <Tooltip
                      labelFormatter={(label) => label}
                      formatter={(value) => [
                        `${Number(value ?? 0).toFixed(2)} m`,
                        t.level,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="uncertaintyUpper"
                      stroke="none"
                      fill="#BFE3E7"
                      fillOpacity={0.8}
                    />
                    <Area
                      type="monotone"
                      dataKey="uncertaintyLower"
                      stroke="none"
                      fill="var(--panel)"
                      fillOpacity={1}
                    />
                    <Line
                      connectNulls
                      type="monotone"
                      dataKey="observedLevel"
                      stroke="#8997B2"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      connectNulls
                      type="monotone"
                      dataKey="forecastLevel"
                      stroke="#087E8B"
                      strokeWidth={3}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <h3>{interval === 24 ? t.dailySummary : t.operationalInterval}</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{interval === 24 ? t.date : t.period}</th>
                      <th>{t.min}</th>
                      <th>{t.max}</th>
                      <th>{t.last}</th>
                      {interval !== 24 && <th>{t.trend}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {riverRows.map((d) => (
                      <tr key={d.time}>
                        <td>{interval === 24 ? fmt(d.time, language) : axisStamp(d.time, language)}</td>
                        <td>{d.min.toFixed(2)} m</td>
                        <td>{d.max.toFixed(2)} m</td>
                        <td>{d.last.toFixed(2)} m</td>
                        {interval !== 24 && <td aria-label={t.trend}>{d.trend}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="empty">{t.unavailable}</p>
          )}
        </article>
        <aside className="side-stack">
          <article className="panel now-panel">
            <div className="panel-head">
              <h2>{t.weatherNow}</h2>
              <span className="source-tag">Open-Meteo</span>
            </div>
            {current ? (
              <div className="now">
                <span>{weatherIcon[current.condition]}</span>
                <strong>{current.temperature.toFixed(1)}°C</strong>
                <p>
                  {weatherText[current.condition][language]} ·{" "}
                  {current.humidity}% RH · {current.precipitation} mm
                </p>
                <p>
                  <Wind size={15} /> {Math.round(current.windSpeed)} km/h{" "}
                  {current.windCardinal}
                </p>
              </div>
            ) : (
              <p className="empty">{t.unavailable}</p>
            )}
          </article>
          <article className="panel forecast-panel">
            <div className="panel-head">
              <h2>{interval === 24 ? t.forecast : t.weatherPeriods}</h2>
              <span>{interval === 24 ? (language === "es" ? "Clima" : "Weather") : t[intervalKey[interval]]}</span>
            </div>
            <div className="forecast-grid">
              {interval === 24
                ? data?.weather?.daily.map((d) => (
                    <Condition day={d} language={language} key={d.date} />
                  ))
                : weatherChart.slice(0, 5).map((period) => (
                    <WeatherPeriod period={period} language={language} key={period.time} />
                  ))}
            </div>
          </article>
          <article className="panel weather-chart">
            <div className="panel-head">
              <h2>{t.tempRain}</h2>
              <span>{t[intervalKey[interval]]} · {horizonFor[interval]} h</span>
            </div>
            <div className="legend">
              <i className="temp-line" /> {t.temperatureLine}{" "}
              <i className="rain-band" /> {t.rainProbability}
            </div>
            {weatherChart.length > 0 ? (
              <div className="chart">
                <ResponsiveContainer>
                  <LineChart data={weatherChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" minTickGap={55} tickLine={false} />
                    <YAxis yAxisId="temp" unit="°" tickLine={false} />
                    <YAxis
                      yAxisId="rain"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tickLine={false}
                    />
                    <Tooltip />
                    <Area
                      yAxisId="rain"
                      type="monotone"
                      dataKey="rainChance"
                      stroke="#1976D2"
                      fill="#BFE3E7"
                      fillOpacity={0.75}
                    />
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#DD3737"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty">{t.unavailable}</p>
            )}
          </article>
        </aside>
      </section>
      <section className="wind-section panel">
        <div className="panel-head">
          <div>
            <h2>{t.windTrend}</h2>
            <p>{t.unitWind}</p>
          </div>
          <span>{t[intervalKey[interval]]} · {horizonFor[interval]} h</span>
        </div>
        <div className="wind-legend" aria-label={t.windTrend}>
          <span><i className="wind-normal" /> {t.windNormal}</span>
          <span><i className="wind-amber" /> {t.windAmber}</span>
          <span><i className="wind-red" /> {t.windRed}</span>
        </div>
        {windChart.length > 0 && (
          <div className="wind-chart">
            <div
              className="wind-chart-canvas"
              style={{ minWidth: `${Math.max(720, windChart.length * 104)}px` }}
            >
              <ResponsiveContainer>
                <BarChart
                  data={windChart}
                  margin={{ top: 56, right: 14, left: 0, bottom: 12 }}
                >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} />
                <YAxis unit=" km/h" tickLine={false} />
                  <Bar
                    dataKey="windSpeed"
                    radius={[7, 7, 0, 0]}
                    isAnimationActive={false}
                  >
                  <LabelList
                    dataKey="windCardinal"
                    position="top"
                    offset={27}
                    fill="var(--wind-label)"
                    style={{ fontSize: 12, fontWeight: 700 }}
                    formatter={(v) => `➤ ${String(v ?? "")}`}
                  />
                  <LabelList
                    dataKey="windSpeed"
                    position="top"
                    offset={7}
                    fill="var(--wind-label)"
                    style={{ fontSize: 15, fontWeight: 700 }}
                    formatter={(v) => `${Math.round(Number(v ?? 0))} km/h`}
                  />
                    {windChart.map((d) => (
                      <Cell key={d.time} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>
      <footer>
        <div>
          <b>{t.source}:</b>{" "}
          <a
            href="https://www.ina.gov.ar/alerta/index.php?seccion=10"
            target="_blank"
          >
            {t.riverSource}
          </a>{" "}
          ·{" "}
          <a href="https://open-meteo.com/" target="_blank">
            {t.weatherSource}
          </a>
        </div>
        <p>{t.disclaimer}</p>
      </footer>
    </main>
  );
}
