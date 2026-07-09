// services/ios-scraper-fixed.ts
import { app, list, search, constants } from 'app-store-scraper-ts';
import { CategoryMapper } from '../services/category';

export class iOSAppStoreScraper {
  
  async getTopApps(category: string, country: string = 'us', num: number = 100) {
    try {
      console.log(`     🔄 iOS: Fetching ${num} apps from ${category} in ${country}...`);
      
      // ✅ Get correct iOS category enum
      const iosCategory = CategoryMapper.getIOSCategory(category);
      console.log(`        Using iOS category: ${category} →`, iosCategory);

      const collections = [
        constants.collection.TOP_FREE_IOS,
        constants.collection.TOP_PAID_IOS,
        constants.collection.TOP_GROSSING_IOS
      ];
      
      let allApps: any[] = [];
      
      for (const collection of collections) {
        const results = await list({
          collection,
          category: iosCategory,  // ✅ This works because it's iOS enum
          country,
          num: 50
        });
        
        allApps = [...allApps, ...results];
        
        if (allApps.length >= num) {
          allApps = allApps.slice(0, num);
          break;
        }
        
        await new Promise(r => setTimeout(r, 2000));
      }
      
      console.log(`        ✅ Found ${allApps.length} iOS apps`);
      return allApps;
      
    } catch (error) {
      console.error('Error fetching iOS apps:', error);
      return [];
    }
  }

  async getAppById(appId: string, country: string = 'us') {
    try {
      const result = await app({ 
        id: appId, 
        country,
        ratings: true
      });
      
      return {
        success: true,
        data: result
      };
    } catch (error:any) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}