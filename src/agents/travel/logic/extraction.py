"""
Deterministic extraction параметров из сообщения пользователя.

Модуль преобразует естественный язык в :class:`UserRequestPatch`.
Он не вызывает LLM, не ищет билеты и отели и не принимает решений за
пользователя — только извлекает то, что явно присутствует в тексте.

Ключевые модели :class:`UserRequest` описаны в ``domain.request``.
``None`` в патче означает «значение не найдено в текущем сообщении», а не
«стереть старое значение». Для явной отмены используются поля
``removed_*`` и ``clear_fields``.
"""

from __future__ import annotations

import re
from datetime import date, timedelta
from difflib import get_close_matches

from agents.travel.tools import mock_dataset as ds
from domain.common import Currency, Month, Season, TransportType
from domain.constraint import Constraint
from domain.planning import UserRequestPatch
from domain.preference import Preference, Priority

# --- Словари месяцев и сезонов --------------------------------------------
_MONTH_TOKENS: dict[Month, list[str]] = {
    Month.JANUARY: ["январ", "january", "jan"],
    Month.FEBRUARY: ["феврал", "february", "feb"],
    Month.MARCH: ["март", "march", "mar"],
    Month.APRIL: ["апрел", "april", "apr"],
    Month.MAY: ["май", "мая", "may"],
    Month.JUNE: ["июн", "june", "jun"],
    Month.JULY: ["июл", "july", "jul"],
    Month.AUGUST: ["август", "august", "aug"],
    Month.SEPTEMBER: ["сентябр", "september", "sep"],
    Month.OCTOBER: ["октябр", "october", "oct"],
    Month.NOVEMBER: ["ноябр", "november", "nov"],
    Month.DECEMBER: ["декабр", "december", "dec"],
}

_SEASON_TOKENS: dict[Season, list[str]] = {
    Season.WINTER: ["зим", "winter"],
    Season.SPRING: ["весн", "spring"],
    Season.SUMMER: ["лет", "summer"],
    Season.AUTUMN: ["осен", "autumn", "fall"],
}

_MONTH_NUMBER: dict[Month, int] = {
    Month.JANUARY: 1,
    Month.FEBRUARY: 2,
    Month.MARCH: 3,
    Month.APRIL: 4,
    Month.MAY: 5,
    Month.JUNE: 6,
    Month.JULY: 7,
    Month.AUGUST: 8,
    Month.SEPTEMBER: 9,
    Month.OCTOBER: 10,
    Month.NOVEMBER: 11,
    Month.DECEMBER: 12,
}

# Токены, из которых агент понимает «море / пляж» и т.п.
_VIBE_TOKENS: dict[str, list[str]] = {
    "beach": ["пляж", "морск", "море", "beach"],
    "history": ["истор", "древн", "history", "историческ"],
    "architecture": ["архитектур", "architecture"],
    "nature": ["природ", "nature", "горы", "лес"],
    "culture": ["культур", "culture", "музе"],
    "food": ["еда", "кухн", "гастроном", "food", "ресторан"],
    "nightlife": ["ночн", "тусов", "вечерин", "nightlife", "клуб"],
    "relax": ["спокойн", "тих", "расслаб", "relax", "уединен"],
    "romance": ["романт", "romance", "свадь", "медовый"],
    "family": ["семь", "ребен", "ребён", "дети", "детей", "детск", "family"],
    "adventure": ["приключ", "adventure", "экстрим"],
    "shopping": ["шопинг", "shopping", "магазин"],
    "warm_weather": ["тепл", "жарк", "тёпл"],
    "wellness": ["спа ", "wellness", "оздоров", "йог"],
    "city": ["город", "city"],
    "canals": ["канал", "canals"],
    "sea": ["море", "морск"],
    "all_inclusive": ["все включено", "всё включено", "all inclusive"],
    "northern_lights": ["северн", "сияни"],
}

# Токены ограничений (constraints) - применяются ко всему пакету (в т.ч. перелетам)
_CONSTRAINT_TOKENS: dict[str, list[str]] = {
    "with_child": ["с ребен", "с ребён", "с дет", "с малыш", "ребен", "ребён"],
    "limited_mobility": ["не могу много ходить", "ограниченная мобильность", "маломобильн", "инвалид", "на коляске", "в коляске"],
    "accessible_hotel": ["доступн", "безбарьерн", "accessible"],
    "no_night_flights": ["без ночных", "не ночн", "днем", "днём"],
    "no_stops": ["без пересад", "прямой рейс", "прямой перелет", "no stops"],
    "vegetarian": ["вегетариан", "vegetarian"],
    "with_baggage": ["багаж", "с багажом", "нужен багаж", "чемодан"],
    "refundable_ticket": ["возвратн", "сдать билет", "отмена билета", "вернуть билет"],
}

