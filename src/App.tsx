import { useEffect, useMemo, useState } from "react";
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
import type { DashboardData, Language, WeatherDay } from "./types";

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
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(date));

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

export default function App() {
  const [language, setLanguage] = useState<Language>("es"),
    [theme, setTheme] = useState<"light" | "dark">(() =>
      localStorage.getItem("axion-theme") === "dark" ? "dark" : "light",
    ),
    [data, setData] = useState<DashboardData | null>(null),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState("");
  const t = copy[language];
  const load = async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(t.unavailable);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const riverChart = useMemo(() => {
    const cutoff = data?.river ? new Date(data.river.updatedAt).getTime() : 0;
    return (
      data?.river?.points
        .filter((_, i) => i % 4 === 0)
        .map((p) => ({
          ...p,
          label: fmt(p.time, language, {
            day: "numeric",
            month: "short",
            hour: "2-digit",
          }),
          observedLevel: new Date(p.time).getTime() <= cutoff ? p.level : null,
          forecastLevel: new Date(p.time).getTime() > cutoff ? p.level : null,
          uncertaintyUpper:
            new Date(p.time).getTime() > cutoff ? p.upper : null,
          uncertaintyLower:
            new Date(p.time).getTime() > cutoff ? p.lower : null,
        })) ?? []
    );
  }, [data, language]);
  const weatherChart = useMemo(
    () =>
      data?.weather?.hourly
        .filter((_, i) => i % 3 === 0)
        .map((p) => ({
          ...p,
          label: fmt(p.time, language, {
            day: "numeric",
            month: "short",
            hour: "2-digit",
          }),
        })) ?? [],
    [data, language],
  );
  const windChart = useMemo(
    () =>
      data?.weather?.daily.map((d) => ({
        ...d,
        label: fmt(d.date, language, {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        color:
          d.windSpeed < 20
            ? "#087E8B"
            : d.windSpeed < 25
              ? "#E3A008"
              : "#DD3737",
      })) ?? [],
    [data, language],
  );
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
            onClick={() => void downloadReport(language)}
          >
            <ArrowDownToLine size={16} />
            <span>{t.download}</span>
          </button>
        </div>
      </header>
      <section className="hero">
        <p className="eyebrow">{t.site}</p>
        <h1>{t.title}</h1>
        <p>{t.place}</p>
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
              <h3>{t.dailySummary}</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t.date}</th>
                      <th>{t.min}</th>
                      <th>{t.max}</th>
                      <th>{t.last}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.river.daily.map((d) => (
                      <tr key={d.date}>
                        <td>{fmt(d.date, language)}</td>
                        <td>{d.min.toFixed(2)} m</td>
                        <td>{d.max.toFixed(2)} m</td>
                        <td>{d.last.toFixed(2)} m</td>
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
              <h2>{t.forecast}</h2>
              <span>{language === "es" ? "Clima" : "Weather"}</span>
            </div>
            <div className="forecast-grid">
              {data?.weather?.daily.map((d) => (
                <Condition day={d} language={language} key={d.date} />
              ))}
            </div>
          </article>
          <article className="panel weather-chart">
            <div className="panel-head">
              <h2>{t.tempRain}</h2>
              <span>48 h</span>
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
          <span>{language === "es" ? "Próximos 5 días" : "Next 5 days"}</span>
        </div>
        {windChart.length > 0 && (
          <div className="wind-chart">
            <ResponsiveContainer>
              <BarChart
                data={windChart}
                margin={{ top: 32, right: 14, left: 0, bottom: 12 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} />
                <YAxis unit=" km/h" tickLine={false} />
                <Tooltip
                  formatter={(value) => [
                    `${Math.round(Number(value ?? 0))} km/h`,
                    t.wind,
                  ]}
                />
                <Bar dataKey="windSpeed" radius={[7, 7, 0, 0]}>
                  <LabelList
                    dataKey="windCardinal"
                    position="top"
                    offset={18}
                      formatter={(v) => `➤ ${String(v ?? '')}`}
                  />
                  <LabelList
                    dataKey="windSpeed"
                    position="top"
                    offset={3}
                      formatter={(v) => `${Math.round(Number(v ?? 0))} km/h`}
                  />
                  {windChart.map((d) => (
                    <Cell key={d.date} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
