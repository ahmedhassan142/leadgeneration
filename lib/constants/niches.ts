// lib/constants/niches.ts
export const NICHES = [
  { 
    id: 'real-estate', 
    name: 'Real Estate', 
    keywords: ['real estate agents', 'realtors', 'property management', 'real estate agency'],
    icon: '🏠',
    searchTerms: {
      google: ['real estate agents', 'realtors', 'property management'],
      yellowpages: ['real estate agents', 'realtors', 'real estate broker']
    }
  },
  { 
    id: 'restaurant', 
    name: 'Restaurants', 
    keywords: ['restaurants', 'cafes', 'dining', 'food service'],
    icon: '🍽️',
    searchTerms: {
      google: ['restaurants', 'cafes', 'fine dining'],
      yellowpages: ['restaurants', 'cafes', 'dining']
    }
  },
  { 
    id: 'financial', 
    name: 'Financial Services', 
    keywords: ['financial advisors', 'financial planners', 'wealth management', 'investment advisors'],
    icon: '💰',
    searchTerms: {
      google: ['financial advisors', 'financial planners', 'wealth management'],
      yellowpages: ['financial advisors', 'financial planners', 'investment advisors']
    }
  }
];

export const NICHE_KEYWORDS = {
  'real-estate': [
    'real estate agents',
    'realtors',
    'property management',
    'real estate agency',
    'real estate brokers',
    'real estate consultants'
  ],
  'restaurant': [
    'restaurants',
    'cafes',
    'dining',
    'food service',
    'bistros',
    'grill',
    'steakhouse',
    'pizzeria',
    'sushi restaurant'
  ],
  'financial': [
    'financial advisors',
    'financial planners',
    'wealth management',
    'investment advisors',
    'financial consultants',
    'retirement planning',
    'estate planning',
    'financial services'
  ]
};