_HOTEL_REQ_TOKENS: dict[str, list[str]] = {
    "center": ["в центре", "центр", "center"],
    "pool": ["бассейн", "pool"],
    "breakfast": ["завтрак", "breakfast", "питание"],
    "sea_view": ["вид на море", "sea view", "у моря", "первая линия", "на берегу", "рядом с морем", "возле моря"],
    "spa": ["спа", "spa"],
    "all_inclusive": ["все включено", "всё включено", "all inclusive"],
    "stars_3": ["3 звезды", "3 звезд", "3★", "3 *", "трехзвезд", "трёхзвезд"],
    "stars_4": ["4 звезды", "4 звезд", "4★", "4 *", "четырехзвезд", "четырёхзвезд"],
    "stars_5": ["5 звезд", "5 звезд", "5★", "5 *", "пятизвезд"],
    "pet_friendly": [
        "животн", "питомц", "собак", "кошк", "котик", "котейк",
        "щенок", "щенк", "песик", "пёсик", "котен", "котён", "pet",
        "кот", "кота", "коту", "котом", "коте", "коты", "котов"
    ],
    "free_cancellation": [
        "бесплатной отмен", "бесплатная отмена", "бесплатную отмену",
        "отмена брони", "отмене брони", "вернуть деньги за отель", "возвратн"
    ],
}

_CURRENCY_TOKENS: dict[Currency, list[str]] = {
    Currency.EUR: ["евро", "eur", "€"],
    Currency.USD: ["доллар", "usd", "$"],
    Currency.RUB: ["рубл", "rub", "₽", "тыс", "тысяч"],
    Currency.TRY: ["лира", "try", "₺"],
    Currency.AED: ["дирхам", "aed"],
    Currency.GEL: ["лари", "gel"],
    Currency.THB: ["бат", "thb"],
    Currency.EGP: ["фунт", "egp"],
}

# Числительные и коллективные формы (после нормализации ё → е).
_NUM_WORDS: dict[str, int] = {
    "один": 1, "одна": 1, "одно": 1, "одного": 1,
    "два": 2, "две": 2, "двух": 2, "двоих": 2, "двое": 2,
    "три": 3, "трех": 3, "троих": 3, "трое": 3,
    "четыре": 4, "четырех": 4, "четверых": 4, "четверо": 4,
    "пять": 5, "пяти": 5, "пятеро": 5, "пятерых": 5,
    "шесть": 6, "шестеро": 6,
    "семь": 7, "семеро": 7,
    "восемь": 8, "восьмеро": 8,
    "девять": 9, "десять": 10,
    "вдвоем": 2, "втроем": 3, "вчетвером": 4, "впятером": 5, "вшестером": 6,
}

# Коллективные слова всегда описывают людей.
_COLLECTIVE_WORDS = {"двое", "двоих", "трое", "троих", "четверо", "четверых",
                     "пятеро", "пятерых", "шестеро", "семеро",
                     "вдвоем", "втроем", "вчетвером", "впятером", "вшестером"}

# Инструментальные формы числительных для «с двумя друзьями».
_INSTRUMENTAL_NUM = {
    "двумя": 2, "тремя": 3, "четырьмя": 4, "пятью": 5, "шестью": 6,
}

_COUNT_TOKEN = (
    r"(\d+|один|одна|одно|двумя|тремя|четырьмя|пятью|шестью|"
    r"два|две|двух|двоих|двое|три|трех|троих|трое|"
    r"четыре|четырех|четверых|четверо|пять|пяти|пятеро|пятерых|"
    r"шесть|шестеро|семь|семеро|восемь|восьмеро|девять|десять)"
)

_TRAVEL_CONTEXT = (
    "полеч", "полечу", "полетим", "полетим", "поед", "поеду", "едем",
    "едим", "лечу", "летим", "отправл", "поездк", "возьму", "беру",
)

_COMPANION_RE = re.compile(
    r"\b(?:девушк\w*|жен\w*|муж\w*|парн\w*|"
    r"друг|друга|другу|другом|друге|друзья|друзей|друзьям|друзьями|друзьях|"
    r"подруг\w*|ребен\w*|ребён\w*|сын\w*|дочер\w*|дочк\w*|"
    r"мам\w*|пап\w*|брат\w*|сестр\w*|бабушк\w*|дедушк\w*|коллег\w*)\b"
)

_NEGATION_MARKERS = (
    "не полет", "не поед", "не едет", "не летит", "не берет", "не берем",
    "не возьму", "останется", "остается", "останутся", "дома", "не нужен",
    "не нужна", "не хочу с",
)


def _normalize(text: str) -> str:
    """Привести текст к нижнему регистру и унифицировать ё/е, пробелы."""
    return (text or "").lower().replace("ё", "е").replace("\u00a0", " ")


