import { subDays, subHours, format } from 'date-fns'

// --- Weather stations ---
export const weatherStations = [
  { id: 'ws-01', name: 'Центральная', city: 'Москва', lat: 55.7558, lon: 37.6173, status: 'online' },
  { id: 'ws-02', name: 'Северная', city: 'Санкт-Петербург', lat: 59.9343, lon: 30.3351, status: 'online' },
  { id: 'ws-03', name: 'Южная', city: 'Ростов-на-Дону', lat: 47.2357, lon: 39.7015, status: 'warning' },
  { id: 'ws-04', name: 'Восточная', city: 'Новосибирск', lat: 55.0084, lon: 82.9357, status: 'online' },
  { id: 'ws-05', name: 'Западная', city: 'Калининград', lat: 54.7104, lon: 20.4522, status: 'offline' },
]

// --- Hydro stations ---
export const hydroStations = [
  { id: 'hs-01', name: 'Волга — Ярославль', river: 'Волга', lat: 57.6298, lon: 39.8737, status: 'online' },
  { id: 'hs-02', name: 'Нева — Шлиссельбург', river: 'Нева', lat: 59.9450, lon: 31.0336, status: 'online' },
  { id: 'hs-03', name: 'Ока — Нижний Новгород', river: 'Ока', lat: 56.3269, lon: 44.0059, status: 'critical' },
  { id: 'hs-04', name: 'Дон — Ростов', river: 'Дон', lat: 47.2357, lon: 39.7015, status: 'warning' },
  { id: 'hs-05', name: 'Обь — Новосибирск', river: 'Обь', lat: 54.9884, lon: 82.9140, status: 'online' },
]

// --- Current weather ---
export const currentWeather = {
  temperature: 18,
  feelsLike: 16,
  humidity: 62,
  pressure: 762,
  windSpeed: 4.2,
  windDirection: 'С-З',
  visibility: 9.5,
  uvIndex: 4,
  dewPoint: 11,
  cloudCover: 35,
  condition: 'partly_cloudy',
  conditionLabel: 'Переменная облачность',
  updatedAt: new Date(),
}

// --- Hourly forecast ---
export const hourlyForecast = Array.from({ length: 24 }, (_, i) => {
  const hour = subHours(new Date(), -i)
  const base = 18
  const variation = Math.sin((i / 24) * Math.PI * 2) * 6
  return {
    time: format(hour, 'HH:mm'),
    temp: Math.round(base + variation + (Math.random() - 0.5) * 2),
    humidity: Math.round(60 + Math.sin(i / 3) * 15),
    precip: Math.random() > 0.8 ? +(Math.random() * 3).toFixed(1) : 0,
    wind: +(3 + Math.random() * 5).toFixed(1),
    icon: ['sunny', 'partly_cloudy', 'cloudy', 'rainy'][Math.floor(Math.random() * 4)],
  }
})

// --- 7-day forecast ---
export const dailyForecast = [
  { day: 'Сег', date: 'Сегодня', icon: 'partly_cloudy', high: 21, low: 13, precip: 10, wind: 4.2, humidity: 62 },
  { day: 'Вт', date: '20 мая', icon: 'sunny', high: 24, low: 15, precip: 0, wind: 3.1, humidity: 55 },
  { day: 'Ср', date: '21 мая', icon: 'sunny', high: 26, low: 16, precip: 0, wind: 2.8, humidity: 50 },
  { day: 'Чт', date: '22 мая', icon: 'cloudy', high: 20, low: 14, precip: 30, wind: 5.5, humidity: 72 },
  { day: 'Пт', date: '23 мая', icon: 'rainy', high: 16, low: 11, precip: 75, wind: 7.2, humidity: 88 },
  { day: 'Сб', date: '24 мая', icon: 'rainy', high: 14, low: 10, precip: 60, wind: 6.8, humidity: 90 },
  { day: 'Вс', date: '25 мая', icon: 'partly_cloudy', high: 18, low: 12, precip: 20, wind: 4.0, humidity: 70 },
]

// --- Temperature history (7 days) ---
export const temperatureHistory = Array.from({ length: 7 * 24 }, (_, i) => {
  const date = subHours(new Date(), 7 * 24 - i)
  const dayPhase = (i % 24) / 24
  const baseTemp = 16
  const dailyVar = Math.sin(dayPhase * Math.PI * 2 - Math.PI / 2) * 7
  const trend = i / (7 * 24) * 4
  return {
    time: format(date, 'dd.MM HH:mm'),
    temp: +(baseTemp + dailyVar + trend + (Math.random() - 0.5) * 1.5).toFixed(1),
    humidity: Math.round(65 - dailyVar * 2 + (Math.random() - 0.5) * 5),
  }
}).filter((_, i) => i % 3 === 0)

// --- Pressure history ---
export const pressureHistory = Array.from({ length: 48 }, (_, i) => {
  const date = subHours(new Date(), 48 - i)
  return {
    time: format(date, 'HH:mm dd.MM'),
    pressure: Math.round(758 + Math.sin(i / 8) * 6 + (Math.random() - 0.5) * 2),
  }
})

