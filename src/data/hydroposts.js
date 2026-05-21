// Catalog of hydroposts used by the popup, the favorites grid and the charts page.
// Single source of truth — adding a post here makes it work everywhere.

export const hydroposts = {
  'spb-neva': {
    id: 'spb-neva',
    number: 42,
    city: 'Санкт-Петербург',
    river: 'Нева',
    waterLevel: 320,
    waterNorm: 290,
    waterCritical: 450,
    waterTemp: 11,
    airTemp: 15,
    feelsLike: 12,
    humidity: 65,
    pressure: 745,
    windSpeed: 4,
    tomorrowTemp: 18,
    tomorrowDesc: 'Ясно, без осадков',
  },
  'msk-moskva': {
    id: 'msk-moskva',
    number: 17,
    city: 'Москва',
    river: 'Москва',
    waterLevel: 178,
    waterNorm: 200,
    waterCritical: 320,
    waterTemp: 13,
    airTemp: 19,
    feelsLike: 18,
    humidity: 58,
    pressure: 748,
    windSpeed: 3,
    tomorrowTemp: 21,
    tomorrowDesc: 'Переменная облачность',
  },
  'nn-oka': {
    id: 'nn-oka',
    number: 8,
    city: 'Нижний Новгород',
    river: 'Ока',
    waterLevel: 412,
    waterNorm: 320,
    waterCritical: 460,
    waterTemp: 14,
    airTemp: 17,
    feelsLike: 16,
    humidity: 71,
    pressure: 742,
    windSpeed: 5,
    tomorrowTemp: 19,
    tomorrowDesc: 'Возможен дождь',
  },
  'rnd-don': {
    id: 'rnd-don',
    number: 24,
    city: 'Ростов-на-Дону',
    river: 'Дон',
    waterLevel: 385,
    waterNorm: 310,
    waterCritical: 440,
    waterTemp: 18,
    airTemp: 24,
    feelsLike: 23,
    humidity: 54,
    pressure: 754,
    windSpeed: 6,
    tomorrowTemp: 26,
    tomorrowDesc: 'Ясно, жарко',
  },
  'nvs-ob': {
    id: 'nvs-ob',
    number: 33,
    city: 'Новосибирск',
    river: 'Обь',
    waterLevel: 245,
    waterNorm: 380,
    waterCritical: 600,
    waterTemp: 9,
    airTemp: 12,
    feelsLike: 9,
    humidity: 67,
    pressure: 749,
    windSpeed: 4,
    tomorrowTemp: 14,
    tomorrowDesc: 'Облачно',
  },
}

export function getHydropost(id) {
  return hydroposts[id] ?? null
}

// Status based on level vs norm/critical thresholds
export function hydropostStatus(post) {
  if (!post) return 'unknown'
  const { waterLevel, waterNorm, waterCritical } = post
  if (waterLevel >= waterCritical) return 'critical'
  if (waterLevel >= (waterNorm + waterCritical) / 2) return 'warning'
  if (waterLevel < waterNorm * 0.8) return 'low'
  return 'normal'
}