def _contains(lowered: str, token: str) -> bool:
    """Проверить наличие токена, не путая короткие слова с частью других.

    «спа» не срабатывает на «спасибо», а «кот» — на «который».
    """
    base = token.strip()
    # Слова, требующие строгой границы слова \b
    exact_match_words = {
        "спа", "spa", "кот", "кота", "коту", "котом", "коте",
        "коты", "котов", "котам", "котами", "pet"
    }
    if base in exact_match_words:
        return re.search(rf"\b{re.escape(base)}\b", lowered) is not None
    return token in lowered


def _detect_transport(text: str) -> TransportType | None:
    lowered = _normalize(text)
    # Поезда и аэрофобия проверяются первыми
    train_triggers = [
        "поезд", "train", "жд", "ж/д", "поедем на поезде", "боюсь летать",
        "боязнь перелетов", "боязнь перелётов", "аэрофоби", "только не самолет",
        "без самолетов", "только поездом"
    ]
    if any(t in lowered for t in train_triggers):
        return TransportType.TRAIN

    if any(t in lowered for t in ["самолет", "самолёт", "авиа", "plane", "fly", "перелет", "перелёт", "летим", "лечу", "полети"]):
        return TransportType.PLANE

    if any(t in lowered for t in ["автобус", "bus"]):
        return TransportType.BUS
    if any(t in lowered for t in ["машин", "авто", "car"]):
        return TransportType.CAR
    return None


def _extract_months(text: str) -> list[Month] | None:
    lowered = _normalize(text)
    found: list[Month] = []
    for month, tokens in _MONTH_TOKENS.items():
        if any(tok in lowered for tok in tokens):
            found.append(month)
    return found or None


def _extract_seasons(text: str) -> list[Season] | None:
    lowered = _normalize(text)
    found: list[Season] = []
    for season, tokens in _SEASON_TOKENS.items():
        if any(tok in lowered for tok in tokens):
            found.append(season)
    return found or None


def _parse_count(token: str) -> int | None:
    token = token.strip()
    if token.isdigit():
        return int(token)
    return _NUM_WORDS.get(token) or _INSTRUMENTAL_NUM.get(token)


def _count_before(lowered: str, noun_pattern: str) -> int | None:
    """Найти «<число> <существительное>» и вернуть число."""
    m = re.search(rf"{_COUNT_TOKEN}\s*(?:{noun_pattern})", lowered)
    if not m:
        return None
    return _parse_count(m.group(1))


def _negated(lowered: str, start: int, end: int) -> bool:
    """Есть ли рядом с упоминанием отрицание/маркер «останется дома»."""
    left = lowered[max(0, start - 45):start]
    right = lowered[end:end + 45]
    window = left + " " + right
    return any(marker in window for marker in _NEGATION_MARKERS)


def _companion_count(lowered: str) -> int | None:
    """Сколько сопровождающих явно едет вместе с пользователем."""
    total: int | None = None
    for match in _COMPANION_RE.finditer(lowered):
        start, end = match.span()
        context = lowered[max(0, start - 25):end]
        if not re.search(r"(?:\bс\b|вместе|с собой|возьму|беру)", context):
            continue
        if _negated(lowered, start, end):
            continue
        before = lowered[max(0, start - 20):start]
        num = re.search(r"(\d+|двумя|тремя|четырьмя|пятью|шестью)\s*$", before)
        if num:
            total = (total or 0) + (_parse_count(num.group(1)) or 1)
        else:
            total = (total or 0) + 1
    return total


