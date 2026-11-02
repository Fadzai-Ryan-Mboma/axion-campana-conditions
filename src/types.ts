export type Language = 'es' | 'en'
export type OperationalInterval = 1 | 4 | 8 | 12 | 24
export interface RiverPoint { time: string; level: number; lower: number; upper: number; observed: boolean }
export interface RiverDaily { date: string; min: number; max: number; last: number }
export interface WeatherDay { date: string; high: number; low: number; rainChance: number; windSpeed: number; windDirection: number; windCardinal: string; condition: string; code: number }
export interface DashboardData { generatedAt: string; sourceStatus: { ina: string; weather: string }; notices: string[]; riverStale?: boolean; river: { updatedAt: string; current: number | null; points: RiverPoint[]; daily: RiverDaily[] } | null; weather: { updatedAt: string; current: { temperature: number; humidity: number; windSpeed: number; windDirection: number; windCardinal: string; precipitation: number; condition: string; code: number }; daily: WeatherDay[]; hourly: { time: string; temperature: number; rainChance: number; windSpeed: number; windDirection: number }[] } | null }
