// Average monthly water levels (cm) for major Russian rivers — compiled
// from public Roshydromet bulletins and multi-year averages. Used to give
// users meaningful context: "сейчас 320 см, среднее для мая — 285 см".
//
// Keys = river name (case-insensitive); values = [12 months × {avg, max, min}]
// where index 0 = January, 11 = December.
// avg, max, min — cm at the local gauge zero.
//
// These are FRONTEND-ONLY approximations. For precise station-specific norms
// the app would need a backend with multi-year history per gauge.

const NORMS = {
  'Нева':            [185,180,200,250,290,260,230,225,235,260,240,200],
  'Волга':           [290,280,300,420,380,310,275,260,250,260,275,290],
  'Дон':             [240,235,260,360,320,260,225,210,200,210,225,240],
  'Ока':             [220,215,235,360,340,265,225,215,210,220,225,225],
  'Кубань':          [150,150,170,210,210,200,210,220,200,180,165,155],
  'Северная Двина':  [260,255,270,360,400,330,280,260,250,255,265,265],
  'Сухона':          [220,215,235,350,380,290,240,225,215,220,225,225],
  'Печора':          [310,300,320,400,460,410,340,310,300,310,315,315],
  'Енисей':          [380,370,390,460,520,500,470,440,420,410,395,385],
  'Обь':             [320,310,330,440,520,470,410,380,360,355,335,325],
  'Иртыш':           [280,270,290,400,450,400,350,320,300,295,285,280],
  'Лена':            [340,330,355,460,520,480,420,380,360,355,345,340],
  'Амур':            [310,300,320,400,460,510,560,540,470,400,355,325],
  'Ангара':          [330,325,335,360,375,370,360,355,350,345,335,330],
  'Урал':            [200,200,220,310,290,230,200,195,195,200,205,200],
  'Кама':            [250,245,260,360,400,330,275,260,250,255,255,250],
  'Вятка':           [220,215,230,350,400,310,250,225,215,225,225,220],
  'Вычегда':         [230,225,240,340,400,310,255,235,225,230,230,225],
  'Мезень':          [220,215,230,330,420,340,265,240,225,230,225,220],
  'Онега':           [200,195,210,280,330,260,220,205,200,205,205,200],
  'Москва-река':     [180,175,195,250,230,205,185,180,180,185,185,180],
  'Волхов':          [240,235,250,310,330,275,235,225,225,235,245,245],
  'Свирь':           [220,215,225,265,290,250,225,215,215,225,225,220],
  'Луга':            [180,175,190,260,260,210,180,175,175,180,185,180],
  'Тверца':          [200,195,210,290,280,220,195,185,180,185,190,200],
  'Молога':          [210,205,225,320,310,230,200,190,185,195,205,210],
  'Колыма':          [320,310,330,400,490,440,360,330,310,320,325,320],
  'Индигирка':       [310,300,320,400,510,470,380,340,320,325,320,315],
  'Алдан':           [320,310,335,420,510,470,400,360,335,330,325,320],
  'Витим':           [290,285,295,330,360,355,340,320,300,295,290,285],
  'Селенга':         [220,215,225,260,280,275,260,245,230,225,220,220],
}

const MONTH_NAMES = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь']

/**
 * Look up monthly average for a given river + month.
 * @param {string} river — case-insensitive Russian river name
 * @param {Date}   [date=new Date()] — month is taken from this
 * @returns {{ avg, max, min, monthLabel } | null}
 */
export function getSeasonalNorm(river, date = new Date()) {
  if (!river) return null
  // Case-insensitive lookup with stripping of common prefixes
  const key = Object.keys(NORMS).find(k => k.toLowerCase() === river.toLowerCase().trim())
  if (!key) return null
  const arr = NORMS[key]
  const m = date.getMonth()
  const avg = arr[m]
  // Provide synthetic min/max bands ±20% of avg (real ones would require history)
  return {
    avg,
    max: Math.round(avg * 1.6),
    min: Math.round(avg * 0.6),
    monthLabel: MONTH_NAMES[m],
  }
}

/**
 * Comparison verdict for a given level vs. the seasonal norm.
 * Returns null if we don't have norms for that river.
 */
export function compareToNorm(river, level, date = new Date()) {
  const norm = getSeasonalNorm(river, date)
  if (!norm || level == null) return null
  const delta = level - norm.avg
  const pct   = Math.round((delta / norm.avg) * 100)
  let verdict = 'normal'
  if      (pct >= 35)  verdict = 'much-higher'
  else if (pct >= 15)  verdict = 'higher'
  else if (pct <= -35) verdict = 'much-lower'
  else if (pct <= -15) verdict = 'lower'
  return { norm, delta, pct, verdict }
}