def _extract_travelers(
        text: str,
) -> tuple[int | None, tuple[int, int] | None, int | None, int | None]:
    """Извлечь число путешественников, диапазон и разбиение взрослые/дети.

    Возвращает ``(travelers, traveler_range, adults, children)``.
    """
    lowered = _normalize(text)

    # 1. Явное разбиение «трое взрослых и один ребёнок».
    adults = _count_before(lowered, r"взросл\w*")
    children = _count_before(lowered, r"(?:ребен\w*|ребён\w*|дет(?:ей|и|ск\w*))")
    if adults is not None or children is not None:
        total = (adults or 0) + (children or 0)
        if total > 0:
            return total, None, adults, children

    # 2. Диапазон «от 2 до 5», «2-4 человека» — только при маркере людей.
    people_markers = [
        "нас", "человек", "чел", "взросл", "гост", "путешеств",
        "едет", "едим", "поедем", "поедет", "будет", "поедут",
    ]
    has_people_context = any(k in lowered for k in people_markers)

    range_match = re.search(r"(?:от\s+)?(\d+)\s*(?:до|[-–—])\s*(\d+)(\s+[а-яёa-z]+)?", lowered)
    if range_match and has_people_context:
        lo, hi = int(range_match.group(1)), int(range_match.group(2))
        trailing = (range_match.group(3) or "").strip()
        is_date_like = any(
            tok in trailing for toks in _MONTH_TOKENS.values() for tok in toks
        )
        if not is_date_like and 1 <= lo <= hi <= 20:
            return None, (lo, hi), None, None

    # 3. Коллективные формы («нас двое», «вдвоём»).
    for word in _COLLECTIVE_WORDS:
        if re.search(rf"\b{word}\b", lowered):
            return _NUM_WORDS[word], None, None, None

    # 4. Числительные при наличии контекста людей.
    for word, value in _NUM_WORDS.items():
        if re.search(rf"\b{word}\b", lowered):
            if has_people_context:
                return value, None, None, None
            # «Я полечу один» — одиночная поездка при явном travel-контексте.
            if word in {"один", "одна"} and any(k in lowered for k in _TRAVEL_CONTEXT):
                return value, None, None, None

    # 5. «2 человека», «5 взрослых».
    num_match = re.search(r"(\d+)\s*(?:человек|чел\.?|взросл|гост|путешеств)", lowered)
    if num_match:
        return int(num_match.group(1)), None, None, None

    # 6. «нас 4».
    people_context = re.search(r"(?:нас|наших)\s+(\d+)", lowered)
    if people_context:
        return int(people_context.group(1)), None, None, None

    # 7. Сопровождающие: «с девушкой», «с женой и ребёнком».
    companions = _companion_count(lowered)
    if companions:
        return 1 + companions, None, None, None

    return None, None, None, None


def _extract_duration(text: str) -> int | None:
    lowered = _normalize(text)
    if re.search(r"\bнедел", lowered):
        weeks = re.search(r"(\d+)\s*недел", lowered)
        if weeks:
            return int(weeks.group(1)) * 7
        return 7
    m = re.search(r"(?:на\s+)?(\d+)\s*(?:дн|ден|ноч|night|day)", lowered)
    if m:
        return int(m.group(1))
    return None


def _extract_budget(
        text: str,
) -> tuple[float | None, tuple[float, float] | None, Currency | None]:
    lowered = _normalize(text)
    currency = None
    for cur, tokens in _CURRENCY_TOKENS.items():
        if any(tok in lowered for tok in tokens):
            currency = cur
            break

    has_k_shortcut = bool(re.search(r"\d+\s*[кk]\b", lowered))
    if not currency and has_k_shortcut:
        currency = Currency.RUB

    def normalize(num_str: str, match_context: str) -> float:
        value = float(num_str.replace(" ", "").replace(",", "."))
        # Проверяем суффикс тысяч без жесткого требования цифры внутри суффикса
        ctx = match_context.lower()
        if any(w in ctx for w in ["тысяч", "тыс", "к", "k"]):
            if value < 1000:
                value *= 1000
        return value

    budget_words = [
        "бюджет", "лимит", "потрат", "потрач",
        "тысяч", "тыс", "евро", "доллар", "рубл", "€", "$", "₽"
    ]
    has_budget_context = any(k in lowered for k in budget_words) or has_k_shortcut
    non_budget_units = (
        r"^\s*(?:звезд|\*|★|чел|гост|взросл|дет|ребен|дн|ден|ноч|сут|лет|год|"
        r"пачк\w*|штук\w*|шт\b|бутыл\w*|короб\w*|бан\w*|мешк\w*|доширак\w*)"
    )

    if has_budget_context:
        for rng in re.finditer(
                r"(\d[\d\s]*)\s*(?:[-–—]|и|до)\s*(\d[\d\s]*)\s*"
                r"(тысяч\w*|тыс\w*|[кk]\b|евро|доллар\w*|рубл\w*|€|\$|₽)?",
                lowered,
        ):
            tail = lowered[rng.end():rng.end() + 15]
            if re.match(non_budget_units, tail):
                continue
            lo_raw, hi_raw, unit = rng.group(1), rng.group(2), rng.group(3) or ""
            lo = normalize(lo_raw, unit or rng.group(0))
            hi = normalize(hi_raw, unit or rng.group(0))
            if 0 < lo < hi:
                return None, (lo, hi), currency

    money_unit = r"(?:тысяч\w*|тыс\w*|[кk]\b|евро|доллар\w*|рубл\w*|€|\$|₽)"
    for single in re.finditer(rf"(\d[\d\s]*)\s*({money_unit})", lowered):
        tail = lowered[single.end():single.end() + 15]
        if re.match(non_budget_units, tail):
            continue
        num = normalize(single.group(1), single.group(2))
        if num > 0:
            return num, None, currency

    # Строгие границы \b вокруг предлогов, чтобы "пересадок" не триггерило "до"
    marker = re.search(
        r"\b(?:бюджет|лимит|потрат\w*|потрач\w*|до|около|примерно|максимум)\b\D{0,12}?(\d[\d\s]*)",
        lowered,
    )
    if marker:
        tail = lowered[marker.end():marker.end() + 15]
        if not re.match(non_budget_units, tail):
            num = normalize(marker.group(1), marker.group(0))
            if num > 0:
                return num, None, currency

    return None, None, currency

    def _is_date_range(raw: str) -> bool:
        tail = lowered.split(raw, 1)[-1][:20]
        return any(tok in tail for toks in _MONTH_TOKENS.values() for tok in toks)

    if has_budget_context:
        for rng in re.finditer(
                r"(\d[\d\s]*)\s*(?:[-–—]|и|до)\s*(\d[\d\s]*)\s*"
                r"(тысяч|тыс|к\b|евро|доллар|рубл|€|\$|₽)?",
                lowered,
        ):
            lo_raw, hi_raw, unit = rng.group(1), rng.group(2), rng.group(3) or ""
            if _is_date_range(rng.group(0)):
                continue
            lo = normalize(lo_raw, unit or lowered)
            hi = normalize(hi_raw, unit or lowered)
            if 0 < lo < hi:
                return None, (lo, hi), currency

    money_unit = r"(тысяч|тыс|к\b|евро|доллар|рубл|€|\$|₽)"
    single = re.search(rf"(\d[\d\s]*)\s*{money_unit}", lowered)
    if single:
        num = normalize(single.group(1), single.group(2) or lowered)
        if num > 0:
            return num, None, currency
    marker = re.search(
        r"(?:бюджет|лимит|потрат\w*|потрач\w*|до|около|примерно|максимум)\D{0,12}?(\d[\d\s]*)",
        lowered,
    )
    if marker:
        num = normalize(marker.group(1), lowered)
        if num > 0:
            return num, None, currency
    return None, None, currency


