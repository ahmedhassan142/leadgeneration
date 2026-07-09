// lib/utils/validators.ts
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  catch {
    return false;
  }
}

export function validatePhone(phone: string): boolean {
  // Basic phone validation - can be enhanced for specific formats
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
}

export function validateNiche(niche: string): boolean {
  const validNiches = [
    'real estate agents',
    'plumbers',
    'electricians',
    'dentists',
    'roofers',
    'landscapers',
    'contractors',
    'photographers',
    'restaurants',
    'doctors',
    'lawyers',
    'accountants'
  ];
  return validNiches.includes(niche.toLowerCase());
}