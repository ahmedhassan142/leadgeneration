// lib/scraper/utils/delay.ts
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

export function exponentialBackoff(attempt: number): Promise<void> {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  return new Promise(resolve => setTimeout(resolve, delay));
}