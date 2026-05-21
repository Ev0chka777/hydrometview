// Pure converters and formatters for measurement units.
// All converters take a value in the canonical (metric) unit and a target unit.
// Canonical: temperature in °C, wind in m/s, pressure in mmHg.

export const TEMP_UNITS = {
  C: { label: '°C', long: 'Цельсий', longEn: 'Celsius' },
  F: { label: '°F', long: 'Фаренгейт', longEn: 'Fahrenheit' },
}

export const WIND_UNITS = {
  ms: { label: 'м/с', labelEn: 'm/s', long: 'Метры в секунду', longEn: 'Meters per second' },
  kmh: { label: 'км/ч', labelEn: 'km/h', long: 'Километры в час', longEn: 'Kilometers per hour' },
}

export const PRESSURE_UNITS = {
  mmHg: { label: 'мм рт.ст.', labelEn: 'mmHg', long: 'Миллиметры ртутного столба', longEn: 'Millimeters of mercury' },
  hPa: { label: 'гПа', labelEn: 'hPa', long: 'Гектопаскали', longEn: 'Hectopascals' },
}

export function convertTemp(celsius, target = 'C') {
  if (target === 'F') return celsius * 9 / 5 + 32
  return celsius
}

export function convertWind(metersPerSecond, target = 'ms') {
  if (target === 'kmh') return metersPerSecond * 3.6
  return metersPerSecond
}

export function convertPressure(mmHg, target = 'mmHg') {
  if (target === 'hPa') return mmHg * 1.33322
  return mmHg
}

// Formatters return a fully-localised string ready to render.

export function formatTemp(celsius, target = 'C', { signed = true, decimals = 0 } = {}) {
  const v = convertTemp(celsius, target)
  const rounded = Number(v.toFixed(decimals))
  const sign = signed && rounded > 0 ? '+' : ''
  return `${sign}${rounded}${TEMP_UNITS[target].label}`
}

export function formatWind(metersPerSecond, target = 'ms', windDir = '', lang = 'ru') {
  const v = convertWind(metersPerSecond, target)
  const rounded = Number(v.toFixed(target === 'kmh' ? 0 : 1))
  const u = lang === 'en' ? WIND_UNITS[target].labelEn : WIND_UNITS[target].label
  return windDir ? `${rounded} ${u}, ${windDir}` : `${rounded} ${u}`
}

export function formatPressure(mmHg, target = 'mmHg', lang = 'ru') {
  const v = convertPressure(mmHg, target)
  const rounded = Number(v.toFixed(target === 'hPa' ? 0 : 0))
  const u = lang === 'en' ? PRESSURE_UNITS[target].labelEn : PRESSURE_UNITS[target].label
  return `${rounded} ${u}`
}
