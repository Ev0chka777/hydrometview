#!/usr/bin/env node
/**
 * Node 18+ — build src/data/all_stations.json by combining:
 *   1) allrivers.info region listings  → slug, river-display, city-display
 *   2) Nominatim (OpenStreetMap) geocoder → coords for each unique city
 *
 * Why this design:
 *   • Individual /gauge/<slug> pages on allrivers DO NOT expose coordinates
 *     anywhere we can scrape — checked in May 2026. Region listings, however,
 *     give us "р.<River>, <Site>, г.<City>" labels, which we can geocode.
 *   • Multiple gauges in the same city get a tiny pseudo-random jitter so
 *     they don't all stack on one pixel; cluster + spiderfy on the map
 *     handle the rest.
 *
 * Run:
 *   node scripts/build_stations.js
 *
 * Output:
 *   src/data/all_stations.json    — array of { id, name, river, lat, lng, urlPath }
 *   scripts/.build_stations_state.json — resume checkpoint
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_FILE   = path.resolve(__dirname, '..', 'src', 'data', 'all_stations.json')
const STATE_FILE = path.resolve(__dirname, '.build_stations_state.json')

const SITE       = 'https://allrivers.info'
const NOMINATIM  = 'https://nominatim.openstreetmap.org/search'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
// Nominatim usage policy requires a contact UA. Replace if you publish.
const NOMINATIM_UA = 'HydroMetView/1.0 (educational; https://example.com)'

const RU_SUB_REGIONS = [
  'dvfo-sever', 'vostok', 'kavkaz', 'crimea',
  'privolga', 'severo-zapad', 'siberia', 'siberia-z',
  'ural', 'center', 'yug',
]

const NOMINATIM_RPS = 1     // hard ceiling per Nominatim policy
const CHECKPOINT_MS = 5000

// ───────────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchText(url, headers = {}, attempts = 3) {
  let last = null
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ru,en;q=0.8', ...headers },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      last = e
      await sleep(600 * (i + 1))
    }
  }
  throw last
}

async function fetchJson(url, headers = {}) {
  const text = await fetchText(url, headers)
  return JSON.parse(text)
}

// ───────────────────────────────────────────────────────────────────────────────
// Parse a region listing page. Returns Map<slug, { river, site, city }>.
//
// Real markup we're matching against (verified for severo-zapad):
//   <a href="/gauge/neva-sankt-peterburg">
//     <span ...>р.Нева,</span>
//     Горный Институт, г.  Санкт-Петербург
//   </a>
function parseRegionPage(html) {
  const out = new Map()
  // Capture the entire <a href="/gauge/...">…</a> block — non-greedy.
  const re = /<a[^>]+href=["']\/gauge\/([a-z0-9_\-()]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    const slug = m[1].toLowerCase()
    if (slug.includes('/')) continue
    const inner = m[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
    // Examples we want to parse:
    //   "р.Нева, Горный Институт, г. Санкт-Петербург"
    //   "р. Волга, Тверь"  (sometimes no "г." prefix)
    //   "оз. Имандра, Куреньга"
    const riverMatch = inner.match(/^(?:р\.|р\s|оз\.|оз\s|вдхр\.|зал\.|пр\.)\s*([^,]+),\s*(.+)$/i)
    let river = '', tail = inner
    if (riverMatch) { river = riverMatch[1].trim(); tail = riverMatch[2].trim() }

    // Try to extract city ("г. Foo") at the end. Fall back to last comma-segment.
    let city = ''
    const cityMatch = tail.match(/(?:^|,)\s*г\.\s*([^,]+?)\s*$/i)
    if (cityMatch) {
      city = cityMatch[1].trim()
    } else {
      const parts = tail.split(',').map(s => s.trim()).filter(Boolean)
      city = parts[parts.length - 1] || tail
    }

    out.set(slug, { river, site: tail, city })
  }
  return out
}

// ───────────────────────────────────────────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }
  catch {
    return {
      slugs:     {},     // slug → { river, site, city }
      geocoded:  {},     // city → { lat, lng } | null
      done:      false,
    }
  }
}
function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// Deterministic small jitter from slug — same slug always lands on the same
// offset so the map markers stay stable across renders.
function jitterFromSlug(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = ((h << 5) - h + slug.charCodeAt(i)) | 0
  const a = (h & 0xffff) / 0xffff      // 0..1
  const b = ((h >> 16) & 0xffff) / 0xffff
  return { dLat: (a - 0.5) * 0.02, dLng: (b - 0.5) * 0.02 }   // ±0.01°
}

function writeStations(state) {
  const out = []
  for (const [slug, info] of Object.entries(state.slugs)) {
    const geo = state.geocoded[info.city]
    if (!geo) continue
    const j = jitterFromSlug(slug)
    out.push({
      id:      slug,
      name:    info.site || slug,
      river:   info.river || slug.split('-')[0],
      lat:     +(geo.lat + j.dLat).toFixed(5),
      lng:     +(geo.lng + j.dLng).toFixed(5),
      urlPath: `/gauge/${slug}`,
    })
  }
  out.sort((a, b) => a.id.localeCompare(b.id))
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2))
  return out.length
}

// ───────────────────────────────────────────────────────────────────────────────
async function stage1CollectSlugs(state) {
  const alreadyHave = Object.keys(state.slugs).length
  if (alreadyHave > 0) {
    console.log(`[stage1] resuming with ${alreadyHave} slugs cached`)
    return
  }
  for (const sub of RU_SUB_REGIONS) {
    const url = `${SITE}/region/russia/${sub}`
    process.stdout.write(`[stage1] ${sub.padEnd(15)} … `)
    try {
      const html = await fetchText(url)
      const parsed = parseRegionPage(html)
      for (const [slug, info] of parsed) state.slugs[slug] = info
      console.log(`+${parsed.size} (total ${Object.keys(state.slugs).length})`)
      saveState(state)
    } catch (e) {
      console.log(`FAIL — ${e.message}`)
    }
    await sleep(250)
  }
}

async function stage2GeocodeCities(state) {
  const cities = new Set()
  for (const info of Object.values(state.slugs)) {
    if (info.city) cities.add(info.city)
  }
  const todo = [...cities].filter(c => !(c in state.geocoded))
  console.log(`[stage2] ${todo.length} cities to geocode (cached: ${Object.keys(state.geocoded).length}, total: ${cities.size})`)

  let savedAt = Date.now()
  let done = 0
  for (const city of todo) {
    try {
      // Russia-only, top match. Nominatim accepts Cyrillic.
      const url = `${NOMINATIM}?` + new URLSearchParams({
        q:            city,
        countrycodes: 'ru',
        format:       'jsonv2',
        limit:        '1',
      }).toString()
      const arr = await fetchJson(url, { 'User-Agent': NOMINATIM_UA })
      if (Array.isArray(arr) && arr[0]) {
        state.geocoded[city] = { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) }
      } else {
        state.geocoded[city] = null  // remember the failure so we don't retry
      }
    } catch (e) {
      // Network blip — leave undefined so next run retries
    }
    done++
    if (done % 10 === 0) {
      const okN = Object.values(state.geocoded).filter(v => v).length
      process.stdout.write(`\r[stage2] ${done}/${todo.length} geocoded, ${okN} success`)
    }
    if (Date.now() - savedAt > CHECKPOINT_MS) {
      saveState(state); writeStations(state); savedAt = Date.now()
    }
    await sleep(1000 / NOMINATIM_RPS)   // strict 1 rps for Nominatim
  }
  saveState(state)
  console.log('')
}

// ───────────────────────────────────────────────────────────────────────────────
async function main() {
  const state = loadState()
  await stage1CollectSlugs(state)
  await stage2GeocodeCities(state)
  const total = writeStations(state)
  state.done = true
  saveState(state)
  console.log(`\n[done] wrote ${total} stations to src/data/all_stations.json`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