def _extract_budget_mode(
        text: str,
        budget: float | None,
        budget_range: tuple[float, float] | None,
) -> str | None:
    if budget is not None or budget_range is not None:
        return "specified"

    lowered = _normalize(text)

    strong_no_limit = [
        "не ограничен", "без ограничений", "без лимит", "любой бюджет",
        "деньги не проблема", "финансы не проблема", "неограничен",
        "хоть миллион", "хоть миллиард", "сколько угодно", "no limit"
    ]
    if any(k in lowered for k in strong_no_limit):
        return "no_limit"

    no_limit_markers = [
        "не важен", "не важно", "не важна", "не имеет значения",
        "не принципиален", "не принципиально", "не принципиальна",
        "не критично", "не критичен", "не критична",
        "не суть важно", "не суть", "неважно", "неважен",
        "не играет роли", "роли не играет", "значения не имеет",
        "без ограничения", "без лимитов", "не ограничива",
        "не ограничена", "не ограничены", "не ограничиваемся",
        "без рамок", "вне рамок", "не в рамках",
        "без потолка", "потолка нет", "без верхней границы",
        "любая сумма", "на любую сумму", "произвольный бюджет",
        "произвольная сумма", "какой угодно", "какая угодно",
        "любой вариант", "на твоё усмотрение", "на ваше усмотрение",
        "на усмотрение", "как скажешь", "как решите",
        "деньги не важны", "деньги не главное", "деньги есть",
        "с деньгами проблем нет", "финансовый вопрос не стоит",
        "по деньгам не вопрос", "средства есть", "бюджет позволяет",
        "бесконечный бюджет", "бездонный", "сколько нужно",
        "сколько потребуется", "сколько надо", "не считаем деньги",
        "не экономим", "не нужно экономить", "не экономь",
        "пофиг", "по фиг", "по барабану", "параллельно",
        "всё равно", "все равно", "без разницы", "безразлично",
        "не парюсь", "не парься", "не заморачивайся",
        "сколько хочешь", "сколько скажешь", "трать сколько хочешь",
        "не жалко", "денег не жалко", "unlimited", "no budget",
        "any budget", "money is not an issue", "money is no object",
        "whatever it takes", "sky is the limit", "no cap"
    ]
    if any(k in lowered for k in no_limit_markers):
        return "no_limit"

    flexible_markers = [
        "не знаю", "пока не знаю", "не определил", "не представляю",
        "разные цен", "разные уровн", "разные вариант", "по стоимости",
        "разброс цен", "покажи вариант", "подбери вариант", "сложно сказать",
    ]
    if any(k in lowered for k in flexible_markers):
        return "flexible_scenarios"

    return None


