// lib/scoring/rules.ts
export const SCORING_RULES = {
  missingSEO: {
    points: 20,
    reason: 'Missing SEO optimization - easy win'
  },
  slowSpeed: {
    points: 20,
    reason: 'Poor loading speed affects conversions'
  },
  badDesign: {
    points: 25,
    reason: 'Outdated design needs modernization'
  },
  noChat: {
    points: 10,
    reason: 'No live chat feature for customer engagement'
  },
  noBooking: {
    points: 10,
    reason: 'No online booking/appointment system'
  },
  notMobileFriendly: {
    points: 15,
    reason: 'Website not optimized for mobile users'
  },
  noSocial: {
    points: 10,
    reason: 'No social media integration found'
  },
  hasCompetitors: {
    points: 5,
    reason: 'Multiple competitors found in area'
  },
  oldContent: {
    points: 10,
    reason: 'Outdated content or blog posts'
  },
  noSSL: {
    points: 15,
    reason: 'Website not secure (missing HTTPS)'
  }
};