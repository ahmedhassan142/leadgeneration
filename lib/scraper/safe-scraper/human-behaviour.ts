// lib/scraper/safe-scraper/human-behavior.ts
import { Page } from 'playwright';

export class HumanBehavior {
  private config: any;
  
  constructor(config: any) {
    this.config = config;
  }

  async randomDelay(): Promise<void> {
    const delay = this.config.minDelay + 
      Math.random() * (this.config.maxDelay - this.config.minDelay);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async simulateMouseMovement(page: Page): Promise<void> {
    if (!this.config.mouseMovement) return;
    
    const viewport = page.viewportSize() || { width: 1366, height: 768 };
    
    // Random mouse movements
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;
      await page.mouse.move(x, y);
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    }
  }

  async simulateScroll(page: Page): Promise<void> {
    if (!this.config.scrollVariation) return;
    
    // Random scroll patterns
    const scrollAmount = 200 + Math.random() * 600;
    await page.mouse.wheel(0, scrollAmount);
    await this.randomDelay();
    
    // Sometimes scroll back up a bit
    if (Math.random() > 0.7) {
      await page.mouse.wheel(0, -100);
      await this.randomDelay();
    }
  }

  async simulateTyping(page: Page, selector: string, text: string): Promise<void> {
    await page.click(selector);
    await this.randomDelay();
    
    // Type like a human (random delays between keystrokes)
    for (const char of text) {
      await page.type(selector, char, { delay: 100 + Math.random() * 200 });
    }
    await this.randomDelay();
  }

  async humanLikeWait(): Promise<void> {
    // Sometimes wait longer (like human reading)
    if (Math.random() > 0.8) {
      await new Promise(resolve => setTimeout(resolve, 8000 + Math.random() * 5000));
    }
  }
}