def _resolve_year(month: int, day: int, reference_date: date) -> int | None:
    """Выбрать год для даты без года: ближайшее наступающее число."""
    year = reference_date.year
    for candidate_year in (year, year + 1):
        try:
            candidate = date(candidate_year, month, day)
        except ValueError:
            continue
        if candidate >= reference_date:
            return candidate_year
    return None


def _extract_dates(text: str, reference_date: date) -> list[date] | None:
    lowered = _normalize(text)

    if re.search(r"\bсегодня\b", lowered):
        return [reference_date, reference_date]
    if re.search(r"\bпослезавтра\b", lowered):
        d = reference_date + timedelta(days=2)
        return [d, d]
    if re.search(r"\bзавтра\b", lowered):
        d = reference_date + timedelta(days=1)
        return [d, d]

    if "выходные" in lowered or "на выходных" in lowered:
        days_ahead = 5 - reference_date.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        sat = reference_date + timedelta(days=days_ahead)
        sun = sat + timedelta(days=1)
        return [sat, sun]

    if "майские" in lowered:
        year = reference_date.year
        if reference_date > date(year, 5, 10):
            year += 1
        return [date(year, 5, 1), date(year, 5, 10)]

    # Классический диапазон: "с 10 по 15 сентября"
    m = re.search(
        r"(?:с\s+)?(\d{1,2})\s*(?:[-–—]|по)\s*(\d{1,2})\s+([а-яёa-z]+)(?:\s+(\d{4}))?",
        lowered,
    )
    if m:
        d1, d2, month_tok = int(m.group(1)), int(m.group(2)), m.group(3)
        year_hint = int(m.group(4)) if m.group(4) else None
        month = _month_from_token(month_tok)
        if month:
            year = year_hint if year_hint else _resolve_year(month, d1, reference_date)
            if year:
                try:
                    start = date(year, month, d1)
                    end = date(year, month, d2)
                    if start >= reference_date and end >= start:
                        return [start, end]
                except ValueError:
                    pass

    # Поиск свободных дат: "1 июля", "28 ноября"
    single_dates = re.findall(r"(\d{1,2})\s+([а-яёa-z]+)(?:\s+(\d{4}))?", lowered)
    if single_dates:
        parsed = []
        explicit_year = None
        for _, _, y_str in single_dates:
            if y_str:
                explicit_year = int(y_str)
                break

        for d_str, m_str, y_str in single_dates:
            month = _month_from_token(m_str)
            if not month:
                continue
            day = int(d_str)
            year = int(y_str) if y_str else (explicit_year or _resolve_year(month, day, reference_date))

            if year:
                try:
                    parsed.append(date(year, month, day))
                except ValueError:
                    pass
        if parsed:
            parsed.sort()
            return [parsed[0], parsed[-1]]

    # ISO формат (2026-07-01)
    iso = re.findall(r"(\d{4}-\d{2}-\d{2})", lowered)
    if iso:
        try:
            dates = [date.fromisoformat(x) for x in iso]
            if all(d >= reference_date for d in dates):
                dates.sort()
                return [dates[0], dates[-1]]
        except ValueError:
            pass

    return None


def _month_from_token(token: str) -> int | None:
    for month, tokens in _MONTH_TOKENS.items():
        if any(tok in token for tok in tokens):
            return _MONTH_NUMBER[month]
    return None


def _extract_removed_preferences(text: str) -> list[str] | None:
    lowered = _normalize(text)
    removed: set[str] = set()
    for vibe, tokens in _VIBE_TOKENS.items():
        for tok in tokens:
            escaped = re.escape(tok)
            if re.search(rf"не\s+(?:хочу\s+)?(?:так\s+)?{escaped}", lowered):
                removed.add(vibe)
            elif re.search(rf"без\s+{escaped}", lowered):
                removed.add(vibe)
    return sorted(removed) or None


def _extract_preferences(text: str) -> list[Preference] | None:
    lowered = _normalize(text)
    removed = set(_extract_removed_preferences(text) or [])
    found: list[Preference] = []
    seen: set[str] = set()
    ordinal_city_selection = re.search(
        r"\bгород\s*(?:\d|перв|втор|трет|четверт|пят)", lowered
    ) is not None
    for vibe, tokens in _VIBE_TOKENS.items():
        if vibe in removed:
            continue
        if vibe == "city" and ordinal_city_selection:
            continue
        if any(_contains(lowered, tok) for tok in tokens) and vibe not in seen:
            found.append(Preference(name=vibe, priority=Priority.MEDIUM))
            seen.add(vibe)
    names = {p.name for p in found}
    if "beach" in names and "sea" in names:
        found = [p for p in found if p.name != "sea"]
    return found or None


def _near_budget(lowered: str, marker: str) -> bool:
    idx = lowered.find(marker)
    if idx < 0:
        return False
    window = lowered[max(0, idx - 25):idx]
    return any(k in window for k in ["бюджет", "деньг", "цен", "лимит", "стоимост"])


