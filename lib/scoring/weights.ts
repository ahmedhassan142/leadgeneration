// lib/scoring/weights.ts
export const WEIGHTS = {
  baseMultiplier: 0.8, // Scale scores to 0-100
  hotThreshold: 70,
  warmThreshold: 40,
  
  // Category weights
  seoWeight: 1.2,
  performanceWeight: 1.1,
  designWeight: 1.3,
  featuresWeight: 1.0,
  mobileWeight: 1.1,
  
  // Industry-specific adjustments
  industryMultipliers: {
    'real estate agents': 1.1,
    'dentists': 1.05,
    'plumbers': 0.95,
    'roofers': 0.95,
    'electricians': 0.95,
    'photographers': 1.15,
    'restaurants': 1.1,
    'default': 1.0
  }
};