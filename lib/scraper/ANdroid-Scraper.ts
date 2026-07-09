// services/android-scraper-fixed.ts
import gplay from 'google-play-scraper';
import { CategoryMapper } from '../services/category';

export class GooglePlayScraper {
  
  async getTopApps(category: string, collection: any = null, num: number = 100, country: string = 'us') {
    try {
      console.log(`     🔄 Android: Fetching ${num} apps from ${category} in ${country}...`);
      
      // ✅ Get correct Android category STRING
      const androidCategory = CategoryMapper.getAndroidCategory(category);
      console.log(`        Using Android category: ${category} → ${androidCategory}`);

      const collections = [
        collection || gplay.collection.TOP_FREE,
        gplay.collection.TOP_PAID,
        gplay.collection.TOP_GROSSING
      ];
      
      let allApps: any[] = [];
      
      for (const col of collections) {
        const colName = col === gplay.collection.TOP_FREE ? 'TOP_FREE' : 
                       col === gplay.collection.TOP_PAID ? 'TOP_PAID' : 'TOP_GROSSING';
        
        console.log(`        Fetching from ${colName}...`);
        
        const results = await gplay.list({
          category: androidCategory,  // ✅ This is a string, not enum
          collection: col,
          num: 120,
          country,
          fullDetail: false
        });
        
        allApps = [...allApps, ...results];
        
        if (allApps.length >= num) {
          allApps = allApps.slice(0, num);
          break;
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      console.log(`        ✅ Found ${allApps.length} Android apps`);
      return allApps;
      
    } catch (error) {
      console.error('Error fetching Android apps:', error);
      return [];
    }
  }

  async getAppDetails(appId: string, country: string = 'us') {
    try {
      const result = await gplay.app({
        appId,
        country
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