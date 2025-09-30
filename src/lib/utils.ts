import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert country name to flag emoji
export function getCountryFlag(countryName: string): string {
  const countryToCode: { [key: string]: string } = {
    'India': 'IN',
    'United States': 'US',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES',
    'Japan': 'JP',
    'China': 'CN',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'Russia': 'RU',
    'South Korea': 'KR',
    'Netherlands': 'NL',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Switzerland': 'CH',
    'Austria': 'AT',
    'Belgium': 'BE',
    'Poland': 'PL',
    'Turkey': 'TR',
    'Saudi Arabia': 'SA',
    'UAE': 'AE',
    'Egypt': 'EG',
    'South Africa': 'ZA',
    'Argentina': 'AR',
    'Chile': 'CL',
    'Colombia': 'CO',
    'Peru': 'PE',
    'Thailand': 'TH',
    'Vietnam': 'VN',
    'Indonesia': 'ID',
    'Malaysia': 'MY',
    'Singapore': 'SG',
    'Philippines': 'PH',
    'Pakistan': 'PK',
    'Bangladesh': 'BD',
    'New Zealand': 'NZ',
    'Ireland': 'IE',
    'Portugal': 'PT',
    'Greece': 'GR',
    'Czech Republic': 'CZ',
    'Hungary': 'HU',
    'Romania': 'RO',
    'Israel': 'IL',
    'Ukraine': 'UA',
  };

  const code = countryToCode[countryName];
  if (!code) return '🌍'; // Default globe emoji
  
  // Convert country code to flag emoji
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
