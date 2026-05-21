// Generate a printable weather + hydrology report and open it in a new
// window with auto-print triggered. The user picks "Save as PDF" in the
// print dialog destination — producing a real .pdf without us shipping
// a Cyrillic-capable PDF library in the bundle (the built-in jsPDF fonts
// are Latin-only).
//
// Pros: zero extra deps, full Cyrillic support, perfect typography,
//       browser handles paging.
// Cons: user goes through the print dialog (not a one-click .pdf).

const RU_MONTHS  = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const RU_WEEKDAY = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']

function fmtFullDateTime(d = new Date()) {
  const day = d.getDate(), month = RU_MONTHS[d.getMonth()], year = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year} г., ${hh}:${mm}`
}

function fmtNum(n, suffix = '', signed = false) {
  if (n == null || !Number.isFinite(n)) return '—'
  const r = Math.round(n)
  const sign = signed && r > 0 ? '+' : ''
  return `${sign}${r}${suffix}`
}

/**
 * @typedef {Object} ReportPayload
 * @property {string} city
 * @property {object} current   — normalized currentWeather
 * @property {Array}  days      — forecastDays (we use days[0] for today summary)
 * @property {object} [hydro]   — { station, distanceKm, data } for nearest gauge
 * @property {object} [tip]     — { title, text } from pickTipOfDay
 * @property {object} [wellness] — calculateWeatherImpact output
 */

export function exportWeatherReport(payload) {
  const html = buildHtml(payload)
  // Open a focused window and trigger print there. Closing afterwards
  // is the user's choice (some users want to look first).
  const w = window.open('', '_blank', 'width=900,height=1100')
  if (!w) {
    window.alert('Не удалось открыть окно для печати. Разрешите всплывающие окна для этого сайта.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  // Wait for fonts/images to settle, then trigger print
  w.onload = () => {
    setTimeout(() => { try { w.focus(); w.print() } catch {} }, 350)
  }
}

function buildHtml({ city, current, days, hydro, tip, wellness }) {
  const today = days?.[0]
  const w     = current
  const h     = hydro?.data
  const st    = hydro?.station

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>HydroMetView — отчёт по «${escape(city)}»</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 32px 36px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  header { border-bottom: 2px solid #2F80FF; padding-bottom: 14px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 10px; color: #2F80FF; font-weight: 700; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; }
  .brand-icon { width: 24px; height: 24px; border-radius: 7px; background: #2F80FF; color: #fff;
                display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
  h1 { font-size: 28px; margin: 10px 0 4px; font-weight: 700; }
  .sub { color: #64748b; font-size: 13px; }

  section { margin-bottom: 28px; page-break-inside: avoid; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #2F80FF; margin: 0 0 12px; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
  .label { font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.06em; font-weight: 600; }
  .value { font-size: 18px; font-weight: 700; margin-top: 2px; }

  .hero { display: flex; align-items: center; gap: 16px; padding: 16px; background: linear-gradient(135deg, #DCEAFB, #E9F1FC); border-radius: 16px; }
  .hero .temp { font-size: 56px; font-weight: 800; line-height: 1; }
  .hero .cond { font-size: 16px; color: #1e293b; }
  .hero .feels { font-size: 12px; color: #64748b; margin-top: 4px; }
  .hero img { width: 80px; height: 80px; }

  .hydro { padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; }
  .hydro-bar { display: block; height: 10px; border-radius: 99px;
               background: linear-gradient(to right, #22c55e 0%, #22c55e 55%, #f59e0b 55%, #f59e0b 80%, #ef4444 80%); position: relative; margin: 8px 0 6px; }
  .hydro-marker { position: absolute; top: -5px; width: 4px; height: 20px; background: #0f172a; border-radius: 2px; }
  .hydro-labels { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }

  .tip { padding: 14px; background: #2F80FF; color: #fff; border-radius: 12px; }
  .tip .ttl { font-weight: 700; font-size: 14px; margin-bottom: 4px; }

  ul.advisories { list-style: none; padding: 0; margin: 0; }
  ul.advisories li { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
  ul.advisories li:last-child { border: 0; }

  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; }

  @media print {
    body { padding: 16mm 14mm; }
    @page  { size: A4; margin: 0; }
  }
</style>
</head>
<body>
  <header>
    <div class="brand"><span class="brand-icon">H</span>HydroMetView</div>
    <h1>${escape(city)}</h1>
    <div class="sub">Сводка погоды и гидрологической обстановки · сформировано ${fmtFullDateTime(new Date())}</div>
  </header>

  ${w ? `
  <section>
    <h2>Текущая погода</h2>
    <div class="hero">
      ${w.conditionIcon ? `<img src="${escape(w.conditionIcon)}" alt="">` : ''}
      <div>
        <div class="temp">${fmtNum(w.tempC, '°C', true)}</div>
        <div class="cond">${escape(w.conditionText ?? '')}</div>
        <div class="feels">Ощущается как ${fmtNum(w.feelsLikeC, '°C', true)}</div>
      </div>
    </div>
    <div class="grid" style="margin-top:12px">
      <div class="card"><div class="label">Влажность</div><div class="value">${w.humidity ?? '—'}%</div></div>
      <div class="card"><div class="label">Давление</div><div class="value">${fmtNum(w.pressureMmHg)} мм рт. ст.</div></div>
      <div class="card"><div class="label">Ветер</div><div class="value">${w.windMs != null ? w.windMs.toFixed(1) : '—'} м/с${w.windDir ? ', ' + escape(w.windDir) : ''}</div></div>
      <div class="card"><div class="label">Осадки сегодня</div><div class="value">${today?.precipChance ?? 0}%${today?.totalPrecipMm ? ' (' + today.totalPrecipMm.toFixed(1) + ' мм)' : ''}</div></div>
    </div>
  </section>` : ''}

  ${days && days.length > 1 ? `
  <section>
    <h2>Прогноз на ${days.length} ${days.length < 5 ? 'дня' : 'дней'}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="text-align:left;border-bottom:1px solid #e2e8f0;color:#64748b">
        <th style="padding:6px 0">Дата</th><th>Условия</th><th>Темп.</th><th>Осадки</th>
      </tr></thead>
      <tbody>
        ${days.map((d, i) => `
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:6px 0">${i === 0 ? 'Сегодня' : escape(formatDate(d.date))}</td>
            <td>${escape(d.conditionText ?? '—')}</td>
            <td>${fmtNum(d.minTempC, '°', true)} … ${fmtNum(d.maxTempC, '°', true)}</td>
            <td>${d.precipChance ?? 0}% (${d.totalPrecipMm != null ? d.totalPrecipMm.toFixed(1) : '0'} мм)</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </section>` : ''}

  ${h?.level != null && st ? `
  <section>
    <h2>Гидрологическая обстановка</h2>
    <div class="hydro">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div>
          <strong>${escape(st.name)}</strong> · река ${escape(st.river ?? '')}<br>
          <span style="font-size:11px;color:#64748b">${hydro.distanceKm != null ? Math.round(hydro.distanceKm) + ' км от города' : ''}</span>
        </div>
        <div style="font-size:24px;font-weight:700">${Math.round(h.level)} см</div>
      </div>
      <div class="hydro-bar">
        <span class="hydro-marker" style="left: ${Math.min(100, Math.max(0, (h.level / (h.danger || 500)) * 100))}%"></span>
      </div>
      <div class="hydro-labels">
        <span>Норма 0–${h.warning ?? 290}</span>
        <span>Внимание ${h.warning ?? 290}–${h.danger ?? 450}</span>
        <span>Опасный ≥ ${h.danger ?? 450}</span>
      </div>
      ${h.delta != null && h.delta !== 0
        ? `<div style="margin-top:8px;font-size:12px;color:${h.delta > 0 ? '#f97316' : '#3b82f6'};font-weight:600">
             ${h.delta > 0 ? '▲ +' : '▼ '}${h.delta} см за сутки
           </div>` : ''}
    </div>
  </section>` : ''}

  ${tip ? `
  <section>
    <h2>Совет дня</h2>
    <div class="tip">
      <div class="ttl">${escape(tip.title)}</div>
      ${tip.text ? `<div style="font-size:12px;opacity:.9">${escape(tip.text)}</div>` : ''}
    </div>
  </section>` : ''}

  ${wellness?.advisories?.length ? `
  <section>
    <h2>Влияние на самочувствие — ${escape(wellness.headline ?? '')}</h2>
    <ul class="advisories">
      ${wellness.advisories.map(a => `<li>${escape(a)}</li>`).join('')}
    </ul>
  </section>` : ''}

  <footer>
    HydroMetView · отчёт сформирован на основе данных WeatherAPI и собственной модели уровня воды.
    Документ предназначен для информационных целей.
  </footer>
</body>
</html>`
}

const RU_SHORT_WEEKDAY = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
function formatDate(yyyyMmDd) {
  if (!yyyyMmDd) return ''
  const d = new Date(yyyyMmDd + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return yyyyMmDd
  return `${RU_SHORT_WEEKDAY[d.getDay()]}, ${d.getDate()} ${RU_MONTHS[d.getMonth()]}`
}

function escape(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