// --- Hydro levels (current) ---
export const hydroLevels = [
  {
    id: 'hs-01', name: 'Волга — Ярославль', river: 'Волга',
    level: 342, levelNorm: 310, levelWarning: 400, levelCritical: 450,
    flow: 1850, flowUnit: 'м³/с',
    trend: 'rising', trendValue: +12,
    status: 'normal', statusLabel: 'Норма',
  },
  {
    id: 'hs-02', name: 'Нева — Шлиссельбург', river: 'Нева',
    level: 198, levelNorm: 180, levelWarning: 250, levelCritical: 300,
    flow: 2540, flowUnit: 'м³/с',
    trend: 'stable', trendValue: +2,
    status: 'normal', statusLabel: 'Норма',
  },
  {
    id: 'hs-03', name: 'Ока — Нижний Новгород', river: 'Ока',
    level: 512, levelNorm: 320, levelWarning: 460, levelCritical: 500,
    flow: 980, flowUnit: 'м³/с',
    trend: 'rising', trendValue: +28,
    status: 'critical', statusLabel: 'Опасный',
  },
  {
    id: 'hs-04', name: 'Дон — Ростов', river: 'Дон',
    level: 385, levelNorm: 310, levelWarning: 380, levelCritical: 440,
    flow: 730, flowUnit: 'м³/с',
    trend: 'rising', trendValue: +8,
    status: 'warning', statusLabel: 'Повышенный',
  },
  {
    id: 'hs-05', name: 'Обь — Новосибирск', river: 'Обь',
    level: 410, levelNorm: 380, levelWarning: 520, levelCritical: 600,
    flow: 3200, flowUnit: 'м³/с',
    trend: 'falling', trendValue: -5,
    status: 'normal', statusLabel: 'Норма',
  },
]

// --- Hydro level history (Oka — critical) ---
export const hydroHistory = {
  'hs-03': Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 30 - i)
    return {
      date: format(date, 'dd.MM'),
      level: Math.round(320 + i * 6.5 + Math.sin(i / 3) * 15 + (Math.random() - 0.5) * 10),
      flow: Math.round(450 + i * 18 + (Math.random() - 0.5) * 40),
    }
  }),
  'hs-01': Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 30 - i)
    return {
      date: format(date, 'dd.MM'),
      level: Math.round(295 + Math.sin(i / 5) * 30 + i * 1.5 + (Math.random() - 0.5) * 8),
      flow: Math.round(1600 + Math.sin(i / 4) * 200 + (Math.random() - 0.5) * 50),
    }
  }),
}

// --- Alerts ---
export const alerts = [
  {
    id: 'a-001',
    type: 'critical',
    title: 'Критический уровень воды',
    message: 'Уровень воды на р. Ока (Нижний Новгород) достиг критической отметки 512 см. Угроза затопления пойменных территорий.',
    station: 'hs-03',
    stationName: 'Ока — Нижний Новгород',
    timestamp: subHours(new Date(), 1.5),
    acknowledged: false,
  },
  {
    id: 'a-002',
    type: 'warning',
    title: 'Повышенный уровень воды',
    message: 'Уровень воды на р. Дон (Ростов) превысил предупредительную отметку и составляет 385 см при норме 310 см.',
    station: 'hs-04',
    stationName: 'Дон — Ростов',
    timestamp: subHours(new Date(), 3),
    acknowledged: false,
  },
  {
    id: 'a-003',
    type: 'warning',
    title: 'Сильный ветер',
    message: 'На метеостанции "Южная" (Ростов-на-Дону) зафиксированы порывы ветра до 22 м/с. Действует предупреждение.',
    station: 'ws-03',
    stationName: 'Южная — Ростов-на-Дону',
    timestamp: subHours(new Date(), 5),
    acknowledged: true,
  },
  {
    id: 'a-004',
    type: 'info',
    title: 'Метеостанция отключена',
    message: 'Метеостанция "Западная" (Калининград) перешла в режим offline. Данные недоступны с 14:20.',
    station: 'ws-05',
    stationName: 'Западная — Калининград',
    timestamp: subHours(new Date(), 8),
    acknowledged: true,
  },
  {
    id: 'a-005',
    type: 'info',
    title: 'Осадки выше нормы',
    message: 'За последние 24 часа количество осадков в Ярославле составило 28 мм, что в 3.5 раза превышает суточную норму.',
    station: 'hs-01',
    stationName: 'Волга — Ярославль',
    timestamp: subHours(new Date(), 12),
    acknowledged: true,
  },
]

// --- Wind rose data ---
export const windRoseData = [
  { direction: 'С', value: 12 },
  { direction: 'С-В', value: 8 },
  { direction: 'В', value: 5 },
  { direction: 'Ю-В', value: 7 },
  { direction: 'Ю', value: 14 },
  { direction: 'Ю-З', value: 18 },
  { direction: 'З', value: 22 },
  { direction: 'С-З', value: 14 },
]

// --- Precipitation (last 14 days) ---
export const precipitationData = Array.from({ length: 14 }, (_, i) => {
  const date = subDays(new Date(), 14 - i)
  return {
    date: format(date, 'dd.MM'),
    precip: +(Math.random() > 0.5 ? Math.random() * 15 : 0).toFixed(1),
    norm: 3.8,
  }
})

// --- Summary stats ---
export const summaryStats = {
  activeStations: 8,
  totalStations: 10,
  criticalAlerts: 1,
  warningAlerts: 2,
  avgTemperature: 17.4,
  avgHumidity: 64,
  maxWindSpeed: 22.1,
  totalPrecip24h: 8.4,
}
