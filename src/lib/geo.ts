export const CITY_AIRPORT_MAP: Record<string, string> = {
  // Common misspellings and abbreviations
  'dehli': 'DEL', 'new dehli': 'DEL',
  'bombay': 'BOM', 'calcutta': 'CCU', 'madras': 'MAA',
  
  // Indian Metro / Primary Airports
  'mumbai': 'BOM',
  'delhi': 'DEL', 'new delhi': 'DEL',
  'bangalore': 'BLR', 'bengaluru': 'BLR',
  'chennai': 'MAA',
  'kolkata': 'CCU',
  'hyderabad': 'HYD',
  'ahmedabad': 'AMD',
  'pune': 'PNQ',
  'jaipur': 'JAI',
  'goa': 'GOI',
  'kochi': 'COK', 'cochin': 'COK',
  'lucknow': 'LKO',
  'guwahati': 'GAU',
  'indore': 'IDR',
  'chandigarh': 'IXC',
  'nagpur': 'NAG',
  'thiruvananthapuram': 'TRV', 'trivandrum': 'TRV',
  'bhubaneswar': 'BBI',
  'agra': 'AGR',
  'varanasi': 'VNS',
  'amritsar': 'ATQ',
  'surat': 'STV',
  'vizag': 'VTZ', 'visakhapatnam': 'VTZ',
  'srinagar': 'SXR',
  'mangalore': 'IXE', 'mangaluru': 'IXE',
  'patna': 'PAT',
  'ranchi': 'IXR',
  'dehradun': 'DED',

  // Regional Indian Destinations
  'gwalior': 'GWL',
  'shillong': 'SHL',
  'gangtok': 'IXB',
  'darjeeling': 'IXB', 'dargiling': 'IXB',
  'leh': 'IXL',
  'jodhpur': 'JDH',
  'jaisalmer': 'JSA',
  'udaipur': 'UDR',
  'manali': 'KUU',
  'shimla': 'SLV',
  'rishikesh': 'DED',
  'haridwar': 'DED',
  'dharamshala': 'DHM',
  'pondicherry': 'PNY',
  'alleppey': 'COK',
  'munnar': 'COK',
  'ooty': 'CJB',
  'coorg': 'MYQ',
  'hampi': 'VDY',
  'gokarna': 'GOI',
  'anand': 'BDQ',

  // International Destinations
  'sharjah': 'SHJ',
  'dubai': 'DXB',
  'abu dhabi': 'AUH',
  'doha': 'DOH',
  'london': 'LHR',
  'paris': 'CDG',
  'new york': 'JFK',
  'bangkok': 'BKK',
  'singapore': 'SIN',
  'kuala lumpur': 'KUL',
  'colombo': 'CMB',
  'kathmandu': 'KTM',
  'maldives': 'MLE', 'male': 'MLE',
  'bali': 'DPS',
  'tokyo': 'HND', 'shibuya': 'HND',
  'osaka': 'KIX',
  'kyoto': 'ITM',
  'seoul': 'ICN',
  'phuket': 'HKT',
  'rome': 'FCO',
  'amsterdam': 'AMS',
  'frankfurt': 'FRA',
  'zurich': 'ZRH',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  'chicago': 'ORD',
  'toronto': 'YYZ',
  'vancouver': 'YVR',
  'sydney': 'SYD',
  'melbourne': 'MEL',
  'auckland': 'AKL',
  'cairo': 'CAI',
  'cape town': 'CPT',
  'nairobi': 'NBO',
  'istanbul': 'IST',
  'dubrovnik': 'DBV',
  'prague': 'PRG',
  'vienna': 'VIE',
  'berlin': 'BER',
  'lisbon': 'LIS',
  'madrid': 'MAD',
  'athens': 'ATH',
  'santorini': 'JTR',
  'taipei': 'TPE',
  'manila': 'MNL',
  'ho chi minh': 'SGN',
  'hanoi': 'HAN',
  'yangon': 'RGN',
  'dhaka': 'DAC',
  'islamabad': 'ISB',
  'karachi': 'KHI',
  'lahore': 'LHE',
  'muscat': 'MCT',
  'riyadh': 'RUH',
  'jeddah': 'JED',
  'dammam': 'DMM',
  'kuwait': 'KWI',
  'manama': 'BAH',
  'beijing': 'PEK',
  'shanghai': 'PVG',
  'hong kong': 'HKG',
  'europe': 'LHR'
};

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'bombay': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'new delhi': { lat: 28.7041, lng: 77.1025 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'madras': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'calcutta': { lat: 22.5726, lng: 88.3639 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'goa': { lat: 15.4909, lng: 73.8278 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'cochin': { lat: 9.9312, lng: 76.2673 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'trivandrum': { lat: 8.5241, lng: 76.9366 },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'vizag': { lat: 17.6868, lng: 83.2185 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'srinagar': { lat: 34.0837, lng: 74.7973 },
  'mangalore': { lat: 12.9141, lng: 74.8560 },
  'mangaluru': { lat: 12.9141, lng: 74.8560 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'sharjah': { lat: 25.3463, lng: 55.4209 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'abu dhabi': { lat: 24.4539, lng: 54.3773 },
  'doha': { lat: 25.2854, lng: 51.5310 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
  'colombo': { lat: 6.9271, lng: 79.8612 },
  'kathmandu': { lat: 27.7172, lng: 85.3240 },
  'maldives': { lat: 3.2028, lng: 73.2207 },
  'male': { lat: 4.1755, lng: 73.5093 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'bali': { lat: -8.3405, lng: 115.0920 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'dubrovnik': { lat: 42.6507, lng: 18.0944 },
  'prague': { lat: 50.0755, lng: 14.4378 },
  'vienna': { lat: 48.2082, lng: 16.3738 },
  'zurich': { lat: 47.3769, lng: 8.5417 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'athens': { lat: 37.9838, lng: 23.7275 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'nairobi': { lat: -1.2921, lng: 36.8219 },
  'santorini': { lat: 36.3932, lng: 25.4615 },
  'phuket': { lat: 7.8804, lng: 98.3923 },
  'kyoto': { lat: 35.0116, lng: 135.7681 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'taipei': { lat: 25.0330, lng: 121.5654 },
  'manila': { lat: 14.5995, lng: 120.9842 },
  'ho chi minh': { lat: 10.8231, lng: 106.6297 },
  'hanoi': { lat: 21.0278, lng: 105.8342 },
  'yangon': { lat: 16.8661, lng: 96.1951 },
  'dhaka': { lat: 23.8103, lng: 90.4125 },
  'islamabad': { lat: 33.6844, lng: 73.0479 },
  'karachi': { lat: 24.8607, lng: 67.0011 },
  'lahore': { lat: 31.5497, lng: 74.3436 },
  'muscat': { lat: 23.5880, lng: 58.3829 },
  'riyadh': { lat: 24.7136, lng: 46.6753 },
  'jeddah': { lat: 21.5433, lng: 39.1728 },
  'dammam': { lat: 26.4207, lng: 50.0888 },
  'kuwait': { lat: 29.3759, lng: 47.9774 },
  'manama': { lat: 26.2285, lng: 50.5860 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'manali': { lat: 32.2432, lng: 77.1892 },
  'rishikesh': { lat: 30.0869, lng: 78.2676 },
  'udaipur': { lat: 24.5854, lng: 73.7125 },
  'pondicherry': { lat: 11.9139, lng: 79.8145 },
  'darjeeling': { lat: 27.0360, lng: 88.2627 },
  // Common phonetic misspelling used in trip searches.
  'dargiling': { lat: 27.0360, lng: 88.2627 },
  'shimla': { lat: 31.1048, lng: 77.1734 },
  'mysore': { lat: 12.2958, lng: 76.6394 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'alleppey': { lat: 9.4981, lng: 76.3388 },
  'munnar': { lat: 10.0884, lng: 77.0595 },
  'ooty': { lat: 11.4112, lng: 76.6953 },
  'coorg': { lat: 12.4244, lng: 75.7382 },
  'jaisalmer': { lat: 26.9157, lng: 70.9083 },
  'jodhpur': { lat: 26.2389, lng: 73.0243 },
  'pushkar': { lat: 26.4907, lng: 74.5510 },
  'ajmer': { lat: 26.4499, lng: 74.6399 },
  'khajuraho': { lat: 24.8318, lng: 79.9199 },
  'gokarna': { lat: 14.5484, lng: 74.3162 },
  'hampi': { lat: 15.3350, lng: 76.4604 },
  'badami': { lat: 15.9186, lng: 75.6767 },
  'shillong': { lat: 25.5788, lng: 91.8933 },
  'gangtok': { lat: 27.3314, lng: 88.6138 },
  'pahalgam': { lat: 34.0151, lng: 75.3150 },
  'gulmarg': { lat: 34.0578, lng: 74.3782 },
  'leh': { lat: 34.1526, lng: 77.5770 },
  'spiti': { lat: 32.2463, lng: 78.0130 },
  'dharamshala': { lat: 32.2190, lng: 76.3234 },
  'haridwar': { lat: 29.9457, lng: 78.1642 },
  'bodh gaya': { lat: 24.6949, lng: 84.9911 },
  'mathura': { lat: 27.4924, lng: 77.6737 },
  'vrindavan': { lat: 27.5794, lng: 77.6967 },
  'ayodhya': { lat: 26.7956, lng: 82.2000 },
  'chittorgarh': { lat: 24.9135, lng: 74.6225 },
  'ranthambore': { lat: 26.0173, lng: 76.5026 },
  'kanha': { lat: 22.3200, lng: 80.6400 },
  'bandhavgarh': { lat: 23.7000, lng: 81.0333 },
  'kaziranga': { lat: 26.6775, lng: 93.3464 },
  'hennur': { lat: 12.9873, lng: 77.6358 },
  'anand': { lat: 22.5645, lng: 72.9289 },
};

import { getCached, setCached } from "./redis";

export function toAirportCode(input: string): string {
  if (!input) return input;
  const cleaned = input.split(',')[0].trim();
  if (/^[A-Z]{3}$/.test(cleaned)) return cleaned;
  const lower = cleaned.toLowerCase();
  return CITY_AIRPORT_MAP[lower] || cleaned;
}

export async function resolveAirportCode(input: string): Promise<string> {
  if (!input) return "";
  
  // 1. Clean and check synchronous dictionary
  const cleaned = input.split(',')[0].trim();
  if (/^[A-Z]{3}$/.test(cleaned)) return cleaned;
  const lower = cleaned.toLowerCase();
  if (CITY_AIRPORT_MAP[lower]) return CITY_AIRPORT_MAP[lower];

  // Substring match check (e.g. "Gwalior Airport" matches "gwalior")
  for (const [key, code] of Object.entries(CITY_AIRPORT_MAP)) {
    if (lower.includes(key) || key.includes(lower)) {
      return code;
    }
  }

  // 2. Cache Lookup
  const cacheKey = `tripmitra:iata:${lower}`;
  try {
    const cached = await getCached<string>(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.error("Cache lookup error for IATA:", err);
  }

  // 3. Gemini Resolution
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `What is the 3-letter IATA airport code of the closest primary airport to "${cleaned}"? Respond with a JSON object in this format: { "iata": "XYZ" } where XYZ is the uppercase 3-letter IATA code. If no airport exists or you are unsure, default to "BOM".` }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      if (response.ok) {
        const resData = await response.json();
        const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const obj = JSON.parse(text.trim());
          const codeText = obj.iata ? obj.iata.toUpperCase() : "BOM";
          if (/^[A-Z]{3}$/.test(codeText)) {
            try {
              // Cache for 30 days
              await setCached(cacheKey, codeText, 2592000);
            } catch (cErr) {
              console.error("Cache store error for IATA:", cErr);
            }
            return codeText;
          }
        }
      }
    } catch (gErr) {
      console.error("Gemini resolution failed for:", cleaned, gErr);
    }
  }

  // Fallback to "DEL" if not resolved to a valid IATA code, preventing 400 errors on SerpAPI
  if (!/^[A-Z]{3}$/.test(cleaned)) {
    console.warn(`[resolveAirportCode] Resolution failed for "${cleaned}". Using default fallback "DEL" to prevent 400 Bad Request.`);
    return "DEL";
  }

  return cleaned;
}

export async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function resolveCoords(input: string): Promise<{ lat: number; lng: number } | null> {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  if (CITY_COORDS[trimmed]) return CITY_COORDS[trimmed];

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.trim())}&count=1&language=en&format=json`;
    const geoRes = await fetchWithTimeout(geoUrl, 5000);
    const geoData = await geoRes.json();
    if (geoData.results && geoData.results.length > 0) {
      const result = geoData.results[0];
      return { lat: result.latitude, lng: result.longitude };
    }
  } catch (geoErr) {
    console.error("Geocoding error for:", input, geoErr);
  }
  return null;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