def _extract_preference_status(
        text: str,
        preferences: list[Preference] | None,
) -> str | None:
    if preferences:
        return "specified"

    lowered = _normalize(text)
    markers = [
        "все равно", "без разницы", "не важно", "не принципиально",
        "не могу определиться", "предложи варианты", "любой вариант",
        "на твой вкус", "без предпочтений", "не важно куда",
    ]
    for marker in markers:
        if marker not in lowered:
            continue
        if marker in {"не важно", "все равно"} and _near_budget(lowered, marker):
            continue
        return "no_preference"
    return None


def _extract_constraints(text: str) -> list[Constraint] | None:
    lowered = _normalize(text)
    found: list[Constraint] = []
    for name, tokens in _CONSTRAINT_TOKENS.items():
        if any(_contains(lowered, tok) for tok in tokens):
            found.append(Constraint(name=name, value=True, hard=False))
    return found or None


def _extract_removed_hotel_requirements(text: str) -> list[str] | None:
    lowered = _normalize(text)
    removed: list[str] = []
    for req, tokens in _HOTEL_REQ_TOKENS.items():
        for tok in tokens:
            escaped = re.escape(tok)
            if (
                    re.search(rf"{escaped}\w*\s+(?:больше\s+)?не\s+нуж", lowered)
                    or re.search(rf"не\s+нужен\s+{escaped}", lowered)
                    or re.search(rf"без\s+{escaped}", lowered)
                    or re.search(rf"не\s+(?:хочу|надо|нужно|люблю)\s+(?:отель\s+)?(?:с\s+)?{escaped}", lowered)
            ):
                if req not in removed:
                    removed.append(req)
    return removed or None


def _extract_hotel_requirements(text: str) -> list[str] | None:
    lowered = _normalize(text)
    removed = set(_extract_removed_hotel_requirements(text) or [])
    found: list[str] = []
    for req, tokens in _HOTEL_REQ_TOKENS.items():
        if req in removed:
            continue
        if any(_contains(lowered, tok) for tok in tokens) and req not in found:
            found.append(req)
    if "хорош" in lowered and "отель" in lowered and "quality" not in found:
        found.append("quality")
    return found or None


def _extract_origin(text: str) -> str | None:
    lowered = _normalize(text)

    for origin in ds.ORIGINS:
        if origin.city.lower() in lowered:
            if any(k in lowered for k in ["вылета", "из ", "лечу", "выезжа", "отправл", "старт", "летим из", "from"]):
                return origin.city
    for origin in ds.ORIGINS:
        if origin.city.lower() in lowered:
            return origin.city
    for o in ds.ORIGINS:
        for stem in ds.CITY_ALIASES.get(o.city.lower(), []):
            if stem in lowered:
                return o.city

    # Нечеткий поиск от опечаток
    words = [w.strip('.,!?-') for w in lowered.split()]
    all_stems = []
    stem_to_origin = {}

    for o in ds.ORIGINS:
        c = o.city.lower()
        all_stems.append(c)
        stem_to_origin[c] = o.city
        for stem in ds.CITY_ALIASES.get(c, []):
            all_stems.append(stem)
            stem_to_origin[stem] = o.city

    for word in words:
        if len(word) >= 4:
            matches = get_close_matches(word, all_stems, n=1, cutoff=0.75)
            if matches:
                return stem_to_origin[matches[0]]

    return None


def _mentioned_destination_cities(text: str, origin: str | None = None) -> list:
    """Все города dataset, явно упомянутые в тексте (без дублей и без города вылета)."""
    lowered = _normalize(text)
    found: dict[str, object] = {}

    for dest in ds.DESTINATIONS:
        if dest.city.lower() in lowered:
            if origin and dest.city.lower() == origin.lower():
                continue
            found[dest.city] = dest

    for city_key, stems in ds.CITY_ALIASES.items():
        for stem in stems:
            if stem in lowered:
                if origin and city_key == origin.lower():
                    continue
                if d := ds.get_destination_by_city(city_key):
                    found[d.city] = d

    # Нечеткий поиск
    words = [w.strip('.,!?-') for w in lowered.split()]
    all_stems = []
    stem_to_city = {}

    for dest in ds.DESTINATIONS:
        c = dest.city.lower()
        all_stems.append(c)
        stem_to_city[c] = c
    for city_key, stems in ds.CITY_ALIASES.items():
        for stem in stems:
            all_stems.append(stem)
            stem_to_city[stem] = city_key

    for word in words:
        if len(word) >= 4:
            matches = get_close_matches(word, all_stems, n=1, cutoff=0.75)
            if matches:
                city_key = stem_to_city[matches[0]]
                if origin and city_key == origin.lower():
                    continue
                if d := ds.get_destination_by_city(city_key):
                    found[d.city] = d

    return list(found.values())


