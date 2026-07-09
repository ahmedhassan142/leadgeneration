// lib/scraper/googleMapsScraper.ts
// Lightweight wrapper that delegates to the existing SERP API service so the
// background processor route can scrape Google Maps. Keeps the original
// signature expected by app/api/background/processor/route.ts:
//   scrapeGoogleMaps(niche, location, num) -> number (leads saved)
import { scrapeWithSerp } from "./serpApi";
import { logger } from "@/lib/scraper/utils/logger";

type NicheType = "real-estate" | "restaurant" | "financial";

/**
 * Scrape Google Maps for businesses in a niche/location.
 * Returns the number of leads saved to the database.
 */
export async function scrapeGoogleMaps(
  niche: string,
  location: string,
  num: number = 20
): Promise<number> {
  const validNiches: NicheType[] = ["real-estate", "restaurant", "financial"];
  const safeNiche = validNiches.includes(niche as NicheType)
    ? (niche as NicheType)
    : "real-estate";

  try {
    logger.info(`Scraping Google Maps`, { niche: safeNiche, location, num });
    const saved = await scrapeWithSerp(safeNiche, location, num, Math.min(num, 20));
    logger.info(`Google Maps scrape complete`, { saved });
    return saved;
  } catch (error) {
    logger.error(`Google Maps scrape failed`, error);
    return 0;
  }
}

export default scrapeGoogleMaps;
