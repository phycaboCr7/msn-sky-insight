import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert country name to ISO country code for flag API
export function getCountryCode(countryName: string): string {
  const countryToCode: { [key: string]: string } = {
    'India': 'in',
    'United States': 'us',
    'United Kingdom': 'gb',
    'Canada': 'ca',
    'Australia': 'au',
    'Germany': 'de',
    'France': 'fr',
    'Italy': 'it',
    'Spain': 'es',
    'Japan': 'jp',
    'China': 'cn',
    'Brazil': 'br',
    'Mexico': 'mx',
    'Russia': 'ru',
    'South Korea': 'kr',
    'Netherlands': 'nl',
    'Sweden': 'se',
    'Norway': 'no',
    'Denmark': 'dk',
    'Finland': 'fi',
    'Switzerland': 'ch',
    'Austria': 'at',
    'Belgium': 'be',
    'Poland': 'pl',
    'Turkey': 'tr',
    'Saudi Arabia': 'sa',
    'UAE': 'ae',
    'Egypt': 'eg',
    'South Africa': 'za',
    'Argentina': 'ar',
    'Chile': 'cl',
    'Colombia': 'co',
    'Peru': 'pe',
    'Thailand': 'th',
    'Vietnam': 'vn',
    'Indonesia': 'id',
    'Malaysia': 'my',
    'Singapore': 'sg',
    'Philippines': 'ph',
    'Pakistan': 'pk',
    'Bangladesh': 'bd',
    'New Zealand': 'nz',
    'Ireland': 'ie',
    'Portugal': 'pt',
    'Greece': 'gr',
    'Czech Republic': 'cz',
    'Hungary': 'hu',
    'Romania': 'ro',
    'Israel': 'il',
    'Ukraine': 'ua',
  };

  return countryToCode[countryName] || 'un'; // Default to UN flag
}

// Get flag image URL from country name
export function getFlagUrl(countryName: string): string {
  const code = getCountryCode(countryName);
  return `https://flagcdn.com/w80/${code}.png`;
}
