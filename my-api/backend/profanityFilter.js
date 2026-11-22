// profanityFilter.js
// Детектор ненормативной лексики с защитой от транслита (латиницы), подмены символов (leetspeak) и разбиения пробелами/точками

const DIGRAPHS = [
  [/ya/gi, 'я'],
  [/yu/gi, 'ю'],
  [/yo/gi, 'ё'],
  [/shch/gi, 'щ'],
  [/sh/gi, 'ш'],
  [/ch/gi, 'ч'],
  [/zh/gi, 'ж'],
  [/ph/gi, 'ф'],
  [/kh/gi, 'х'],
  [/ts/gi, 'ц']
];

const SINGLE_CHARS = {
  'a': 'а', '@': 'а',
  'b': 'б', '6': 'б',
  'v': 'в', 'w': 'в', '8': 'в',
  'g': 'г',
  'd': 'д',
  'e': 'е', 'ё': 'е', '3': 'з',
  'z': 'з',
  'i': 'и', '1': 'и', '!': 'и', 'j': 'й',
  'k': 'к',
  'l': 'л',
  'm': 'м',
  'n': 'н',
  'o': 'о', '0': 'о',
  'p': 'п', // латинское p -> русское п
  'r': 'р',
  's': 'с', '$': 'с', '5': 'с', 'c': 'с',
  't': 'т', '7': 'т',
  'u': 'у', 'y': 'у',
  'f': 'ф',
  'h': 'х', 'x': 'х',
  '4': 'ч'
};

// Список исключений (невинные русские слова, содержащие буквосочетания 'еб', 'бля' и т.д.)
const WHITELIST = new Set([
  'ребенок', 'ребенка', 'ребенку', 'ребенком', 'ребенке', 'дети',
  'ребята', 'ребятам', 'ребятами',
  'гребля', 'гребле', 'греблей', 'греблю', 'гребли',
  'употребление', 'употребления', 'употреблению', 'употреблять', 'употребить',
  'колебание', 'колебания', 'колебаний', 'колебаниям',
  'стебель', 'стебля', 'стебли', 'стеблей',
  'хлеб', 'хлеба', 'хлебом', 'хлебе', 'хлебный', 'хлебница',
  'грабеж', 'грабежа', 'грабежом',
  'ястреб', 'ястреба', 'ястребы',
  'скребет', 'скрести', 'поскрести', 'соскрести',
  'рубль', 'рубля', 'рублей', 'рублям', 'рубли'
]);

function transliterate(str) {
  let s = str.toLowerCase();
  for (const [re, repl] of DIGRAPHS) {
    s = s.replace(re, repl);
  }
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    out += SINGLE_CHARS[ch] || ch;
  }
  return out;
}

// Регулярные выражения явных матерных корней
const BAD_ROOTS = [
  // хуй, хуя, хуе, хуи, похуй, нахуй, х*й
  /х[уy][йиеёяю]/i,
  /пох[уy]/i,
  /нах[уy]/i,
  /х[уy]й/i,
  /х[уy]я/i,
  /х[уy]е/i,

  // пизд, пиздец
  /п[еи]зд/i,

  // бляд, бля
  /бл[яя́][дьт]/i,
  /(?:^|[^а-яa-z0-9ё])бл[яя́](?:$|[^а-яa-z0-9ё])/i,

  // мудак, мудил
  /муд[аиое][кчл]/i,

  // сука, сучк, сучар
  /(?:^|[^а-яa-z0-9ё])с[уy]к[аиеоуы](?:$|[^а-яa-z0-9ё])/i,
  /с[уy]чк[аиеоу]/i,
  /с[уy]чар/i,

  // гондон, гандон
  /г[ао]нд[оа]н/i,

  // залупа
  /зал[уy]п/i,

  // ебать, ебли, ебу, заеб, выеб, уеб, проеб, еблан
  /ебат/i,
  /ебут/i,
  /ебал/i,
  /ебис/i,
  /заеб/i,
  /выеб/i,
  /уеб/i,
  /проеб/i,
  /въеб/i,
  /съеб/i,
  /доеб/i,
  /поеб/i,
  /наеб/i,
  /еблан/i,
  /ебуч/i,
  /ебан/i,

  // английские ругательства
  /(?:^|[^a-z])fuck(?:$|[^a-z])/i,
  /(?:^|[^a-z])bitch(?:$|[^a-z])/i,
  /(?:^|[^a-z])cunt(?:$|[^a-z])/i,
  /(?:^|[^a-z])dick(?:$|[^a-z])/i,
  /(?:^|[^a-z])asshole(?:$|[^a-z])/i
];

export function containsProfanity(text) {
  if (!text || typeof text !== "string") return false;
  const rawLower = text.toLowerCase();

  // 1. Прямая проверка английских ругательств
  if (/(?:^|[^a-z])(fuck|bitch|cunt|dick|asshole)(?:$|[^a-z])/i.test(rawLower)) {
    return true;
  }

  // 2. Транслитерация текста в кириллицу
  const translit = transliterate(rawLower);

  // 3. Проверка отдельных слов с учетом белого списка
  const words = translit.split(/[^а-яa-z0-9ё]+/i).filter(Boolean);
  for (const word of words) {
    const collapsed = word.replace(/(.)\1+/g, "$1");

    if (WHITELIST.has(word) || WHITELIST.has(collapsed)) {
      continue;
    }

    for (const re of BAD_ROOTS) {
      if (re.test(word) || re.test(collapsed)) {
        return true;
      }
    }
  }

  // 4. Проверка сплошного текста (когда между буквами ставят точки или пробелы "п.и.з.д.а", "х у й")
  const lettersOnly = translit.replace(/[^а-яa-zё]/g, "");
  const collapsedAll = lettersOnly.replace(/(.)\1+/g, "$1");

  // Исключаем совпадение если весь текст целиком - слово из белого списка
  if (!WHITELIST.has(lettersOnly) && !WHITELIST.has(collapsedAll)) {
    for (const re of BAD_ROOTS) {
      if (re.test(lettersOnly) || re.test(collapsedAll)) {
        // Проверяем, не является ли это частью белого слова
        let inWhitelist = false;
        for (const wl of WHITELIST) {
          if (lettersOnly.includes(wl)) {
            inWhitelist = true;
            break;
          }
        }
        if (!inWhitelist) {
          return true;
        }
      }
    }
  }

  return false;
}

export function validateProfanity(text, fieldName = "Поле") {
  if (containsProfanity(text)) {
    throw new Error(`${fieldName} содержит недопустимые выражения или ненормативную лексику. Пожалуйста, соблюдайте правила приличия.`);
  }
}
