// services/category-mapper.ts
import { constants as iOSConstants } from 'app-store-scraper-ts';
import gplay from 'google-play-scraper';

export class CategoryMapper {
  
  /**
   * iOS App Store Categories
   */
  static iOS = {
    'finance': iOSConstants.category.FINANCE,        // ✅ iOS mein yeh hai
    'business': iOSConstants.category.BUSINESS,
    'health': iOSConstants.category.HEALTH_AND_FITNESS,
    'education': iOSConstants.category.EDUCATION,
    'shopping': iOSConstants.category.SHOPPING,
    'food': iOSConstants.category.FOOD_AND_DRINK
  };

  /**
   * Google Play Store Categories (String-based, not enum)
   */
  static android = {
    'finance': 'FINANCE',                    // ✅ Direct string
    'business': 'BUSINESS',
    'health': 'HEALTH_AND_FITNESS',          // Note: Different name!
    'education': 'EDUCATION',
    'shopping': 'SHOPPING',
    'food': 'FOOD_AND_DRINK'
  };

  /**
   * Display names for logging
   */
  static display = {
    'finance': 'Finance',
    'business': 'Business',
    'health': 'Health & Fitness',
    'education': 'Education',
    'shopping': 'Shopping',
    'food': 'Food & Drink'
  };

  /**
   * Get iOS category enum
   */
  static getIOSCategory(category: string): any {
    //@ts-ignore
    return this.iOS[category] || iOSConstants.category.BUSINESS;
  }

  /**
   * Get Android category string
   */
  static getAndroidCategory(category: string): string {
    //@ts-ignore
    return this.android[category] || 'BUSINESS';
  }

  /**
   * Get display name
   */
  static getDisplayName(category: string): string {
    //@ts-ignore
    return this.display[category] || category;
  }
}