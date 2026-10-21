import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { checkRateLimit, getCached, setCached } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const limitCheck = await checkRateLimit(ip, 25, 60);
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": limitCheck.limit.toString(),
            "X-RateLimit-Remaining": limitCheck.remaining.toString(),
          }
        }
      );
    }

    const { destination, originCity, travelers, days, budgetLimit, transportMode = "bike", groupType = "solo", tripVibe = "nature" } = await request.json();
    const requestedDays = Math.min(30, Math.max(1, Number(days) || 3));
    const generatedDays = requestedDays > 7 ? 7 : requestedDays;
    const longTripNote = requestedDays > 7 ? `Showing optimal 7-day highlight route for ${destination}.` : '';

    if (!destination) {
      return NextResponse.json({ error: "Missing destination" }, { status: 400 });
    }

    // Road route and daily 8 km hotel/meal plans
    let roadData: any = null;
    let dailyPlans: any[] = [];
    try {
      const { calculateRoadRouteWithPitstops, generateDailyRoadStops } = await import("@/lib/roadRouteEngine");
      if (transportMode === "bike" || transportMode === "car") {
        roadData = await calculateRoadRouteWithPitstops(
          originCity || "Mumbai",
          destination,
          transportMode,
          tripVibe
        );
      }
      dailyPlans = generateDailyRoadStops(
        generatedDays,
        originCity || "Mumbai",
        destination,
        transportMode as any,
        tripVibe,
        roadData
      );
    } catch (rErr) {
      console.warn("Road route engine warning:", rErr);
    }

    // 2. Cache Lookup
    const cacheKey = `tripmitra:itinerary:v2:${destination.toLowerCase().trim()}:${originCity?.toLowerCase()?.trim() || "mumbai"}:${generatedDays}:${travelers || 1}:${budgetLimit || 50000}:${transportMode}:${groupType}:${tripVibe}`;
    const cachedItinerary = await getCached<any>(cacheKey);
    if (cachedItinerary) {
      return NextResponse.json({
        ...cachedItinerary,
        roadRoute: roadData,
        isCached: true,
      });
    }

    const vibeGuidelines = tripVibe === "spiritual"
      ? "Focus prominently on spiritual temples, sacred ghats, evening aarti, heritage shrines, and peaceful meditation."
      : tripVibe === "adventures"
      ? "Focus prominently on high-thrill adventures, trekking trails, scenic bike passes, river/outdoor sports, and rugged viewpoints."
      : "Focus prominently on untouched nature, scenic green valleys, cascading waterfalls, tranquil lakes, and breathtaking sunrise/sunset points.";

    const transportGuidelines = (transportMode === "bike" || transportMode === "car")
      ? `The traveler is traveling by ${transportMode.toUpperCase()} (approx ${roadData?.distanceKm || 'scenic'} km highway corridor from ${originCity || 'origin'}). Day 1 MUST start with an early morning scenic ride departure from ${originCity || 'origin'}, feature a midway highway Lunch Dhaba pitstop (within 8 km of highway), and conclude with evening arrival and Dinner in ${destination}.`
      : `The traveler is traveling by ${transportMode.toUpperCase()} from ${originCity || 'origin'}. Day 1 begins with arrival in ${destination}.`;

    const groupGuidelines = `Travel group: ${groupType.toUpperCase()} (${travelers || 1} person(s)). Tailor the pace, dining, and activities perfectly for ${groupType} travel.`;

    const prompt = `Generate a realistic ${generatedDays}-day travel itinerary for ${destination}.
Departure origin: ${originCity || 'their origin city'}.
Mode of travel: ${transportMode} (bike/car/train/flight).
Travel group: ${groupType} (${travelers || 1} traveler(s)).
Travel Vibe / Category: ${tripVibe} (Spiritual, Adventures, or Nature).
Total budget limit: Rs ${budgetLimit || 'flexible'}.

CRITICAL REQUIREMENTS:
1. DYNAMIC NUMBER OF PLACES PER DAY & TIME DURATION:
   - DO NOT limit to a fixed 3 places every day!
   - On days where places are close together or quick to explore (e.g. markets, photo spots, viewpoints, small shrines), provide 4 to 5 places with durations like "1 hour" or "1.5 hours".
   - On days where an activity is large, extensive, or demanding (e.g. 4-hour mountain trek, massive fort exploration, wildlife safari, scuba diving/water sports, or high mountain pass scenic road trip), provide 2 places of around "4 hours" each!
   - Other days can have 3 places of around "2 hours" each.
2. ENTRY TICKETS & COSTS:
   - For EVERY single activity/place, state whether entry ticket is needed (hasTicket: true/false), the exact ticket cost per person in INR (ticketCost: number, 0 if free), and ticket note (ticketInfo: string, e.g. "Free Entry", "₹250 per adult", "₹50 (Indians) / ₹300 (Foreigners)").
3. DIFFERENT HOTEL EACH DAY & MEALS WITHIN 8 KM RADIUS:
   - Each day MUST recommend a DIFFERENT hotel for night stay, lunch stop, and dinner spot, all located strictly within an 8 km radius of their route/exploration corridor (distanceFromRouteKm <= 8.0 km).
   - Provide direct redirect map links for each hotel, lunch, and dinner.

Special Instructions:
- ${transportGuidelines}
- ${vibeGuidelines}
- ${groupGuidelines}

Return ONLY a valid JSON object with this exact structure, no markdown or code fences:
{
  "days": [
    {
      "dayNumber": 1,
      "theme": "Theme title",
      "sectorInfo": "Highway or local sector info",
      "dayDistanceKm": 320,
      "stay": {
        "name": "Different Hotel Name for Day 1",
        "description": "Short hotel stay description",
        "distanceFromRouteKm": 2.1,
        "pricePerNight": 3200,
        "rating": 4.6,
        "location": "Corridor location within 8 km",
        "directLink": "https://www.google.com/maps/search/?api=1&query=..."
      },
      "lunch": {
        "name": "Lunch spot name within 8 km",
        "cuisine": "Cuisine type",
        "description": "Food description",
        "distanceFromRouteKm": 0.8,
        "pricePerPerson": 350,
        "directLink": "https://www.google.com/maps/search/?api=1&query=..."
      },
      "dinner": {
        "name": "Dinner spot name within 8 km",
        "cuisine": "Cuisine type",
        "description": "Dinner description",
        "distanceFromRouteKm": 1.5,
        "pricePerPerson": 500,
        "directLink": "https://www.google.com/maps/search/?api=1&query=..."
      },
      "activities": [
        {
          "name": "Specific Place Name",
          "description": "What to experience here",
          "time": "Morning",
          "timeSlot": "09:00 AM - 11:00 AM",
          "duration": "2 hours",
          "hasTicket": true,
          "ticketCost": 200,
          "ticketInfo": "₹200 per adult",
          "directLink": "https://www.google.com/maps/search/?api=1&query=..."
        }
      ]
    }
  ]
}`;

    const geminiData = await callGemini(prompt);
    if (geminiData?.days?.length) {
      const postProcessedDays = geminiData.days.slice(0, generatedDays).map((day: any, dIdx: number) => {
        const plan = dailyPlans[dIdx] || dailyPlans[0];
        const dayActivities = Array.isArray(day.activities) && day.activities.length > 0 ? day.activities : [];

        const processedActivities = dayActivities.map((act: any, idx: number) => {
          const directLink = act.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' ' + destination)}`;
          const duration = act.duration || (dayActivities.length <= 2 ? "4 hours" : dayActivities.length >= 4 ? "1.5 hours" : "2 hours");
          const time = act.time || (idx === 0 ? "Morning" : idx === 1 ? "Afternoon" : "Evening");
          const timeSlot = act.timeSlot || (idx === 0 ? "08:30 AM - 11:30 AM" : idx === 1 ? "01:30 PM - 04:30 PM" : "05:30 PM - 08:00 PM");
          const hasTicket = typeof act.hasTicket === "boolean" ? act.hasTicket : (Number(act.ticketCost) > 0 || idx === 0);
          const ticketCost = typeof act.ticketCost === "number" ? act.ticketCost : (hasTicket ? 150 : 0);
          const ticketInfo = act.ticketInfo || (hasTicket ? `₹${ticketCost} per person` : "Free Entry");

          return {
            id: `act-${dIdx + 1}-${idx + 1}-${Date.now()}`,
            name: act.name,
            description: act.description,
            time,
            timeSlot,
            duration,
            hasTicket,
            ticketCost,
            ticketInfo,
            directLink,
          };
        });

        return {
          ...day,
          dayNumber: dIdx + 1,
          theme: day.theme || `Day ${dIdx + 1}`,
          sectorInfo: day.sectorInfo || plan?.sectorInfo || `${destination} Sector Route`,
          dayDistanceKm: day.dayDistanceKm || plan?.dayDistanceKm,
          stay: day.stay?.name ? {
            ...day.stay,
            distanceFromRouteKm: Math.min(8.0, Number(day.stay.distanceFromRouteKm) || plan?.stay?.distanceFromRouteKm || 2.5),
            directLink: day.stay.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.stay.name + ' hotel ' + destination)}`,
          } : plan?.stay,
          lunch: day.lunch?.name ? {
            ...day.lunch,
            distanceFromRouteKm: Math.min(8.0, Number(day.lunch.distanceFromRouteKm) || plan?.lunch?.distanceFromRouteKm || 1.2),
            directLink: day.lunch.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.lunch.name + ' ' + destination)}`,
          } : plan?.lunch,
          dinner: day.dinner?.name ? {
            ...day.dinner,
            distanceFromRouteKm: Math.min(8.0, Number(day.dinner.distanceFromRouteKm) || plan?.dinner?.distanceFromRouteKm || 1.8),
            directLink: day.dinner.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.dinner.name + ' ' + destination)}`,
          } : plan?.dinner,
          activities: processedActivities,
        };
      });

      const responsePayload = {
        ...geminiData,
        days: postProcessedDays,
        requestedDays,
        generatedDays,
        note: longTripNote,
        transportMode,
        groupType,
        tripVibe,
        roadRoute: roadData,
        routeDistanceKm: roadData?.distanceKm,
        routeDurationHours: roadData?.durationHours,
        pitstops: roadData?.allPitstops || [],
        dailyRoadPlans: dailyPlans,
      };
      
      // Store in Redis (cache for 48 hours)
      await setCached(cacheKey, responsePayload, 172800);
      
      return NextResponse.json(responsePayload);
    }

    // Fallback Mock
    const mockItinerary: any = {
      days: [],
      requestedDays,
      generatedDays,
      note: longTripNote,
      transportMode,
      groupType,
      tripVibe,
      roadRoute: roadData,
      routeDistanceKm: roadData?.distanceKm,
      routeDurationHours: roadData?.durationHours,
      pitstops: roadData?.allPitstops || [],
      dailyRoadPlans: dailyPlans,
    };
    
    // Rich Local Database for Popular Destinations with dynamic activity counts and tickets
    const POPULAR_FALLBACKS: Record<string, { theme: string; activities: any[] }[]> = {
      jaipur: [
        {
          theme: "Royal Hilltop Fortresses & Vistas",
          activities: [
            {
              name: "Amer Fort & Sheesh Mahal",
              description: "Explore the majestic 16th-century hilltop palace, famous for artistic Hindu elements, massive courtyards, and the shimmering Sheesh Mahal.",
              time: "Morning",
              timeSlot: "09:00 AM - 01:00 PM",
              duration: "4 hours",
              hasTicket: true,
              ticketCost: 200,
              ticketInfo: "₹200 (Indians) / ₹550 (Foreigners)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Amer+Fort+Jaipur"
            },
            {
              name: "Nahargarh Fort & Sunset Stepwells",
              description: "Ascend the Aravalli edge to visit the fort that once defended Jaipur, exploring royal suites, stepwells, and enjoying panoramic golden hour sunset views.",
              time: "Afternoon",
              timeSlot: "02:30 PM - 06:30 PM",
              duration: "4 hours",
              hasTicket: true,
              ticketCost: 50,
              ticketInfo: "₹50 (Indians) / ₹200 (Foreigners)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Nahargarh+Fort+Jaipur"
            }
          ]
        },
        {
          theme: "Pink City Heritage Walk & Bazaars",
          activities: [
            {
              name: "Hawa Mahal (Palace of Winds)",
              description: "Photograph and tour the iconic 5-story pink honeycomb facade built with 953 jharokhas.",
              time: "Morning",
              timeSlot: "08:30 AM - 09:30 AM",
              duration: "1 hour",
              hasTicket: true,
              ticketCost: 50,
              ticketInfo: "₹50 (Indians) / ₹200 (Foreigners)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Hawa+Mahal+Jaipur"
            },
            {
              name: "Jantar Mantar Astronomical Observatory",
              description: "Witness the UNESCO World Heritage site hosting the world's largest stone sundial.",
              time: "Morning",
              timeSlot: "10:00 AM - 11:30 AM",
              duration: "1.5 hours",
              hasTicket: true,
              ticketCost: 200,
              ticketInfo: "₹200 (Indians) / ₹300 (Foreigners)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Jantar+Mantar+Jaipur"
            },
            {
              name: "City Palace & Royal Chambers",
              description: "Walk through the Chandra Mahal and Mubarak Mahal courtyards displaying royal robes and artifacts.",
              time: "Afternoon",
              timeSlot: "01:30 PM - 03:30 PM",
              duration: "2 hours",
              hasTicket: true,
              ticketCost: 300,
              ticketInfo: "₹300 Museum entry",
              directLink: "https://www.google.com/maps/search/?api=1&query=City+Palace+Jaipur"
            },
            {
              name: "Albert Hall State Museum",
              description: "Admire Indo-Saracenic museum architecture, ancient coins, Persian carpets, and miniature art.",
              time: "Afternoon",
              timeSlot: "04:00 PM - 05:30 PM",
              duration: "1.5 hours",
              hasTicket: true,
              ticketCost: 100,
              ticketInfo: "₹100 (Indians) / ₹300 (Foreigners)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Albert+Hall+Museum+Jaipur"
            },
            {
              name: "Bapu Bazaar & Johari Bazaar Handicrafts",
              description: "Stroll through the lively pink bazaars hunting for handcrafted leather mojris, silver jewelry, and bandhani textiles.",
              time: "Evening",
              timeSlot: "06:00 PM - 07:30 PM",
              duration: "1.5 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
              directLink: "https://www.google.com/maps/search/?api=1&query=Bapu+Bazaar+Jaipur"
            }
          ]
        },
        {
          theme: "Lake Palaces & Cultural Feasts",
          activities: [
            {
              name: "Jal Mahal Lake Overlook",
              description: "Marvel at the floating palace in the center of Man Sagar Lake and take scenic photographs from the paved promenade.",
              time: "Morning",
              timeSlot: "09:00 AM - 10:00 AM",
              duration: "1 hour",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry (Viewpoint)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Jal+Mahal+Jaipur"
            },
            {
              name: "Jaigarh Fort & The Giant Jaivana Cannon",
              description: "Explore the rugged military fort holding the world's largest cannon on wheels and secret water reservoirs.",
              time: "Afternoon",
              timeSlot: "11:30 AM - 02:00 PM",
              duration: "2.5 hours",
              hasTicket: true,
              ticketCost: 150,
              ticketInfo: "₹150 per person",
              directLink: "https://www.google.com/maps/search/?api=1&query=Jaigarh+Fort+Jaipur"
            },
            {
              name: "Chokhi Dhani Ethnic Village Feast",
              description: "Immerse in authentic Rajasthani village culture with folk Kalbeliya dances, puppet shows, and a grand royal thali dinner.",
              time: "Evening",
              timeSlot: "05:30 PM - 09:00 PM",
              duration: "3.5 hours",
              hasTicket: true,
              ticketCost: 950,
              ticketInfo: "₹950 (Includes buffet thali feast & entry)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Chokhi+Dhani+Jaipur"
            }
          ]
        }
      ],
      goa: [
        {
          theme: "Jungle Waterfalls & Coastal Forts",
          activities: [
            {
              name: "Dudhsagar Waterfalls Safari & Natural Pool",
              description: "Venture deep into Bhagwan Mahaveer Wildlife Sanctuary by 4x4 safari to swim at the base of the roaring 4-tiered falls.",
              time: "Morning",
              timeSlot: "08:00 AM - 12:30 PM",
              duration: "4.5 hours",
              hasTicket: true,
              ticketCost: 550,
              ticketInfo: "₹550 (Forest permit & jeep ride)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Dudhsagar+Waterfalls+Goa"
            },
            {
              name: "Fort Aguada & Sea Lighthouse",
              description: "Walk the ramparts of the 17th-century Portuguese fortress with sweeping ocean vistas and explore the historic freshwater spring.",
              time: "Afternoon",
              timeSlot: "03:00 PM - 06:30 PM",
              duration: "3.5 hours",
              hasTicket: true,
              ticketCost: 50,
              ticketInfo: "₹50 per adult",
              directLink: "https://www.google.com/maps/search/?api=1&query=Fort+Aguada+Goa"
            }
          ]
        },
        {
          theme: "Latin Quarters, Churches & Sunset Shacks",
          activities: [
            {
              name: "Basilica of Bom Jesus (Old Goa)",
              description: "Visit the UNESCO World Heritage Baroque church housing the sacred relics of St. Francis Xavier.",
              time: "Morning",
              timeSlot: "09:00 AM - 10:30 AM",
              duration: "1.5 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
              directLink: "https://www.google.com/maps/search/?api=1&query=Basilica+of+Bom+Jesus+Goa"
            },
            {
              name: "Fontainhas Latin Quarter Walking Tour",
              description: "Stroll through pastel-colored heritage Portuguese alleys, art galleries, and quaint bakeries.",
              time: "Morning",
              timeSlot: "11:00 AM - 12:30 PM",
              duration: "1.5 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
              directLink: "https://www.google.com/maps/search/?api=1&query=Fontainhas+Goa"
            },
            {
              name: "Calangute Beach Water Sports",
              description: "Enjoy thrilling parasailing, jet-skiing, or relax under beach umbrellas with fresh coconut water.",
              time: "Afternoon",
              timeSlot: "02:30 PM - 04:30 PM",
              duration: "2 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Beach Entry (Water sports ₹800-₹1500)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Calangute+Beach+Goa"
            },
            {
              name: "Anjuna Cliff Sunset & Shacks",
              description: "Watch the sun sink into the Arabian sea from the rocky cliffs of Anjuna, followed by beachside acoustic music.",
              time: "Evening",
              timeSlot: "05:30 PM - 07:30 PM",
              duration: "2 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
              directLink: "https://www.google.com/maps/search/?api=1&query=Anjuna+Beach+Goa"
            }
          ]
        }
      ],
      manali: [
        {
          theme: "Glacial Valleys & Adventure Sports",
          activities: [
            {
              name: "Solang Valley Adventure & Paragliding",
              description: "Experience high-altitude paragliding, ATV rides, and zorbing across the stunning snow-capped valley.",
              time: "Morning",
              timeSlot: "08:30 AM - 01:00 PM",
              duration: "4.5 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Valley Entry (Paragliding ₹1500-₹3000)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Solang+Valley+Manali"
            },
            {
              name: "Jogini Waterfalls Pine Forest Hike",
              description: "Trek through deodar pine woods and apple orchards to reach the cascading natural waterfall pools.",
              time: "Afternoon",
              timeSlot: "02:30 PM - 06:00 PM",
              duration: "3.5 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry (Trek Trail)",
              directLink: "https://www.google.com/maps/search/?api=1&query=Jogini+Waterfalls+Manali"
            }
          ]
        },
        {
          theme: "Temples, Hot Springs & Old Manali",
          activities: [
            {
              name: "Hadimba Devi Pagoda Temple",
              description: "Visit the historic 1553 wooden carved temple surrounded by cedar forest.",
              time: "Morning",
              timeSlot: "09:00 AM - 10:30 AM",
              duration: "1.5 hours",
              hasTicket: true,
              ticketCost: 50,
              ticketInfo: "₹50 per person",
              directLink: "https://www.google.com/maps/search/?api=1&query=Hadimba+Temple+Manali"
            },
            {
              name: "Vashisht Natural Sulfur Hot Springs",
              description: "Soak tired travel muscles in the sacred natural hot sulfur springs with valley views.",
              time: "Morning",
              timeSlot: "11:00 AM - 12:30 PM",
              duration: "1.5 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
              directLink: "https://www.google.com/maps/search/?api=1&query=Vashisht+Hot+Springs+Manali"
            },
            {
              name: "Old Manali Cafes & Craft Street",
              description: "Explore the bohemian streets, taste fresh trout or wood-fired pizza, and visit local craft studios.",
              time: "Afternoon",
              timeSlot: "02:00 PM - 04:00 PM",
              duration: "2 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
              directLink: "https://www.google.com/maps/search/?api=1&query=Old+Manali"
            },
            {
              name: "Mall Road & Tibetan Monastery Market",
              description: "Shop for Kullu shawls, wooden souvenirs, dried apples, and prayer wheels along the lively main avenue.",
              time: "Evening",
              timeSlot: "05:30 PM - 07:30 PM",
              duration: "2 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
              directLink: "https://www.google.com/maps/search/?api=1&query=Mall+Road+Manali"
            }
          ]
        }
      ]
    };

    const targetCityLower = destination.toLowerCase().trim();
    const isPopular = POPULAR_FALLBACKS[targetCityLower];

    for (let d = 1; d <= generatedDays; d++) {
      const plan = dailyPlans[d - 1] || dailyPlans[0];
      let theme = `Day ${d}`;
      let rawActivities: any[] = [];

      if (isPopular) {
        const fallbackDay = POPULAR_FALLBACKS[targetCityLower][(d - 1) % POPULAR_FALLBACKS[targetCityLower].length];
        theme = fallbackDay.theme;
        rawActivities = fallbackDay.activities;
      } else {
        // Generic dynamic schedule:
        // Day 1 has 2 in-depth places (4h each)
        // Day 2 has 4-5 quick places (1-1.5h each)
        // Day 3+ has 3 places (2h each)
        if (d % 3 === 1) {
          theme = `Highland Landmarks & Great Trails`;
          rawActivities = [
            {
              name: `${destination} Grand Fort & National Park`,
              description: `Embark on an expansive exploration of the historic ramparts, botanical trails, and wildlife lookouts of ${destination}.`,
              time: "Morning",
              timeSlot: "08:30 AM - 12:30 PM",
              duration: "4 hours",
              hasTicket: true,
              ticketCost: 250,
              ticketInfo: "₹250 per adult",
            },
            {
              name: `${destination} Mountain Ridge & Sunset Overlook`,
              description: `Hike or ride up to the scenic ridge observation point for panoramic 360-degree sunset views and cool breezes.`,
              time: "Afternoon",
              timeSlot: "02:30 PM - 06:30 PM",
              duration: "4 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
            }
          ];
        } else if (d % 3 === 2) {
          theme = `Heritage Highlights, Markets & Shrines`;
          rawActivities = [
            {
              name: `${destination} Heritage Palace Gate`,
              description: `Admire the historic architecture, carved gateways, and foundational monuments of ${destination}.`,
              time: "Morning",
              timeSlot: "08:30 AM - 09:30 AM",
              duration: "1 hour",
              hasTicket: true,
              ticketCost: 100,
              ticketInfo: "₹100 per person",
            },
            {
              name: `${destination} Sacred Temple & Ghats`,
              description: `Experience the spiritual serenity, morning chants, and riverfront architecture.`,
              time: "Morning",
              timeSlot: "10:00 AM - 11:30 AM",
              duration: "1.5 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
            },
            {
              name: `${destination} Central Art & History Museum`,
              description: `Explore regional archaeological artifacts, ancient coins, and folk paintings.`,
              time: "Afternoon",
              timeSlot: "01:30 PM - 03:00 PM",
              duration: "1.5 hours",
              hasTicket: true,
              ticketCost: 150,
              ticketInfo: "₹150 per person",
            },
            {
              name: `${destination} Botanical Promenade`,
              description: `Relax amidst rare indigenous plants, tranquil lotus ponds, and manicured lawns.`,
              time: "Afternoon",
              timeSlot: "03:30 PM - 05:00 PM",
              duration: "1.5 hours",
              hasTicket: true,
              ticketCost: 50,
              ticketInfo: "₹50 per person",
            },
            {
              name: `${destination} Old Town Bazaar & Food Street`,
              description: `Savor regional delicacies, hot street snacks, and shop for local handmade crafts.`,
              time: "Evening",
              timeSlot: "05:30 PM - 07:30 PM",
              duration: "2 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
            }
          ];
        } else {
          theme = `Scenic Lakes, Cultural Villages & Local Dining`;
          rawActivities = [
            {
              name: `${destination} Lakefront Marina & Boating`,
              description: `Enjoy peaceful morning pedal boating or lakeside walking along the tranquil shores.`,
              time: "Morning",
              timeSlot: "09:00 AM - 11:00 AM",
              duration: "2 hours",
              hasTicket: true,
              ticketCost: 200,
              ticketInfo: "₹200 (Boating extra)",
            },
            {
              name: `${destination} Craft Village & Weaving Center`,
              description: `Watch master artisans weave traditional fabrics and craft stone artifacts.`,
              time: "Afternoon",
              timeSlot: "01:30 PM - 03:30 PM",
              duration: "2 hours",
              hasTicket: false,
              ticketCost: 0,
              ticketInfo: "Free Entry",
            },
            {
              name: `${destination} Sunset Point & Evening Cultural Show`,
              description: `Watch traditional folk dance performances, music, and dramatic twilight vistas.`,
              time: "Evening",
              timeSlot: "05:00 PM - 07:30 PM",
              duration: "2.5 hours",
              hasTicket: true,
              ticketCost: 300,
              ticketInfo: "₹300 per ticket",
            }
          ];
        }
      }

      const formattedActivities = rawActivities.map((act, idx) => ({
        id: `act-${d}-${idx + 1}-${Date.now()}`,
        name: act.name,
        description: act.description,
        time: act.time || (idx === 0 ? "Morning" : idx === 1 ? "Afternoon" : "Evening"),
        timeSlot: act.timeSlot || "Morning",
        duration: act.duration || "2 hours",
        hasTicket: Boolean(act.hasTicket),
        ticketCost: Number(act.ticketCost) || 0,
        ticketInfo: act.ticketInfo || (act.hasTicket ? `₹${act.ticketCost || 100} per person` : "Free Entry"),
        directLink: act.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' ' + destination)}`,
      }));

      mockItinerary.days.push({
        dayNumber: d,
        theme,
        sectorInfo: plan.sectorInfo,
        dayDistanceKm: plan.dayDistanceKm,
        stay: plan.stay,
        lunch: plan.lunch,
        dinner: plan.dinner,
        activities: formattedActivities,
      });
    }

    // Cache the fallback too to prevent repeated failures
    await setCached(cacheKey, mockItinerary, 172800);

    return NextResponse.json(mockItinerary);
  } catch (error: any) {
    console.error("Itinerary generation error:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate itinerary", details: String(error) }, { status: 500 });
  }
}
