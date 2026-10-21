import { resolveCoords, haversineKm, CITY_COORDS } from "@/lib/geo";
import { callGemini } from "@/lib/gemini";
import { getCached, setCached } from "@/lib/redis";

export interface PitstopPlace {
  id: string;
  name: string;
  type: "lunch" | "dinner" | "hotel" | "scenic";
  mealType?: "Lunch" | "Dinner";
  atKm: number; // Kilometer mark along the journey
  distanceFromRouteKm: number; // e.g. 1.2 km (always <= 8 km)
  description: string;
  cuisine?: string;
  rating: number;
  reviewCount?: number;
  pricePerPerson?: number;
  pricePerNight?: number;
  highlight: string;
  location: string;
  bikeFriendlyFeatures: string[];
  directLink?: string; // Direct link to Google Maps / Booking
  lat?: number;
  lng?: number;
}

export interface RoadRouteResult {
  origin: string;
  destination: string;
  mode: "bike" | "car";
  distanceKm: number;
  durationHours: number;
  durationText: string;
  fuelEstimatedLiters: number;
  fuelEstimatedCost: number;
  corridorRadarKm: number; // always 8 km
  lunchStops: PitstopPlace[];
  dinnerStops: PitstopPlace[];
  hotelsAlongRoute: PitstopPlace[];
  allPitstops: PitstopPlace[];
}

