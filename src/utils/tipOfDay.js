// Pool of "tip of the day" cards. Each tip has a `match` predicate that
// receives a context object built from real weather data. We return the
// first matching tip (priority order: emergencies first, comfort tips last).

/**
 * @typedef {Object} TipContext
 * @property {number|null}  tempC          — current actual temperature
 * @property {number|null}  feelsLikeC
 * @property {number|null}  windMs
 * @property {number|null}  precipChance   — % today
 * @property {number|null}  precipMm       — total mm today
 * @property {number|null}  humidity
 * @property {number|null}  uv
 * @property {number|null}  pressureMmHg
 * @property {string}       conditionText  — e.g. "Небольшой дождь"
 * @property {boolean}      isDay
 */

const TIPS = [
  // ── Emergencies / strong-weather warnings ─────────────────────────────────
  {
    id: 'thunder',
    match: c => /гроз/i.test(c.conditionText || ''),
    title: 'Гроза — не выходите без необходимости',
    text:  'Избегайте открытых пространств, держитесь подальше от деревьев и металлических конструкций.',
  },
  {
    id: 'aqi-very-bad',
    match: c => (c.aqi?.epa ?? 0) >= 5,
    title: 'Опасное качество воздуха',
    text:  c => `Лучше остаться дома и закрыть окна (AQI ${c.aqi.epa}/6 — ${c.aqi.label.toLowerCase()}). При выходе используйте маску FFP2/FFP3.`,
  },
  {
    id: 'aqi-bad',
    match: c => (c.aqi?.epa ?? 0) === 4,
    title: 'Воздух вредный — сократите время на улице',
    text:  c => `AQI ${c.aqi.epa}/6 (${c.aqi.label.toLowerCase()}). Особенно осторожно — астматикам, пожилым и детям.`,
  },
  {
    id: 'heavy-rain',
    match: c => (c.precipMm ?? 0) >= 10 || (/ливень|сильный\s+дождь/i.test(c.conditionText || '')),
    title: 'Сильный дождь — берегитесь подтоплений',
    text:  'Обувайтесь в непромокаемое, обходите низины, не паркуйтесь у обочин с уклоном.',
  },
  {
    id: 'snow-storm',
    match: c => /метел|пург|снегопад/i.test(c.conditionText || ''),
    title: 'Снегопад — выезжайте заранее',
    text:  'Видимость на дороге снижена. Включите ближний свет даже днём, держите дистанцию.',
  },
  {
    id: 'extreme-heat',
    match: c => (c.feelsLikeC ?? c.tempC ?? 0) >= 28,
    title: 'Жарко — пейте больше воды',
    text:  'Лучше находиться в тени с 12 до 16 часов. Защитите голову, не оставляйте детей/животных в машине.',
  },
  {
    id: 'extreme-cold',
    match: c => (c.feelsLikeC ?? c.tempC ?? 0) <= -15,
    title: 'Сильный мороз — защитите лицо и руки',
    text:  'Тёплые перчатки, шарф, варежки. Старайтесь не оставаться на улице дольше 20 минут без движения.',
  },
  {
    id: 'high-wind',
    match: c => (c.windMs ?? 0) >= 12,
    title: 'Сильный ветер — закрепите вещи',
    text:  'Уберите с балкона лёгкие предметы. Избегайте парковок под деревьями и у строек.',
  },
  {
    id: 'high-uv',
    match: c => (c.uv ?? 0) >= 7 && c.isDay,
    title: 'Высокий УФ — нанесите крем SPF 30+',
    text:  'Особенно если будете на улице больше часа. Шляпа и солнцезащитные очки тоже не помешают.',
  },
  {
    id: 'pressure-jump',
    match: c => c.pressureMmHg != null && Math.abs(c.pressureMmHg - 760) >= 12,
    title: 'Скачок атмосферного давления',
    text:  'Метеозависимым стоит избегать перегрузок, пить больше воды и побыть в спокойном ритме.',
  },

  // ── Practical commute / outfit nudges ─────────────────────────────────────
  {
    id: 'umbrella',
    match: c => (c.precipChance ?? 0) >= 60,
    title: 'Не забудьте зонт',
    // `text` as a function — gets real context, no template-literal bug.
    text:  c => `Шанс осадков сегодня ${Math.round(c.precipChance ?? 0)}%. Запасной зонтик в рюкзак — и спокойно.`,
  },
  {
    id: 'fog',
    match: c => /туман|дымк/i.test(c.conditionText || ''),
    title: 'Туман — снизьте скорость на дороге',
    text:  'Включите ближний свет, держите большую дистанцию, не пользуйтесь дальним светом.',
  },
  {
    id: 'cold-rain',
    match: c => (c.precipChance ?? 0) >= 40 && (c.feelsLikeC ?? c.tempC ?? 99) < 10,
    title: 'Прохладно и сыро — одевайтесь по слоям',
    text:  'Тонкая водоотталкивающая куртка + свитер. Сменная обувь на работе спасёт ноги.',
  },
  {
    id: 'humid',
    match: c => (c.humidity ?? 0) >= 85,
    title: 'Высокая влажность',
    text:  'Дышать тяжелее, особенно при физ. нагрузке. Берите воду на пробежку, делайте паузы.',
  },

  // ── Pleasant defaults — pick something specific to the temp band ─────────
  {
    id: 'perfect-mild',
    match: c => (c.tempC ?? 0) >= 14 && (c.tempC ?? 0) <= 22 && (c.precipChance ?? 0) < 30,
    title: 'Отличный день для прогулки',
    text:  'Проветрите дом, выйдите в парк. Идеальная температура для долгих маршрутов пешком.',
  },
  {
    id: 'sunny-spring',
    match: c => (c.tempC ?? 0) >= 8 && (c.tempC ?? 0) < 14 && /ясн|солнечн/i.test(c.conditionText || ''),
    title: 'Свежо, но солнечно',
    text:  'Самое время для велосипеда или роликов. Утром ещё прохладно — наденьте лёгкую куртку.',
  },
  {
    id: 'warm-clear',
    match: c => (c.tempC ?? 0) >= 22 && (c.tempC ?? 0) < 28,
    title: 'Тёплый и приятный день',
    text:  'Хороший повод выпить кофе на летней террасе или сходить на стадион/в кино с открытой крышей.',
  },
  {
    id: 'autumn-walk',
    match: c => (c.tempC ?? 0) >= 0 && (c.tempC ?? 0) < 8,
    title: 'Свежий день — самое время для термоса',
    text:  'Чай, шарф и неспешная прогулка. Не забывайте про витамин D — гуляйте при свете дня.',
  },
  {
    id: 'mild-cloudy',
    match: c => (c.tempC ?? 0) >= 10 && /облач|пасмурн/i.test(c.conditionText || '') && (c.precipChance ?? 0) < 40,
    title: 'Облачно, но без осадков — идеально для дел',
    text:  'Нет солнца, нет жары — лучшее время для прогулки с собакой или поездки за город.',
  },
  {
    id: 'frosty-clear',
    match: c => (c.tempC ?? 0) < 0 && (c.tempC ?? 0) >= -10 && /ясн|солнечн/i.test(c.conditionText || ''),
    title: 'Морозно и ясно — отличный день для фото',
    text:  'Свет красивый и мягкий, особенно у воды. Не забудьте варежки.',
  },
]

// Generic fallback when nothing matches.
const DEFAULT_TIP = {
  title: 'Хорошего дня!',
  text:  'Загляните в раздел «Карта», чтобы посмотреть погоду в других городах России.',
}

function format(text, ctx) {
  if (typeof text === 'function') return text(ctx)
  return text
}

/**
 * Returns the best-matching tip for the supplied weather context.
 * @param {TipContext} ctx
 * @returns {{ title: string, text: string, id?: string }}
 */
export function pickTipOfDay(ctx = {}) {
  for (const tip of TIPS) {
    try {
      if (tip.match(ctx)) {
        return {
          id:    tip.id,
          title: format(tip.title, ctx),
          text:  format(tip.text, ctx),
        }
      }
    } catch { /* defensive — skip malformed predicates */ }
  }
  return { ...DEFAULT_TIP }
}
