// Top-100 Russian cities by population.
// Coordinates are good enough for city-center markers on a zoom-4..18 map.
//   • `id`     — short slug, used as the LocalStorage cache key
//   • `name`   — romanized form, useful for any English-only consumer
//   • `nameRu` — what we render in popups (and what WeatherAPI also returns
//                when called with lang=ru)
//   • `lat`/`lng` — what we send as `q=lat,lng` to skip name-based geocoding.

/**
 * @typedef {Object} RussiaCity
 * @property {string} id
 * @property {string} name
 * @property {string} nameRu
 * @property {number} lat
 * @property {number} lng
 */

/** @type {RussiaCity[]} */
export const russiaCities = [
  // ── 1–10 (largest by population) ──────────────────────────────────────────
  { id: 'moscow',         name: 'Moscow',              nameRu: 'Москва',              lat: 55.7558, lng: 37.6173 },
  { id: 'saint-petersburg', name: 'Saint Petersburg', nameRu: 'Санкт-Петербург',      lat: 59.9343, lng: 30.3351 },
  { id: 'novosibirsk',    name: 'Novosibirsk',         nameRu: 'Новосибирск',         lat: 55.0084, lng: 82.9357 },
  { id: 'yekaterinburg',  name: 'Yekaterinburg',       nameRu: 'Екатеринбург',        lat: 56.8389, lng: 60.6057 },
  { id: 'kazan',          name: 'Kazan',               nameRu: 'Казань',              lat: 55.7887, lng: 49.1221 },
  { id: 'nizhny-novgorod',name: 'Nizhny Novgorod',     nameRu: 'Нижний Новгород',     lat: 56.3287, lng: 44.0020 },
  { id: 'chelyabinsk',    name: 'Chelyabinsk',         nameRu: 'Челябинск',           lat: 55.1644, lng: 61.4368 },
  { id: 'samara',         name: 'Samara',              nameRu: 'Самара',              lat: 53.2415, lng: 50.2212 },
  { id: 'omsk',           name: 'Omsk',                nameRu: 'Омск',                lat: 54.9885, lng: 73.3242 },
  { id: 'rostov-on-don',  name: 'Rostov-on-Don',       nameRu: 'Ростов-на-Дону',      lat: 47.2357, lng: 39.7015 },

  // ── 11–20 ─────────────────────────────────────────────────────────────────
  { id: 'ufa',            name: 'Ufa',                 nameRu: 'Уфа',                 lat: 54.7388, lng: 55.9721 },
  { id: 'krasnoyarsk',    name: 'Krasnoyarsk',         nameRu: 'Красноярск',          lat: 56.0184, lng: 92.8672 },
  { id: 'voronezh',       name: 'Voronezh',            nameRu: 'Воронеж',             lat: 51.6720, lng: 39.1843 },
  { id: 'perm',           name: 'Perm',                nameRu: 'Пермь',               lat: 58.0105, lng: 56.2294 },
  { id: 'volgograd',      name: 'Volgograd',           nameRu: 'Волгоград',           lat: 48.7080, lng: 44.5133 },
  { id: 'krasnodar',      name: 'Krasnodar',           nameRu: 'Краснодар',           lat: 45.0355, lng: 38.9753 },
  { id: 'saratov',        name: 'Saratov',             nameRu: 'Саратов',             lat: 51.5331, lng: 46.0344 },
  { id: 'tyumen',         name: 'Tyumen',              nameRu: 'Тюмень',              lat: 57.1530, lng: 65.5343 },
  { id: 'tolyatti',       name: 'Tolyatti',            nameRu: 'Тольятти',            lat: 53.5078, lng: 49.4204 },
  { id: 'izhevsk',        name: 'Izhevsk',             nameRu: 'Ижевск',              lat: 56.8527, lng: 53.2114 },

  // ── 21–30 ─────────────────────────────────────────────────────────────────
  { id: 'barnaul',        name: 'Barnaul',             nameRu: 'Барнаул',             lat: 53.3478, lng: 83.7798 },
  { id: 'ulyanovsk',      name: 'Ulyanovsk',           nameRu: 'Ульяновск',           lat: 54.3142, lng: 48.4031 },
  { id: 'irkutsk',        name: 'Irkutsk',             nameRu: 'Иркутск',             lat: 52.2870, lng: 104.3050 },
  { id: 'khabarovsk',     name: 'Khabarovsk',          nameRu: 'Хабаровск',           lat: 48.4827, lng: 135.0840 },
  { id: 'yaroslavl',      name: 'Yaroslavl',           nameRu: 'Ярославль',           lat: 57.6261, lng: 39.8845 },
  { id: 'vladivostok',    name: 'Vladivostok',         nameRu: 'Владивосток',         lat: 43.1198, lng: 131.8869 },
  { id: 'makhachkala',    name: 'Makhachkala',         nameRu: 'Махачкала',           lat: 42.9849, lng: 47.5047 },
  { id: 'tomsk',          name: 'Tomsk',               nameRu: 'Томск',               lat: 56.4977, lng: 84.9744 },
  { id: 'orenburg',       name: 'Orenburg',            nameRu: 'Оренбург',            lat: 51.7682, lng: 55.0974 },
  { id: 'kemerovo',       name: 'Kemerovo',            nameRu: 'Кемерово',            lat: 55.3331, lng: 86.0833 },

  // ── 31–40 ─────────────────────────────────────────────────────────────────
  { id: 'novokuznetsk',   name: 'Novokuznetsk',        nameRu: 'Новокузнецк',         lat: 53.7596, lng: 87.1216 },
  { id: 'ryazan',         name: 'Ryazan',              nameRu: 'Рязань',              lat: 54.6196, lng: 39.7444 },
  { id: 'astrakhan',      name: 'Astrakhan',           nameRu: 'Астрахань',           lat: 46.3497, lng: 48.0408 },
  { id: 'naberezhnye-chelny', name: 'Naberezhnye Chelny', nameRu: 'Набережные Челны', lat: 55.7558, lng: 52.4063 },
  { id: 'penza',          name: 'Penza',               nameRu: 'Пенза',               lat: 53.2007, lng: 45.0046 },
  { id: 'lipetsk',        name: 'Lipetsk',             nameRu: 'Липецк',              lat: 52.6088, lng: 39.5992 },
  { id: 'kirov',          name: 'Kirov',               nameRu: 'Киров',               lat: 58.6035, lng: 49.6679 },
  { id: 'cheboksary',     name: 'Cheboksary',          nameRu: 'Чебоксары',           lat: 56.1326, lng: 47.2519 },
  { id: 'tula',           name: 'Tula',                nameRu: 'Тула',                lat: 54.1961, lng: 37.6182 },
  { id: 'kaliningrad',    name: 'Kaliningrad',         nameRu: 'Калининград',         lat: 54.7104, lng: 20.4522 },

  // ── 41–50 ─────────────────────────────────────────────────────────────────
  { id: 'balashikha',     name: 'Balashikha',          nameRu: 'Балашиха',            lat: 55.7967, lng: 37.9381 },
  { id: 'kursk',          name: 'Kursk',               nameRu: 'Курск',               lat: 51.7378, lng: 36.1873 },
  { id: 'stavropol',      name: 'Stavropol',           nameRu: 'Ставрополь',          lat: 45.0444, lng: 41.9690 },
  { id: 'ulan-ude',       name: 'Ulan-Ude',            nameRu: 'Улан-Удэ',            lat: 51.8335, lng: 107.5840 },
  { id: 'tver',           name: 'Tver',                nameRu: 'Тверь',               lat: 56.8587, lng: 35.9176 },
  { id: 'magnitogorsk',   name: 'Magnitogorsk',        nameRu: 'Магнитогорск',        lat: 53.4072, lng: 58.9794 },
  { id: 'sochi',          name: 'Sochi',               nameRu: 'Сочи',                lat: 43.5855, lng: 39.7231 },
  { id: 'ivanovo',        name: 'Ivanovo',             nameRu: 'Иваново',             lat: 57.0001, lng: 40.9739 },
  { id: 'bryansk',        name: 'Bryansk',             nameRu: 'Брянск',              lat: 53.2434, lng: 34.3640 },
  { id: 'belgorod',       name: 'Belgorod',            nameRu: 'Белгород',            lat: 50.5953, lng: 36.5871 },

  // ── 51–60 ─────────────────────────────────────────────────────────────────
  { id: 'surgut',         name: 'Surgut',              nameRu: 'Сургут',              lat: 61.2540, lng: 73.3960 },
  { id: 'vladimir',       name: 'Vladimir',            nameRu: 'Владимир',            lat: 56.1290, lng: 40.4070 },
  { id: 'nizhny-tagil',   name: 'Nizhny Tagil',        nameRu: 'Нижний Тагил',        lat: 57.9098, lng: 59.9682 },
  { id: 'arkhangelsk',    name: 'Arkhangelsk',         nameRu: 'Архангельск',         lat: 64.5401, lng: 40.5128 },
  { id: 'chita',          name: 'Chita',               nameRu: 'Чита',                lat: 52.0335, lng: 113.4990 },
  { id: 'kaluga',         name: 'Kaluga',              nameRu: 'Калуга',              lat: 54.5293, lng: 36.2754 },
  { id: 'smolensk',       name: 'Smolensk',            nameRu: 'Смоленск',            lat: 54.7826, lng: 32.0453 },
  { id: 'volzhsky',       name: 'Volzhsky',            nameRu: 'Волжский',            lat: 48.7841, lng: 44.7521 },
  { id: 'cherepovets',    name: 'Cherepovets',         nameRu: 'Череповец',           lat: 59.1342, lng: 37.9094 },
  { id: 'saransk',        name: 'Saransk',             nameRu: 'Саранск',             lat: 54.1838, lng: 45.1834 },

  // ── 61–70 ─────────────────────────────────────────────────────────────────
  { id: 'vologda',        name: 'Vologda',             nameRu: 'Вологда',             lat: 59.2239, lng: 39.8840 },
  { id: 'kurgan',         name: 'Kurgan',              nameRu: 'Курган',              lat: 55.4500, lng: 65.3333 },
  { id: 'orel',           name: 'Oryol',               nameRu: 'Орёл',                lat: 52.9651, lng: 36.0786 },
  { id: 'yakutsk',        name: 'Yakutsk',             nameRu: 'Якутск',              lat: 62.0355, lng: 129.6755 },
  { id: 'podolsk',        name: 'Podolsk',             nameRu: 'Подольск',            lat: 55.4297, lng: 37.5450 },
  { id: 'grozny',         name: 'Grozny',              nameRu: 'Грозный',             lat: 43.3179, lng: 45.6949 },
  { id: 'murmansk',       name: 'Murmansk',            nameRu: 'Мурманск',            lat: 68.9585, lng: 33.0827 },
  { id: 'tambov',         name: 'Tambov',              nameRu: 'Тамбов',              lat: 52.7212, lng: 41.4523 },
  { id: 'petrozavodsk',   name: 'Petrozavodsk',        nameRu: 'Петрозаводск',        lat: 61.7891, lng: 34.3592 },
  { id: 'sterlitamak',    name: 'Sterlitamak',         nameRu: 'Стерлитамак',         lat: 53.6306, lng: 55.9305 },

  // ── 71–80 ─────────────────────────────────────────────────────────────────
  { id: 'nizhnevartovsk', name: 'Nizhnevartovsk',      nameRu: 'Нижневартовск',       lat: 60.9385, lng: 76.5670 },
  { id: 'kostroma',       name: 'Kostroma',            nameRu: 'Кострома',            lat: 57.7677, lng: 40.9269 },
  { id: 'novorossiysk',   name: 'Novorossiysk',        nameRu: 'Новороссийск',        lat: 44.7239, lng: 37.7679 },
  { id: 'khimki',         name: 'Khimki',              nameRu: 'Химки',               lat: 55.8970, lng: 37.4297 },
  { id: 'yoshkar-ola',    name: 'Yoshkar-Ola',         nameRu: 'Йошкар-Ола',          lat: 56.6388, lng: 47.8908 },
  { id: 'taganrog',       name: 'Taganrog',            nameRu: 'Таганрог',            lat: 47.2363, lng: 38.8969 },
  { id: 'komsomolsk-on-amur', name: 'Komsomolsk-on-Amur', nameRu: 'Комсомольск-на-Амуре', lat: 50.5500, lng: 137.0167 },
  { id: 'syktyvkar',      name: 'Syktyvkar',           nameRu: 'Сыктывкар',           lat: 61.6688, lng: 50.8364 },
  { id: 'nalchik',        name: 'Nalchik',             nameRu: 'Нальчик',             lat: 43.4806, lng: 43.6072 },
  { id: 'shakhty',        name: 'Shakhty',             nameRu: 'Шахты',               lat: 47.7090, lng: 40.2156 },

  // ── 81–90 ─────────────────────────────────────────────────────────────────
  { id: 'dzerzhinsk',     name: 'Dzerzhinsk',          nameRu: 'Дзержинск',           lat: 56.2378, lng: 43.4623 },
  { id: 'bratsk',         name: 'Bratsk',              nameRu: 'Братск',              lat: 56.1325, lng: 101.6140 },
  { id: 'orsk',           name: 'Orsk',                nameRu: 'Орск',                lat: 51.2350, lng: 58.5640 },
  { id: 'angarsk',        name: 'Angarsk',             nameRu: 'Ангарск',             lat: 52.5435, lng: 103.8880 },
  { id: 'engels',         name: 'Engels',              nameRu: 'Энгельс',             lat: 51.4824, lng: 46.1090 },
  { id: 'korolev',        name: 'Korolyov',            nameRu: 'Королёв',             lat: 55.9244, lng: 37.8278 },
  { id: 'veliky-novgorod',name: 'Veliky Novgorod',     nameRu: 'Великий Новгород',    lat: 58.5215, lng: 31.2755 },
  { id: 'mytishchi',      name: 'Mytishchi',           nameRu: 'Мытищи',              lat: 55.9116, lng: 37.7307 },
  { id: 'lyubertsy',      name: 'Lyubertsy',           nameRu: 'Люберцы',             lat: 55.6766, lng: 37.8949 },
  { id: 'yuzhno-sakhalinsk', name: 'Yuzhno-Sakhalinsk', nameRu: 'Южно-Сахалинск',     lat: 46.9588, lng: 142.7386 },

  // ── 91–100 ────────────────────────────────────────────────────────────────
  { id: 'petropavlovsk-kamchatsky', name: 'Petropavlovsk-Kamchatsky', nameRu: 'Петропавловск-Камчатский', lat: 53.0241, lng: 158.6428 },
  { id: 'salekhard',      name: 'Salekhard',           nameRu: 'Салехард',            lat: 66.5299, lng: 66.6131 },
  { id: 'anadyr',         name: 'Anadyr',              nameRu: 'Анадырь',             lat: 64.7337, lng: 177.4948 },
  { id: 'magadan',        name: 'Magadan',             nameRu: 'Магадан',             lat: 59.5612, lng: 150.8085 },
  { id: 'norilsk',        name: 'Norilsk',             nameRu: 'Норильск',            lat: 69.3558, lng: 88.1893 },
  { id: 'khanty-mansiysk',name: 'Khanty-Mansiysk',     nameRu: 'Ханты-Мансийск',      lat: 61.0042, lng: 69.0019 },
  { id: 'birobidzhan',    name: 'Birobidzhan',         nameRu: 'Биробиджан',          lat: 48.7942, lng: 132.9241 },
  { id: 'naryan-mar',     name: 'Naryan-Mar',          nameRu: 'Нарьян-Мар',          lat: 67.6394, lng: 53.0067 },
  { id: 'salavat',        name: 'Salavat',             nameRu: 'Салават',             lat: 53.3614, lng: 55.9244 },
  { id: 'pskov',          name: 'Pskov',               nameRu: 'Псков',               lat: 57.8136, lng: 28.3496 },
]