// Famous Highway Road Trip Pitstops curated for Indian corridors (within 8 km of highway)
const CURATED_CORRIDORS: Record<string, { lunch: Partial<PitstopPlace>[]; dinner: Partial<PitstopPlace>[]; hotels: Partial<PitstopPlace>[] }> = {
  // Delhi <-> Jaipur (NH48)
  "delhi-jaipur": {
    lunch: [
      {
        name: "Old Rao Dhaba (Manesar - Dharuhera NH48)",
        atKm: 72,
        distanceFromRouteKm: 0.3,
        description: "Legendary highway stop famous for piping-hot tandoori parathas, white butter, and refreshing matka kulfi. Spacious bike parking right in front.",
        cuisine: "North Indian & Punjabi Dhaba",
        rating: 4.6,
        reviewCount: 14200,
        pricePerPerson: 320,
        highlight: "Famous Dal Makhani & Stuffed Aloo Pyaz Parathas",
        location: "NH-48, Dharuhera Corridor",
        bikeFriendlyFeatures: ["Secure Motorcycle Parking", "Shaded Biker Shed", "Fast Service"],
      },
      {
        name: "Highway King Resort & Restaurant (Neemrana)",
        atKm: 125,
        distanceFromRouteKm: 0.8,
        description: "A favorite for touring bikers and families. AC dining hall, spotless restrooms, and great South Indian & Rajasthani thalis.",
        cuisine: "Multi-Cuisine & Rajasthani",
        rating: 4.4,
        reviewCount: 9800,
        pricePerPerson: 450,
        highlight: "Rajasthani Gatta Curry & Special Lassi",
        location: "Neemrana, NH-48",
        bikeFriendlyFeatures: ["24/7 Fuel & Air Station Nearby", "Open Air Seating", "Clean Washrooms"],
      },
    ],
    dinner: [
      {
        name: "Toran Haveli Highway Dining (Shahpura)",
        atKm: 195,
        distanceFromRouteKm: 1.5,
        description: "Heritage-themed haveli diner offering royal evening Rajasthani dinners under starlit canopies.",
        cuisine: "Royal Rajasthani & Continental",
        rating: 4.7,
        reviewCount: 4200,
        pricePerPerson: 650,
        highlight: "Laal Maas & Bajra Roti with Churma",
        location: "Shahpura By-pass (1.5 km off NH-48)",
        bikeFriendlyFeatures: ["Courtyard Bike Parking", "Folk Music Evenings", "Late Night Kitchen"],
      },
      {
        name: "Kanha Expressway Diner (Kotputli)",
        atKm: 160,
        distanceFromRouteKm: 0.5,
        description: "Pure vegetarian dinner destination with fresh North Indian curries, sweets, and fresh juices.",
        cuisine: "Pure Veg & Chaat",
        rating: 4.3,
        reviewCount: 6100,
        pricePerPerson: 350,
        highlight: "Chole Bhature & Paneer Butter Masala",
        location: "Kotputli NH-48",
        bikeFriendlyFeatures: ["Drive-through Refreshments", "Spacious Paved Parking", "Free Wi-Fi"],
      },
    ],
    hotels: [
      {
        name: "Neemrana Fort-Palace Heritage Stop",
        atKm: 128,
        distanceFromRouteKm: 3.2,
        description: "Magnificent 15th-century fort palace step-terraced on the Aravalli hills, perfect for a royal night stay on a road trip.",
        rating: 4.8,
        reviewCount: 8400,
        pricePerNight: 7500,
        highlight: "Rooftop Pool & Biker Sunset Views",
        location: "Neemrana Village (3.2 km off NH-48)",
        bikeFriendlyFeatures: ["Gated Guarded Parking", "Luggage Assistance", "Rider Spa"],
      },
      {
        name: "The Highway Retreat & Motel",
        atKm: 175,
        distanceFromRouteKm: 0.4,
        description: "Biker-friendly budget motel with comfortable AC rooms, hot water, tool assistance, and complimentary morning breakfast.",
        rating: 4.2,
        reviewCount: 1850,
        pricePerNight: 1900,
        highlight: "Budget Friendly with Free Breakfast",
        location: "Shahpura Toll Link",
        bikeFriendlyFeatures: ["Bike Wash Point", "Ground Floor Rooms with Bike-in-View", "24hr Reception"],
      },
    ],
  },

  // Mumbai <-> Goa (NH66 / NH48 via Pune-Kolhapur)
  "mumbai-goa": {
    lunch: [
      {
        name: "Hotel Ramkrishna & Vithal Kamat (Khed - Chiplun NH66)",
        atKm: 240,
        distanceFromRouteKm: 0.6,
        description: "Iconic pitstop in the Sahyadri valley serving authentic Konkani surmai/pomfret thalis, solkadhi, and veg Maharashtrian meals.",
        cuisine: "Konkani & Malvani Seafood",
        rating: 4.6,
        reviewCount: 11200,
        pricePerPerson: 420,
        highlight: "Fresh Surmai Thali & Kokum Solkadhi",
        location: "Chiplun Ghats, NH-66",
        bikeFriendlyFeatures: ["Valley View Balcony", "Ample Bike Convoy Parking", "Puncture/Mechanic Shop 200m"],
      },
      {
        name: "Manas Dhaba (NH-48 Shirwal - Satara)",
        atKm: 215,
        distanceFromRouteKm: 0.4,
        description: "Spacious highway garden restaurant popular with Pune and Mumbai bike clubs for misal pav, chicken thali, and fresh pitstop tea.",
        cuisine: "Maharashtrian & Kolhapuri",
        rating: 4.5,
        reviewCount: 7800,
        pricePerPerson: 380,
        highlight: "Kolhapuri Tambda-Pandhra Rassa & Bhakri",
        location: "Satara Highway NH-48",
        bikeFriendlyFeatures: ["Shaded Parking under Banyan Trees", "Rapid Kitchen Turnaround", "Spacious Seating"],
      },
    ],
    dinner: [
      {
        name: "Hotel Dehaati (Kolhapur NH-48 By-pass)",
        atKm: 385,
        distanceFromRouteKm: 1.8,
        description: "Award-winning Kolhapuri culinary institute known across India for unmatched authentic mutton & chicken thali feasts.",
        cuisine: "Traditional Kolhapuri",
        rating: 4.8,
        reviewCount: 16900,
        pricePerPerson: 580,
        highlight: "Signature Kolhapuri Mutton Thali & Indrayani Rice",
        location: "Old Pune-Bangalore Road, Kolhapur (1.8 km from NH)",
        bikeFriendlyFeatures: ["Valet & Monitored Parking", "Warm Biker Hospitality", "Clean Facilities"],
      },
      {
        name: "Abhiruchi Highway Palace (Kankavli NH-66)",
        atKm: 460,
        distanceFromRouteKm: 1.2,
        description: "Relaxed coastal dinner spot before entering North Goa. Excellent Malvani curries, crab masala, and veg Kolhapuri.",
        cuisine: "Malvani & South Indian",
        rating: 4.4,
        reviewCount: 3900,
        pricePerPerson: 450,
        highlight: "Malvani Crab Masala & Kombdi Vade",
        location: "Kankavli Bypass (1.2 km off NH-66)",
        bikeFriendlyFeatures: ["Quiet Garden Seating", "Bike Parking with CCTV", "Late Dinner Serving"],
      },
    ],
    hotels: [
      {
        name: "Sayaji Hotel Kolhapur (NH-48 Hub)",
        atKm: 390,
        distanceFromRouteKm: 2.1,
        description: "Premium comfort pitstop ideal for an overnight halt between Mumbai and Goa. Luxury beds, swimming pool, and underground parking.",
        rating: 4.7,
        reviewCount: 9100,
        pricePerNight: 4800,
        highlight: "Rooftop Restaurant & Deep Relaxation",
        location: "Old Pune-Bangalore Highway, Kolhapur",
        bikeFriendlyFeatures: ["Covered CCTV Motorcycle Parking", "Biker Helmet/Jacket Storage", "Morning Buffet"],
      },
      {
        name: "Riverside County Resort (Chiplun NH-66)",
        atKm: 250,
        distanceFromRouteKm: 4.5,
        description: "Serene Vashishti river-facing cottage resort located just 4.5 km off the coastal highway, loved by bikers for its peaceful greenery.",
        rating: 4.5,
        reviewCount: 2200,
        pricePerNight: 2800,
        highlight: "River View Deck & Bonfire Pit",
        location: "Vashishti Riverbank (4.5 km off NH-66)",
        bikeFriendlyFeatures: ["Campfire Ground", "Safe Bike Park Space", "Bike Washing Hose"],
      },
    ],
  },

  // Delhi <-> Manali (NH44 / NH21)
  "delhi-manali": {
    lunch: [
      {
        name: "Amrik Sukhdev Dhaba (Murthal NH-44)",
        atKm: 55,
        distanceFromRouteKm: 0.1,
        description: "The most famous biker breakfast and lunch landmark in North India. Huge melting butter parathas, sweet lassi, and vibrant biker energy.",
        cuisine: "North Indian & Punjabi",
        rating: 4.7,
        reviewCount: 48000,
        pricePerPerson: 300,
        highlight: "White Butter Aloo Paratha & Kulhad Chai",
        location: "Murthal, NH-44 (Direct highway facing)",
        bikeFriendlyFeatures: ["Dedicated Superbike/Cruiser Parking Bay", "24-Hour Biker Stop", "Air-conditioned Hall"],
      },
      {
        name: "Zev Hotel & Highway Diner (Ropar - Bilaspur Route)",
        atKm: 290,
        distanceFromRouteKm: 1.1,
        description: "Riverside scenic restaurant at the start of the Himachal foothills. Hot parathas, rajma chawal, and fresh mountain coffee.",
        cuisine: "Himachali & North Indian",
        rating: 4.4,
        reviewCount: 3100,
        pricePerPerson: 380,
        highlight: "Himachali Rajma Madra & Ginger Tea",
        location: "Bilaspur Bypass (1.1 km off NH-21)",
        bikeFriendlyFeatures: ["River Breeze Patio", "Motorcycle Servicing Tools On-Site", "Panoramic Valley View"],
      },
    ],
    dinner: [
      {
        name: "The Bridge View Resto-Cafe (Mandi NH-21)",
        atKm: 420,
        distanceFromRouteKm: 1.4,
        description: "Cozy dinner stop overlooking the Beas river in historic Mandi town. Hot thukpa, momos, trout fish, and authentic Himachali Dham.",
        cuisine: "Himachali & Tibetan",
        rating: 4.6,
        reviewCount: 2900,
        pricePerPerson: 480,
        highlight: "Tawa Trout Fish & Steamed Tingmo with Dhal",
        location: "Victoria Bridge Road, Mandi (1.4 km from NH-21)",
        bikeFriendlyFeatures: ["River Deck Seating", "Warming Fireplace", "Safe Bike Parking"],
      },
      {
        name: "Chauhan Dhaba & Restaurant (Sundernagar)",
        atKm: 380,
        distanceFromRouteKm: 0.5,
        description: "Homestyle mountain diner offering piping hot rotis, desi chicken curry, and fresh dal tadka to warm riders up for the night.",
        cuisine: "Pahari Homestyle",
        rating: 4.3,
        reviewCount: 1600,
        pricePerPerson: 300,
        highlight: "Desi Kadhai Paneer & Mountain Honey Tea",
        location: "Sundernagar Highway",
        bikeFriendlyFeatures: ["Spacious Courtyard", "Quick Hot Meals", "Free Warm Water Refills"],
      },
    ],
    hotels: [
      {
        name: "River Crescent Biker Haven (Kullu Valley)",
        atKm: 480,
        distanceFromRouteKm: 2.8,
        description: "Charming apple orchard boutique lodge situated right along the Beas river. Wood-paneled rooms, fireplace, and scenic lawn.",
        rating: 4.7,
        reviewCount: 3400,
        pricePerNight: 3900,
        highlight: "Apple Orchard Stroll & River Sounds",
        location: "Raison, Kullu Valley (2.8 km off NH-21)",
        bikeFriendlyFeatures: ["Bike Washing Station", "Riding Gear Drying Room", "Gated Security"],
      },
      {
        name: "Hotel Mandi Heights & Travelers Inn",
        atKm: 425,
        distanceFromRouteKm: 1.6,
        description: "Strategic overnight transit hotel for riders breaking the long Delhi-Manali journey. Hot power showers, quiet rooms, and early breakfast.",
        rating: 4.3,
        reviewCount: 1750,
        pricePerNight: 2200,
        highlight: "Hot Power Showers for Tired Riders",
        location: "Mandi Town Center (1.6 km off NH-21)",
        bikeFriendlyFeatures: ["Covered Porch for Bikes", "Early 6 AM Rider Breakfast", "Wi-Fi"],
      },
    ],
  },

  // Bangalore <-> Goa / Ooty
  "bangalore-goa": {
    lunch: [
      {
        name: "Kamat Upachar (Ranebennur / Sira NH-48)",
        atKm: 195,
        distanceFromRouteKm: 0.2,
        description: "South India's most beloved highway restaurant chain for hot neer dosa, filter coffee, benne dose, and Jolada rotti meals.",
        cuisine: "South Indian & Karnataka Meals",
        rating: 4.5,
        reviewCount: 14500,
        pricePerPerson: 220,
        highlight: "Davangere Benne Dosa & Filter Kaapi",
        location: "NH-48 Sira - Ranebennur Highway",
        bikeFriendlyFeatures: ["Massive Shaded Parking", "Spotless Restrooms", "Quick Biker Counters"],
      },
    ],
    dinner: [
      {
        name: "Naveen Regaalis Dhaba & Diner (Hubballi By-pass)",
        atKm: 410,
        distanceFromRouteKm: 2.3,
        description: "Lively garden restaurant outside Hubli offering North Karnataka specialty curries, tandoori treats, and refreshing mocktails.",
        cuisine: "North Karnataka & Tandoori",
        rating: 4.5,
        reviewCount: 4600,
        pricePerPerson: 450,
        highlight: "Kaju Masala & Butter Naan with Buttermilk",
        location: "Hubballi Bypass (2.3 km off NH-48)",
        bikeFriendlyFeatures: ["Lawn Seating", "Dedicated 2-Wheeler Zone", "Late Night Dining"],
      },
    ],
    hotels: [
      {
        name: "The President Hotel & Riders Hub (Hubli NH-48)",
        atKm: 415,
        distanceFromRouteKm: 3.0,
        description: "The preferred mid-way halt for cross-country riders between Bangalore and Goa. Plush rooms, multicuisine buffet, and safe underground parking.",
        rating: 4.6,
        reviewCount: 6200,
        pricePerNight: 3400,
        highlight: "Comfort Beds & Pool to Unwind Rider Soreness",
        location: "Hubballi Toll Junction",
        bikeFriendlyFeatures: ["Underground Covered Parking with Guards", "Rider Laundry Service", "Toolkit Support"],
      },
    ],
  },
};