def _extract_destination(text: str, origin: str | None = None) -> tuple[str | None, str | None, bool]:
    """Вернуть (city, country, ambiguous)."""
    cities = _mentioned_destination_cities(text, origin)
    if len(cities) == 1:
        return cities[0].city, cities[0].country, False
    if len(cities) > 1:
        return None, None, True

    country = ds.resolve_country(text)
    if country:
        return None, country, False
    return None, None, False


_UNKNOWN_CITY_STOPWORDS = {
    "центре", "августе", "июле", "июне", "сентябре", "октябре", "ноябре",
    "декабре", "январе", "феврале", "марте", "апреле", "мае", "отпуске",
    "плюсе", "европе", "азии",
}


def _extract_unknown_destination(text: str) -> str | None:
    """Распознать упомянутый, но неподдерживаемый город («в Токио»).

    Город не выдумывается: возвращается только то, что пользователь явно
    написал с заглавной буквы после предлога «в». Known-города, страны и
    origin-города сюда не попадают.
    """
    m = re.search(r"\bв\s+([А-ЯЁA-Z][а-яёa-z\-]+)", text or "")
    if not m:
        return None
    name = m.group(1)
    if ds.resolve_city(name) or ds.resolve_country(name):
        return None
    base = name.lower()
    if base in _UNKNOWN_CITY_STOPWORDS:
        return None
    for origin in ds.ORIGINS:
        if origin.city.lower() in base:
            return None
        for stem in ds.CITY_ALIASES.get(origin.city.lower(), []):
            if stem in base:
                return None
    return name


def extract_user_request(
        message: str,
        current_request=None,
        reference_year: int | None = None,
        reference_date: date | None = None,
) -> UserRequestPatch:
    """Извлечь все доступные параметры из сообщения пользователя.

    :param message: последнее сообщение пользователя.
    :param current_request: текущий ``UserRequest`` (не мутируется).
    :param reference_year: явный год для дат без года (для тестов/демо).
    :param reference_date: опорная дата (по умолчанию — текущая).
    :returns: :class:`UserRequestPatch` с только найденными значениями.
    """
    text = message or ""
    if reference_date is None:
        reference_date = date(reference_year, 1, 1) if reference_year else date.today()

    patch = UserRequestPatch()

    # извлекаем origin
    origin = _extract_origin(text)
    if origin:
        patch.origin = origin

    # передаем origin в экстрактор destination
    city, country, ambiguous = _extract_destination(text, origin)
    if city:
        patch.destination = city
        if country:
            patch.destination_country = country
    elif ambiguous:
        patch.destination_ambiguous = True
    elif country:
        patch.destination_country = country
    else:
        unknown = _extract_unknown_destination(text)
        if unknown:
            patch.destination = unknown

    origin = _extract_origin(text)
    if origin:
        patch.origin = origin

    exact = _extract_dates(text, reference_date)
    if exact:
        patch.exact_dates = exact

    months = _extract_months(text)
    if months:
        patch.month = months

    seasons = _extract_seasons(text)
    if seasons:
        patch.season = seasons

    duration = _extract_duration(text)
    if duration:
        patch.duration = duration

    travelers, traveler_range, adults, children = _extract_travelers(text)
    if traveler_range:
        patch.traveler_range = traveler_range
    elif travelers:
        patch.travelers = travelers
    if adults is not None:
        patch.adults = adults
    if children is not None:
        patch.children = children

    budget, budget_range, currency = _extract_budget(text)
    if budget_range:
        patch.budget_range = budget_range
    elif budget:
        patch.budget = budget
    if currency:
        patch.currency = currency
    budget_mode = _extract_budget_mode(text, budget, budget_range)
    if budget_mode:
        patch.budget_mode = budget_mode

    preferences = _extract_preferences(text)
    if preferences:
        patch.preferences = preferences
    removed_prefs = _extract_removed_preferences(text)
    if removed_prefs:
        patch.removed_preferences = removed_prefs
    preference_status = _extract_preference_status(text, preferences)
    if preference_status:
        patch.preference_status = preference_status

    constraints = _extract_constraints(text)
    if constraints:
        patch.constraints = constraints

    hotel_reqs = _extract_hotel_requirements(text)
    if hotel_reqs:
        patch.hotel_requirements = hotel_reqs
    removed_hotel = _extract_removed_hotel_requirements(text)
    if removed_hotel:
        patch.removed_hotel_requirements = removed_hotel

    transport = _detect_transport(text)
    if transport:
        patch.preferred_transport = transport

    return patch


__all__ = ["extract_user_request"]