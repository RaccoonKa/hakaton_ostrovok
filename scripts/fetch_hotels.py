"""
Скачивание изображений отелей для оффлайн-работы веб-интерфейса и синхронизация данных.

- Скачивает превью отелей в apps/web/public/images/hotels/{id}.jpg
- Прописывает локальные пути в data/hotels.json
- Опционально запрашивает свежие точки из OpenStreetMap (флаг --sync-osm)
"""

import argparse
import json
import logging
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
HOTELS_JSON = DATA_DIR / "hotels.json"
WEB_PUBLIC_IMAGES = REPO_ROOT / "apps" / "web" / "public" / "images" / "hotels"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fetch_hotels")


def download_image(url: str, dest_path: Path, max_retries: int = 3) -> bool:
    """Скачивает и сохраняет изображение с retry и таймаутом."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    if dest_path.exists() and dest_path.stat().st_size > 1024:
        logger.info("Фото уже существует: %s (размер: %d байт)", dest_path.name, dest_path.stat().st_size)
        return True

    # Оптимизируем параметры Unsplash (ширина 800px, качество 80)
    download_url = url
    if "images.unsplash.com" in url and "w=" not in url:
        sep = "&" if "?" in url else "?"
        download_url = f"{url}{sep}auto=format&fit=crop&w=800&q=80"

    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(download_url)
            with urllib.request.urlopen(req, timeout=12) as response:
                content = response.read()
                if len(content) > 1024:
                    with open(dest_path, "wb") as f:
                        f.write(content)
                    logger.info("Успешно скачано: %s (%d КБ)", dest_path.name, len(content) // 1024)
                    return True
        except Exception as e:
            logger.warning("Попытка %d/%d для %s завершилась с ошибкой: %s", attempt, max_retries, dest_path.name, e)
            time.sleep(1.0 * attempt)

    return False


def query_overpass_api(bbox: tuple[float, float, float, float]) -> list[dict]:
    """
    Запрос точек tourism=hotel к Overpass API.
    bbox: (min_lat, min_lon, max_lat, max_lon)
    """
    min_lat, min_lon, max_lat, max_lon = bbox
    query = f"""
    [out:json][timeout:25];
    (
      node["tourism"="hotel"]["name"]({min_lat},{min_lon},{max_lat},{max_lon});
      way["tourism"="hotel"]["name"]({min_lat},{min_lon},{max_lat},{max_lon});
    );
    out center tags 15;
    """
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]

    for ep in endpoints:
        try:
            logger.info("Запрос к Overpass endpoint: %s ...", ep)
            data = urllib.parse.urlencode({"data": query}).encode("utf-8")
            req = urllib.request.Request(ep, data=data)
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    result = json.loads(resp.read().decode("utf-8"))
                    elements = result.get("elements", [])
                    logger.info("Overpass вернул %d объектов.", len(elements))
                    return elements
        except Exception as e:
            logger.warning("Ошибка запроса к %s: %s", ep, e)
            continue

    logger.warning("Все Overpass endpoints временно недоступны или перегружены (502). Используется эталонная база.")
    return []


def sync_hotel_images(hotels: list[dict]) -> tuple[int, int]:
    """Скачивает фото для всех отелей и сохраняет локальные пути."""
    success_count = 0
    total = len(hotels)

    for h in hotels:
        hotel_id = h.get("id")
        current_url = h.get("image_url")
        dest_filename = f"{hotel_id}.jpg"
        dest_path = WEB_PUBLIC_IMAGES / dest_filename
        local_url = f"/images/hotels/{dest_filename}"

        if current_url and current_url.startswith("http"):
            if download_image(current_url, dest_path):
                h["image_url"] = local_url
                success_count += 1
            else:
                logger.error("Не удалось скачать фото для отеля %s", hotel_id)
        elif current_url and current_url.startswith("/images/hotels/"):
            # Уже локальный путь
            if dest_path.exists() and dest_path.stat().st_size > 1024:
                success_count += 1
            else:
                logger.warning("Локальный файл отсутствует для %s", hotel_id)

    return success_count, total


def main() -> None:
    parser = argparse.ArgumentParser(description="Выгрузка отелей и скачивание локальных фото.")
    parser.add_argument("--sync-osm", action="store_true", help="Попытаться запросить свежие точки из OpenStreetMap Overpass API")
    args = parser.parse_args()

    if not HOTELS_JSON.exists():
        logger.error("Файл %s не найден!", HOTELS_JSON)
        sys.exit(1)

    with open(HOTELS_JSON, encoding="utf-8") as f:
        hotels = json.load(f)

    logger.info("Загружено %d отелей из %s.", len(hotels), HOTELS_JSON.name)

    if args.sync_osm:
        logger.info("Попытка синхронизации с OpenStreetMap...")
        # Тестовый запрос по Сочи
        sochi_bbox = (43.38, 39.90, 43.70, 40.30)
        osm_elements = query_overpass_api(sochi_bbox)
        if osm_elements:
            raw_file = DATA_DIR / "raw_osm_hotels.json"
            with open(raw_file, "w", encoding="utf-8") as f:
                json.dump(osm_elements, f, ensure_ascii=False, indent=2)
            logger.info("Сырые данные OSM сохранены в %s", raw_file)

    logger.info("Скачивание фото в %s...", WEB_PUBLIC_IMAGES)
    downloaded, total = sync_hotel_images(hotels)
    logger.info("Успешно сохранено %d/%d фото отелей.", downloaded, total)

    # Сохраняем обновленные локальные пути в data/hotels.json
    with open(HOTELS_JSON, "w", encoding="utf-8") as f:
        json.dump(hotels, f, ensure_ascii=False, indent=2)
    logger.info("Файл %s обновлен новыми локальными путями.", HOTELS_JSON)

    # Подсчет размера папки
    total_bytes = sum(p.stat().st_size for p in WEB_PUBLIC_IMAGES.glob("*.jpg"))
    logger.info("Общий размер папки с фото: %.2f МБ", total_bytes / (1024 * 1024))


if __name__ == "__main__":
    main()