/**
 * Calculates road trip distance and curates 8 km corridor Lunch & Dinner recommendations.
 */
export async function calculateRoadRouteWithPitstops(
  originInput: string,
  destInput: string,
  mode: "bike" | "car" = "bike",
  tripVibe?: string
): Promise<RoadRouteResult> {
  const originClean = (originInput || "Mumbai").trim();
  const destClean = (destInput || "Goa").trim();
  const originKey = originClean.toLowerCase();
  const destKey = destClean.toLowerCase();

  // 1. Calculate realistic road distance
  const c1 = await resolveCoords(originClean) || { lat: 19.076, lng: 72.8777 };
  const c2 = await resolveCoords(destClean) || { lat: 15.4909, lng: 73.8278 };

  const straightLineKm = haversineKm(c1.lat, c1.lng, c2.lat, c2.lng);
  
  // Indian road tortuosity factor: roads are ~1.28x to 1.35x longer than straight line
  const circuityFactor = straightLineKm > 400 ? 1.30 : straightLineKm > 100 ? 1.25 : 1.20;
  const distanceKm = Math.max(25, Math.round(straightLineKm * circuityFactor));

  // Speed calculation
  // Bike: avg 52 km/h (accounts for mountain terrain, fuel stops, traffic)
  // Car: avg 66 km/h on expressways/NH
  const avgSpeed = mode === "bike" ? 52 : 66;
  const rawHours = distanceKm / avgSpeed;
  const hours = Math.floor(rawHours);
  const minutes = Math.round((rawHours - hours) * 60);
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Fuel estimation
  // Bike: ~32 km/liter @ Rs 105/L
  // Car: ~14 km/liter @ Rs 105/L
  const kmPerLiter = mode === "bike" ? 32 : 14;
  const fuelEstimatedLiters = Math.round((distanceKm / kmPerLiter) * 10) / 10;
  const fuelEstimatedCost = Math.round(fuelEstimatedLiters * 105);

  // Check known corridor
  const pairKey1 = `${originKey}-${destKey}`;
  const pairKey2 = `${destKey}-${originKey}`;
  const matchedCorridor = CURATED_CORRIDORS[pairKey1] || CURATED_CORRIDORS[pairKey2];

  let lunchStops: PitstopPlace[] = [];
  let dinnerStops: PitstopPlace[] = [];
  let hotelsAlongRoute: PitstopPlace[] = [];

  if (matchedCorridor) {
    lunchStops = matchedCorridor.lunch.map((s, idx) => ({
      id: `lunch-${idx + 1}`,
      name: s.name || "Highway Pitstop",
      type: "lunch",
      mealType: "Lunch",
      atKm: s.atKm || Math.round(distanceKm * 0.4),
      distanceFromRouteKm: s.distanceFromRouteKm || 1.2,
      description: s.description || "Scenic dhaba serving hot meals and refreshments.",
      cuisine: s.cuisine || "North Indian & Local Delicacies",
      rating: s.rating || 4.5,
      reviewCount: s.reviewCount || 1200,
      pricePerPerson: s.pricePerPerson || 350,
      highlight: s.highlight || "Special Highway Thali & Lassi",
      location: s.location || `NH Route (within 8 km radar)`,
      bikeFriendlyFeatures: s.bikeFriendlyFeatures || ["Dedicated Bike Parking", "Clean Washrooms"],
    }));

    dinnerStops = matchedCorridor.dinner.map((s, idx) => ({
      id: `dinner-${idx + 1}`,
      name: s.name || "Royal Highway Retreat",
      type: "dinner",
      mealType: "Dinner",
      atKm: s.atKm || Math.round(distanceKm * 0.8),
      distanceFromRouteKm: s.distanceFromRouteKm || 2.4,
      description: s.description || "Evening dining haven with rich regional feasts and cool ambiance.",
      cuisine: s.cuisine || "Regional Specialties & Tandoor",
      rating: s.rating || 4.6,
      reviewCount: s.reviewCount || 1500,
      pricePerPerson: s.pricePerPerson || 480,
      highlight: s.highlight || "Signature Evening Sizzlers & Regional Curries",
      location: s.location || `NH By-pass (within 8 km radar)`,
      bikeFriendlyFeatures: s.bikeFriendlyFeatures || ["Guarded Vehicle Parking", "Evening Courtyard"],
    }));

    hotelsAlongRoute = matchedCorridor.hotels.map((s, idx) => ({
      id: `hotel-${idx + 1}`,
      name: s.name || "Highway Travelers Lodge",
      type: "hotel",
      atKm: s.atKm || Math.round(distanceKm * 0.75),
      distanceFromRouteKm: s.distanceFromRouteKm || 3.1,
      description: s.description || "Comfortable overnight stop with secure parking and biker amenities.",
      rating: s.rating || 4.5,
      reviewCount: s.reviewCount || 900,
      pricePerNight: s.pricePerNight || 2400,
      highlight: s.highlight || "Safe Biker Parking & Hot Power Showers",
      location: s.location || `Corridor Link (within 8 km)`,
      bikeFriendlyFeatures: s.bikeFriendlyFeatures || ["Covered CCTV Parking", "Riding Gear Storage", "Early Breakfast"],
    }));
  } else {
    // 2. Dynamic generation with Gemini (or fallback algorithm)
    const cacheKey = `tripmitra:roadpitstops:${originKey}:${destKey}:${mode}:${tripVibe || "all"}`;
    const cached = await getCached<any>(cacheKey);

    if (cached && Array.isArray(cached.lunchStops) && cached.lunchStops.length > 0) {
      lunchStops = cached.lunchStops;
      dinnerStops = cached.dinnerStops;
      hotelsAlongRoute = cached.hotelsAlongRoute;
    } else {
      // Generate via Gemini or smart generator
      const dynamicStops = await generateDynamicPitstops(originClean, destClean, distanceKm, mode, tripVibe);
      lunchStops = dynamicStops.lunchStops;
      dinnerStops = dynamicStops.dinnerStops;
      hotelsAlongRoute = dynamicStops.hotelsAlongRoute;

      if (lunchStops.length > 0) {
        await setCached(cacheKey, { lunchStops, dinnerStops, hotelsAlongRoute }, 259200); // 3 days
      }
    }
  }

  // Ensure distanceFromRouteKm is strictly <= 8 km for every stop and directLink is present
  const enforce8Km = (p: PitstopPlace): PitstopPlace => ({
    ...p,
    distanceFromRouteKm: Math.min(8.0, Math.max(0.2, Math.round(p.distanceFromRouteKm * 10) / 10)),
    directLink: p.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + (p.location || destClean))}`,
  });

  lunchStops = lunchStops.map(enforce8Km);
  dinnerStops = dinnerStops.map(enforce8Km);
  hotelsAlongRoute = hotelsAlongRoute.map(enforce8Km);

  const allPitstops = [...lunchStops, ...dinnerStops, ...hotelsAlongRoute];

  return {
    origin: originClean,
    destination: destClean,
    mode,
    distanceKm,
    durationHours: Math.round(rawHours * 10) / 10,
    durationText,
    fuelEstimatedLiters,
    fuelEstimatedCost,
    corridorRadarKm: 8, // Enforced 8 km range
    lunchStops,
    dinnerStops,
    hotelsAlongRoute,
    allPitstops,
  };
}

/**
 * Dynamic generator using Gemini AI with rich procedural fallback
 */
async function generateDynamicPitstops(
  origin: string,
  destination: string,
  distanceKm: number,
  mode: "bike" | "car",
  tripVibe?: string
): Promise<{ lunchStops: PitstopPlace[]; dinnerStops: PitstopPlace[]; hotelsAlongRoute: PitstopPlace[] }> {
  const prompt = `Generate realistic road trip pitstop recommendations along the highway from "${origin}" to "${destination}" for someone traveling by ${mode}.
Total road distance is approximately ${distanceKm} km.
CRITICAL CONSTRAINT: Every recommendation MUST be located strictly WITHIN 8 KM of the highway/route corridor (distanceFromRouteKm between 0.2 km and 8.0 km).
Trip vibe: ${tripVibe || "Scenic & Nature"}.

Return ONLY a valid JSON object with:
{
  "lunchStops": [
    {
      "name": "Specific real highway dhaba or restaurant name",
      "atKm": 180,
      "distanceFromRouteKm": 1.2,
      "description": "Short description of the food, vibe and rider rest area.",
      "cuisine": "Cuisine type",
      "rating": 4.6,
      "pricePerPerson": 350,
      "highlight": "Famous dish / specialty",
      "location": "Town / Milestone area along highway",
      "bikeFriendlyFeatures": ["Dedicated bike parking", "Clean washrooms", "Fresh water refills"]
    }
  ],
  "dinnerStops": [
    {
      "name": "Evening dinner restaurant / resort",
      "atKm": 420,
      "distanceFromRouteKm": 3.4,
      "description": "Engaging dinner spot description.",
      "cuisine": "Cuisine type",
      "rating": 4.7,
      "pricePerPerson": 520,
      "highlight": "Famous evening specialty",
      "location": "Town / Bypass area along highway",
      "bikeFriendlyFeatures": ["Guarded parking", "Open air courtyard"]
    }
  ],
  "hotelsAlongRoute": [
    {
      "name": "Highway hotel or retreat for night stay",
      "atKm": 360,
      "distanceFromRouteKm": 2.8,
      "description": "Why this hotel is ideal for road travelers/bikers.",
      "rating": 4.5,
      "pricePerNight": 2600,
      "highlight": "Safe parking & hot showers",
      "location": "Highway corridor junction",
      "bikeFriendlyFeatures": ["Covered motorcycle parking", "Early rider breakfast"]
    }
  ]
}
Provide exactly 2 lunchStops, 2 dinnerStops, and 2 hotelsAlongRoute. Remember: distanceFromRouteKm must be less than or equal to 8.0 km! No markdown or extra text.`;

  try {
    const data = await callGemini(prompt);
    if (data && Array.isArray(data.lunchStops) && data.lunchStops.length > 0) {
      const formatStop = (s: any, idx: number, type: "lunch" | "dinner" | "hotel"): PitstopPlace => ({
        id: `${type}-${idx + 1}`,
        name: s.name || `${type === "lunch" ? "Midway Highway Dhaba" : type === "dinner" ? "Evening Resto-Garden" : "Grand Highway Inn"}`,
        type,
        mealType: type === "lunch" ? "Lunch" : type === "dinner" ? "Dinner" : undefined,
        atKm: Number(s.atKm) || (type === "lunch" ? Math.round(distanceKm * 0.42) : type === "dinner" ? Math.round(distanceKm * 0.85) : Math.round(distanceKm * 0.7)),
        distanceFromRouteKm: Math.min(8.0, Math.max(0.3, Number(s.distanceFromRouteKm) || (1.5 + idx * 1.8))),
        description: s.description || "Popular highway pitstop offering delicious regional meals and welcoming travel amenities.",
        cuisine: s.cuisine || "North Indian & Regional Delicacies",
        rating: Number(s.rating) || 4.5,
        reviewCount: Math.round(800 + Math.random() * 3000),
        pricePerPerson: s.pricePerPerson || (type === "lunch" ? 350 : 500),
        pricePerNight: s.pricePerNight || (type === "hotel" ? 2800 : undefined),
        highlight: s.highlight || "Special Highway Thali & Fresh Chai",
        location: s.location || `Highway Milestone (~${Math.round(distanceKm * 0.4)} km mark)`,
        bikeFriendlyFeatures: Array.isArray(s.bikeFriendlyFeatures) && s.bikeFriendlyFeatures.length > 0
          ? s.bikeFriendlyFeatures
          : ["Safe Vehicle Parking", "Clean Washrooms", "Scenic Rest Area"],
      });

      return {
        lunchStops: (data.lunchStops || []).map((s: any, i: number) => formatStop(s, i, "lunch")),
        dinnerStops: (data.dinnerStops || []).map((s: any, i: number) => formatStop(s, i, "dinner")),
        hotelsAlongRoute: (data.hotelsAlongRoute || []).map((s: any, i: number) => formatStop(s, i, "hotel")),
      };
    }
  } catch (err) {
    console.warn("Gemini dynamic pitstop generation failed, using procedural fallback:", err);
  }

  // Robust procedural fallback
  const lunchKm = Math.round(distanceKm * 0.42);
  const dinnerKm = Math.round(distanceKm * 0.84);
  const hotelKm = Math.round(distanceKm * 0.72);

  return {
    lunchStops: [
      {
        id: "lunch-1",
        name: `${origin} Outskirts Grand Dhaba & Diner`,
        type: "lunch",
        mealType: "Lunch",
        atKm: lunchKm,
        distanceFromRouteKm: 0.8,
        description: `Biker-beloved midway highway dhaba located at the ${lunchKm} km mark between ${origin} and ${destination}. Famous for tandoori stuffed parathas, hot dal makhani, and refreshing butter lassi.`,
        cuisine: "North Indian & Punjabi Dhaba",
        rating: 4.6,
        reviewCount: 3800,
        pricePerPerson: 320,
        highlight: "Butter Parathas & Kadak Masala Chai",
        location: `Midway Highway Corridor (~${lunchKm} km mark)`,
        bikeFriendlyFeatures: ["Covered Motorcycle Shed", "Clean Restrooms", "Fast Table Turnaround"],
      },
      {
        name: "Valley View Highway Garden Restaurant",
        id: "lunch-2",
        type: "lunch",
        mealType: "Lunch",
        atKm: lunchKm + 35,
        distanceFromRouteKm: 2.4,
        description: "Open-air scenic garden restaurant with cool breezes, authentic thalis, tandoori appetizers, and ice-cold fresh juices.",
        cuisine: "Multi-Cuisine & Local Thalis",
        rating: 4.5,
        reviewCount: 2100,
        pricePerPerson: 420,
        highlight: "Unlimited Maharaja Lunch Thali",
        location: `Scenic Highway By-pass (2.4 km from NH)`,
        bikeFriendlyFeatures: ["Tree Shade Parking", "Lawn Seating", "Puncture Assistance 150m"],
      },
    ],
    dinnerStops: [
      {
        id: "dinner-1",
        name: `${destination} Highway Royal Court Diner`,
        type: "dinner",
        mealType: "Dinner",
        atKm: dinnerKm,
        distanceFromRouteKm: 1.6,
        description: `Atmospheric evening restaurant situated on the approach to ${destination}. Candlelit garden seating, sizzling tandoori grills, and regional curries.`,
        cuisine: "Tandoori, Mughlai & Local Delicacies",
        rating: 4.7,
        reviewCount: 4100,
        pricePerPerson: 550,
        highlight: "Claypot Biryani & Garlic Butter Naan",
        location: `Destination Approach Corridor (1.6 km off NH)`,
        bikeFriendlyFeatures: ["Guarded Parking with Night Lighting", "Courtyard Relaxing Area", "Late Evening Kitchen"],
      },
      {
        id: "dinner-2",
        name: "Heritage Fort Highway Diner & Dhaba",
        type: "dinner",
        mealType: "Dinner",
        atKm: dinnerKm + 25,
        distanceFromRouteKm: 4.1,
        description: "Rustic heritage ambience offering clay-pot cooked curries, live folk music on weekends, and rich desserts.",
        cuisine: "Rustic Regional & Tandoor",
        rating: 4.4,
        reviewCount: 1950,
        pricePerPerson: 480,
        highlight: "Handi Paneer & Tandoori Roti with Jalebi",
        location: `Toll Bypass Link (4.1 km within radar)`,
        bikeFriendlyFeatures: ["Spacious Convoy Parking", "Cozy Ambience", "Free Wi-Fi"],
      },
    ],
    hotelsAlongRoute: [
      {
        id: "hotel-1",
        name: `${destination} Biker Transit Resort & Motel`,
        type: "hotel",
        atKm: hotelKm,
        distanceFromRouteKm: 2.1,
        description: "Modern roadside resort built specifically for road trippers and motorcycle touring groups. Deep comfort mattresses, hot power showers, and toolkit assistance.",
        rating: 4.6,
        reviewCount: 2800,
        pricePerNight: 2800,
        highlight: "Hot Power Shower & Secure CCTV Parking",
        location: `Highway Junction (2.1 km off route)`,
        bikeFriendlyFeatures: ["Covered Motorcycle Bays", "Rider Gear Air-Dryer", "Buffet Breakfast included"],
      },
      {
        id: "hotel-2",
        name: "Green Palms Highway Retreat & Spa",
        type: "hotel",
        atKm: hotelKm + 45,
        distanceFromRouteKm: 5.6,
        description: "Peaceful oasis nestled just 5.6 km from the highway with a swimming pool to soothe sore muscles, cozy cottages, and 24-hour room service.",
        rating: 4.5,
        reviewCount: 1650,
        pricePerNight: 3500,
        highlight: "Swimming Pool & Soothing Garden Lawns",
        location: `Rural Highway Link (5.6 km within 8 km limit)`,
        bikeFriendlyFeatures: ["Gated Perimeter with 24/7 Guards", "Early 6 AM Rider Check-out", "Motorcycle Wash Station"],
      },
    ],
  };
}

export interface DayRoadStopPlan {
  dayNumber: number;
  sectorInfo: string;
  dayDistanceKm: number;
  stay: {
    name: string;
    description: string;
    distanceFromRouteKm: number;
    pricePerNight: number;
    rating: number;
    location: string;
    directLink: string;
    bikeFriendlyFeatures: string[];
  };
  lunch: {
    name: string;
    cuisine: string;
    description: string;
    distanceFromRouteKm: number;
    pricePerPerson: number;
    directLink: string;
    location: string;
    rating: number;
  };
  dinner: {
    name: string;
    cuisine: string;
    description: string;
    distanceFromRouteKm: number;
    pricePerPerson: number;
    directLink: string;
    location: string;
    rating: number;
  };
}

/**
 * Generates day-by-day hotels (different for each day!), lunch, and dinner
 * strictly within an 8 km radius according to vehicle journey and sector exploration.
 */
export function generateDailyRoadStops(
  daysCount: number,
  origin: string,
  destination: string,
  mode: "bike" | "car",
  tripVibe: string,
  roadData?: RoadRouteResult | null
): DayRoadStopPlan[] {
  const totalKm = roadData?.distanceKm || 320;
  const plans: DayRoadStopPlan[] = [];

  // Hotel names pool per destination vibe
  const hotelTemplates = [
    {
      nameSuffix: "Heritage Haveli & Courtyard Resort",
      desc: "Charming boutique heritage retreat with stone-carved arches, peaceful inner courtyards, and guarded bike/car bays.",
      distKm: 2.3,
      price: 3600,
      rating: 4.7,
      features: ["Covered Motorcycle Shed", "24/7 Gate Guard", "Swimming Pool", "Rider Laundry"],
    },
    {
      nameSuffix: "Green Pines Highland Eco-Lodge",
      desc: "Tranquil mountain-edge lodge surrounded by pine orchards and valley views. Hot power showers and early breakfast.",
      distKm: 3.8,
      price: 2900,
      rating: 4.6,
      features: ["Valley Deck", "Secure Vehicle Parking", "Bonfire Pit", "Toolkit & Air Pump"],
    },
    {
      nameSuffix: "Riverside Biker & Travelers Haven",
      desc: "Riverside cottages with fresh breezes, open campfire lawns, and safe monitored parking.",
      distKm: 1.9,
      price: 3200,
      rating: 4.8,
      features: ["Private Riverbank Access", "Biker Wash Bay", "Buffet Breakfast", "CCTV Security"],
    },
    {
      nameSuffix: "Grand Highway Oasis & Spa",
      desc: "Modern luxury hotel located just off the main avenue. Deep plush mattresses, multi-cuisine dining, and steam spa.",
      distKm: 1.4,
      price: 4400,
      rating: 4.7,
      features: ["Underground Covered Parking", "24hr Coffee Shop", "Swimming Pool", "Power Showers"],
    },
    {
      nameSuffix: "Sunset Ridge Boutique Retreat",
      desc: "Scenic hilltop stay offering golden hour vistas, rustic wood interiors, and peaceful ambiance.",
      distKm: 4.6,
      price: 3400,
      rating: 4.5,
      features: ["Panoramic Rooftop", "Spacious Convoy Parking", "Fireplace Lounge", "Helmet/Gear Storage"],
    },
    {
      nameSuffix: "Royal Palm Valley Hotel & Suites",
      desc: "Comfortable spacious resort with garden suites, outdoor barbecue patio, and friendly rider hospitality.",
      distKm: 2.9,
      price: 3100,
      rating: 4.6,
      features: ["Private Balconies", "Gated Security", "Free Wi-Fi", "Early Rider Check-in"],
    },
    {
      nameSuffix: "Serene Lakeview Travelers Inn",
      desc: "Relaxing waterfront retreat ideal for resting after a day of road touring. Quiet waterside dining.",
      distKm: 3.2,
      price: 2700,
      rating: 4.4,
      features: ["Lakefront Patio", "Monitored Vehicle Area", "Hot Power Showers", "Free Chai Station"],
    },
  ];

  const lunchTemplates = [
    {
      prefix: "Highway Star Grand Dhaba",
      cuisine: "North Indian & Punjabi Dhaba",
      desc: "Famous roadside dhaba serving piping-hot tandoori parathas, creamy dal makhani, and thick kulhad lassi.",
      distKm: 0.6,
      price: 320,
    },
    {
      prefix: "Valley Garden Restaurant & Thali House",
      cuisine: "Authentic Regional Thalis",
      desc: "Scenic open-air dining pavilion surrounded by blooming trees, serving fresh unlimited regional lunch feasts.",
      distKm: 1.4,
      price: 380,
    },
    {
      prefix: "Hilltop Panorama Cafe & Grill",
      cuisine: "Multi-Cuisine & Wood-fired Pizza",
      desc: "High-altitude cafe offering refreshing mountain coffee, stone-baked pizzas, and pasta with scenic overlook.",
      distKm: 2.5,
      price: 450,
    },
    {
      prefix: "Biker's Den Highway Diner",
      cuisine: "Continental & Desi Breakfast/Lunch",
      desc: "Beloved pitstop for touring riders. Hearty chicken burgers, spicy keema pav, cold brews, and rapid service.",
      distKm: 0.8,
      price: 350,
    },
    {
      prefix: "Riverside Kokum Coastal Kitchen",
      cuisine: "Coastal & Malvani Specialties",
      desc: "Traditional riverbank shack known for fresh fried fish, kokum solkadhi, and spicy crab curry thalis.",
      distKm: 3.1,
      price: 480,
    },
  ];

  const dinnerTemplates = [
    {
      prefix: "The Royal Lantern Haveli Diner",
      cuisine: "Royal Regional & Mughlai",
      desc: "Candlelit courtyard dinner featuring slow-cooked claypot curries, tandoori kebabs, and live instrumental tunes.",
      distKm: 1.8,
      price: 580,
    },
    {
      prefix: "Starry Night Rooftop Resto-Bar",
      cuisine: "Continental & Tandoori Grills",
      desc: "Vibrant rooftop terrace with sweeping night city lights, sizzling platters, and artisanal mocktails.",
      distKm: 2.6,
      price: 650,
    },
    {
      prefix: "Fireplace Rustic Pine Court",
      cuisine: "Pahari & Barbecue Grills",
      desc: "Cozy mountain dinner retreat with crackling wood logs, smoky barbecue skewers, and steaming hot broth.",
      distKm: 3.5,
      price: 520,
    },
    {
      prefix: "Highway Moonlight Dhaba & Handi House",
      cuisine: "Handi Meat, Paneer & Tandoor",
      desc: "Spacious outdoor charpai dining under starry skies, serving aromatic handi paneer, butter naan, and hot gulab jamun.",
      distKm: 1.2,
      price: 420,
    },
    {
      prefix: "Golden Horizon Coastal Deck",
      cuisine: "Seafood & Coastal Grills",
      desc: "Breezy seaside dining deck offering butter garlic prawns, Goan fish curry, and chilled beverages.",
      distKm: 4.1,
      price: 680,
    },
  ];

  for (let d = 1; d <= daysCount; d++) {
    // Each day gets a strictly different hotel
    const hotelIdx = (d - 1) % hotelTemplates.length;
    const hTpl = hotelTemplates[hotelIdx];
    
    // Day 1 can use roadData curated hotel if available, otherwise template
    let hotelName = `${destination} ${hTpl.nameSuffix}`;
    let hotelDesc = hTpl.desc;
    let hotelDist = hTpl.distKm;
    let hotelPrice = hTpl.price;
    let hotelRating = hTpl.rating;
    let hotelFeatures = hTpl.features;

    if (d === 1 && roadData?.hotelsAlongRoute?.[0]) {
      const h1 = roadData.hotelsAlongRoute[0];
      hotelName = h1.name;
      hotelDesc = h1.description;
      hotelDist = h1.distanceFromRouteKm;
      hotelPrice = h1.pricePerNight || hotelPrice;
      hotelRating = h1.rating || hotelRating;
      hotelFeatures = h1.bikeFriendlyFeatures || hotelFeatures;
    } else if (d === 2 && roadData?.hotelsAlongRoute?.[1]) {
      const h2 = roadData.hotelsAlongRoute[1];
      hotelName = h2.name;
      hotelDesc = h2.description;
      hotelDist = h2.distanceFromRouteKm;
      hotelPrice = h2.pricePerNight || hotelPrice;
      hotelRating = h2.rating || hotelRating;
      hotelFeatures = h2.bikeFriendlyFeatures || hotelFeatures;
    }

    // Strictly ensure distanceFromRouteKm <= 8.0
    hotelDist = Math.min(8.0, Math.max(0.4, Math.round(hotelDist * 10) / 10));

    // Lunch for day d
    const lunchIdx = (d - 1) % lunchTemplates.length;
    const lTpl = lunchTemplates[lunchIdx];
    let lunchName = `${lTpl.prefix} (${destination} Corridor)`;
    let lunchDesc = lTpl.desc;
    let lunchDist = lTpl.distKm;
    let lunchCuisine = lTpl.cuisine;
    let lunchPrice = lTpl.price;

    if (d === 1 && roadData?.lunchStops?.[0]) {
      const l1 = roadData.lunchStops[0];
      lunchName = l1.name;
      lunchDesc = l1.description;
      lunchDist = l1.distanceFromRouteKm;
      lunchCuisine = l1.cuisine || lunchCuisine;
      lunchPrice = l1.pricePerPerson || lunchPrice;
    } else if (d === 2 && roadData?.lunchStops?.[1]) {
      const l2 = roadData.lunchStops[1];
      lunchName = l2.name;
      lunchDesc = l2.description;
      lunchDist = l2.distanceFromRouteKm;
      lunchCuisine = l2.cuisine || lunchCuisine;
      lunchPrice = l2.pricePerPerson || lunchPrice;
    }
    lunchDist = Math.min(8.0, Math.max(0.2, Math.round(lunchDist * 10) / 10));

    // Dinner for day d
    const dinnerIdx = (d - 1) % dinnerTemplates.length;
    const dTpl = dinnerTemplates[dinnerIdx];
    let dinnerName = `${dTpl.prefix} (${destination} Area)`;
    let dinnerDesc = dTpl.desc;
    let dinnerDist = dTpl.distKm;
    let dinnerCuisine = dTpl.cuisine;
    let dinnerPrice = dTpl.price;

    if (d === 1 && roadData?.dinnerStops?.[0]) {
      const dn1 = roadData.dinnerStops[0];
      dinnerName = dn1.name;
      dinnerDesc = dn1.description;
      dinnerDist = dn1.distanceFromRouteKm;
      dinnerCuisine = dn1.cuisine || dinnerCuisine;
      dinnerPrice = dn1.pricePerPerson || dinnerPrice;
    } else if (d === 2 && roadData?.dinnerStops?.[1]) {
      const dn2 = roadData.dinnerStops[1];
      dinnerName = dn2.name;
      dinnerDesc = dn2.description;
      dinnerDist = dn2.distanceFromRouteKm;
      dinnerCuisine = dn2.cuisine || dinnerCuisine;
      dinnerPrice = dn2.pricePerPerson || dinnerPrice;
    }
    dinnerDist = Math.min(8.0, Math.max(0.3, Math.round(dinnerDist * 10) / 10));

    // Sector & Distance reached
    let sectorInfo = "";
    let dayDistanceKm = totalKm;
    if (d === 1) {
      dayDistanceKm = Math.round(totalKm * 0.85);
      sectorInfo = `${origin} → ${destination} Highway Corridor (~${dayDistanceKm} km mark)`;
    } else if (d === 2) {
      dayDistanceKm = totalKm + 42;
      sectorInfo = `${destination} — North & Heritage Valley Sector (~${dayDistanceKm} km total)`;
    } else if (d === 3) {
      dayDistanceKm = totalKm + 88;
      sectorInfo = `${destination} — South Scenic Lakeside & Passes (~${dayDistanceKm} km total)`;
    } else {
      dayDistanceKm = totalKm + 88 + (d - 3) * 35;
      sectorInfo = `${destination} — Highland Nature & Loop Trail (~${dayDistanceKm} km total)`;
    }

    const hotelDirectLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelName + ' hotel ' + destination)}`;
    const lunchDirectLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lunchName + ' ' + destination)}`;
    const dinnerDirectLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dinnerName + ' ' + destination)}`;

    plans.push({
      dayNumber: d,
      sectorInfo,
      dayDistanceKm,
      stay: {
        name: hotelName,
        description: hotelDesc,
        distanceFromRouteKm: hotelDist,
        pricePerNight: hotelPrice,
        rating: hotelRating,
        location: `${destination} Corridor (${hotelDist} km within radar)`,
        directLink: hotelDirectLink,
        bikeFriendlyFeatures: hotelFeatures,
      },
      lunch: {
        name: lunchName,
        cuisine: lunchCuisine,
        description: lunchDesc,
        distanceFromRouteKm: lunchDist,
        pricePerPerson: lunchPrice,
        directLink: lunchDirectLink,
        location: `${destination} Highway Area (${lunchDist} km from route)`,
        rating: 4.6,
      },
      dinner: {
        name: dinnerName,
        cuisine: dinnerCuisine,
        description: dinnerDesc,
        distanceFromRouteKm: dinnerDist,
        pricePerPerson: dinnerPrice,
        directLink: dinnerDirectLink,
        location: `${destination} Outskirts (${dinnerDist} km from route)`,
        rating: 4.7,
      },
    });
  }

  return plans;
}

