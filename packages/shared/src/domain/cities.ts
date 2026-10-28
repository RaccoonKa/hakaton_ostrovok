export interface CityOption {
  name: string;
  code: string;
  country: string;
  airportName?: string;
}

export const CITIES_DATABASE: CityOption[] = [
  { name: "Москва", code: "MOW", country: "Россия", airportName: "Шереметьево, Домодедово, Внуково" },
  { name: "Санкт-Петербург", code: "LED", country: "Россия", airportName: "Пулково" },
  { name: "Калининград", code: "KGD", country: "Россия", airportName: "Храброво" },
  { name: "Екатеринбург", code: "SVX", country: "Россия", airportName: "Кольцово" },
  { name: "Казань", code: "KZN", country: "Россия", airportName: "им. Тукая" },
  { name: "Новосибирск", code: "OVB", country: "Россия", airportName: "Толмачёво" },
  { name: "Сочи", code: "AER", country: "Россия", airportName: "Адлер" },
  { name: "Владивосток", code: "VVO", country: "Россия", airportName: "Кневичи" },
  { name: "Минеральные Воды", code: "MRV", country: "Россия", airportName: "им. Лермонтова" },
  { name: "Самара", code: "KUF", country: "Россия", airportName: "Курумоч" },
  { name: "Уфа", code: "UFA", country: "Россия", airportName: "им. Мустая Карима" },
  { name: "Красноярск", code: "KJA", country: "Россия", airportName: "им. Хворостовского" },
  { name: "Иркутск", code: "IKT", country: "Россия", airportName: "Международный" },
  { name: "Тюмень", code: "TJM", country: "Россия", airportName: "Рощино" },
  { name: "Челябинск", code: "CEK", country: "Россия", airportName: "Баландино" },
  { name: "Нижний Новгород", code: "GOJ", country: "Россия", airportName: "Чкалов" },
  { name: "Омск", code: "OMS", country: "Россия", airportName: "Центральный" },
  { name: "Хабаровск", code: "KHV", country: "Россия", airportName: "Новый" },
  { name: "Пермь", code: "PEE", country: "Россия", airportName: "Большое Савино" },
  { name: "Волгоград", code: "VOG", country: "Россия", airportName: "Гумрак" },
  { name: "Мурманск", code: "MMK", country: "Россия", airportName: "им. Николая II" },
  { name: "Архангельск", code: "ARH", country: "Россия", airportName: "Талаги" },
  { name: "Махачкала", code: "MCX", country: "Россия", airportName: "Уйташ" },
  { name: "Грозный", code: "GRV", country: "Россия", airportName: "Северный" },
  { name: "Сургут", code: "SGC", country: "Россия", airportName: "им. Фармана Салманова" },
  { name: "Стамбул", code: "IST", country: "Турция", airportName: "Istanbul Airport" },
  { name: "Дубай", code: "DXB", country: "ОАЭ", airportName: "Dubai International" },
  { name: "Минск", code: "MSQ", country: "Беларусь", airportName: "Минск-2" },
  { name: "Ереван", code: "EVN", country: "Армения", airportName: "Звартноц" },
  { name: "Баку", code: "GYD", country: "Азербайджан", airportName: "Гейдар Алиев" },
  { name: "Ташкент", code: "TAS", country: "Узбекистан", airportName: "им. Ислама Каримова" },
  { name: "Тбилиси", code: "TBS", country: "Грузия", airportName: "им. Шота Руставели" },
  { name: "Астана", code: "NQZ", country: "Казахстан", airportName: "Нурсултан Назарбаев" },
  { name: "Алматы", code: "ALA", country: "Казахстан", airportName: "Международный" },
];
