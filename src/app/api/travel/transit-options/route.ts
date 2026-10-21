import { NextResponse } from "next/server";
import { callSerpApi } from "@/lib/serpapi";
import { toAirportCode, resolveAirportCode } from "@/lib/geo";
import { callGemini } from "@/lib/gemini";
import { getCached, setCached } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const { destination, mode, origin, outbound_date } = await request.json();
    const now = new Date();
    const h = now.getHours();
    const serpKey = process.env.SERP_API_KEY;

    if (!origin || !destination) {
      return NextResponse.json({ error: "Missing origin or destination" }, { status: 400 });
    }

    // 1. Real flights via SerpAPI when mode is plane, origin is specified, and API key exists
    if (mode === "plane" && origin && serpKey) {
      try {
        const depCode = await resolveAirportCode(origin);
        const arrCode = await resolveAirportCode(destination);
        const date = outbound_date || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        
        const data = await callSerpApi({
          engine: "google_flights",
          departure_id: depCode,
          arrival_id: arrCode,
          outbound_date: date,
          currency: "INR",
          hl: "en",
          type: "2"
        });

        if (data && data.best_flights) {
          const flights = data.best_flights.slice(0, 6).map((f: any, i: number) => ({
            departure: f.flights?.[0]?.departure_airport?.time || `${h + i}:00`,
            arrival: f.flights?.[0]?.arrival_airport?.time || `${h + i + 2}:30`,
            duration: f.total_duration ? `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m` : "2h 30m",
            price: f.price || 8500 + i * 2000,
            label: f.flights?.[0]?.airline || "IndiGo",
            pill: i < 2 ? "budget" : i < 4 ? "standard" : "premium",
            airline: f.flights?.[0]?.airline || "IndiGo",
            flight_number: f.flights?.[0]?.flight_number || "",
            real: true,
          }));
          if (flights.length > 0) {
            return NextResponse.json({ mode: "plane", options: flights });
          }
        }
      } catch (flightErr: any) {
        console.error("SerpAPI flights error, falling back to mock:", flightErr.message);
      }
    }

    // 2. Try to get dynamic transit options from Gemini (with Redis cache)
    const cacheKey = `tripmitra:transit:${origin.toLowerCase().trim()}:${destination.toLowerCase().trim()}:${mode}:${outbound_date || "any"}`;
    let geminiResults = null;
    
    try {
      const cached = await getCached<any>(cacheKey);
      if (cached) {
        return NextResponse.json({ mode, options: cached });
      }
    } catch (cErr) {
      console.error("Cache read error for transit-options:", cErr);
    }

    const geminiPrompt = `Generate realistic travel transit options from "${origin}" to "${destination}" via "${mode}".
    The output must be a JSON object with a single key "options" containing an array of 2 to 4 options matching this typescript structure:
    For mode "plane":
      { "departure": "10:00 AM", "arrival": "12:30 PM", "duration": "2h 30m", "price": 5500, "label": "Saver Economy", "pill": "budget", "airline": "IndiGo" }
    For mode "train":
      { "departure": "06:30 AM", "arrival": "12:00 PM", "duration": "5h 30m", "price": 850, "label": "Sleeper Class", "pill": "budget", "train": "Gatimaan Express" }
    For mode "bus":
      { "departure": "09:00 PM", "arrival": "03:30 AM", "duration": "6h 30m", "price": 800, "label": "A/C Sleeper", "pill": "standard", "bus": "Intercity SmartBus" }
    For mode "car":
      { "departure": "Flexible departure", "arrival": "Flexible arrival", "duration": "~6h driving", "price": 4500, "label": "Self-Drive Rental", "pill": "budget", "car": "Sedan (Fuel + Toll)" }
    For mode "bike":
      { "departure": "Early morning kick-off (06:00 AM)", "arrival": "Late afternoon arrival (04:30 PM)", "duration": "~7h 30m scenic ride", "price": 1400, "label": "Cruiser / Tourer (Fuel)", "pill": "budget", "bike": "Royal Enfield / Cruiser" }

    Provide accurate, real-world estimated prices in Indian Rupees (INR) for the year 2026.
    Response must be ONLY valid JSON matching this format: { "options": [...] }. Do not add any markdown formatting, text, or explanations.`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiData = await callGemini(geminiPrompt);
        if (geminiData && Array.isArray(geminiData.options)) {
          geminiResults = geminiData.options;
          await setCached(cacheKey, geminiResults, 604800); // Cache for 7 days
        }
      } catch (gErr: any) {
        console.error("Gemini failed to generate transit options:", gErr.message);
      }
    }

    if (geminiResults) {
      geminiResults.sort((a: any, b: any) => a.price - b.price);
      return NextResponse.json({ mode, options: geminiResults });
    }

    // 3. Fallback Mock Data if Gemini is offline/rate-limited
    const options: Record<string, any[]> = {
      plane: [
        { departure: `${h}:00`, arrival: `${h + 2}:30`, duration: '2h 30m', price: 8500, label: 'Budget Saver', pill: 'budget', airline: 'IndiGo' },
        { departure: `${h + 1}:15`, arrival: `${h + 3}:30`, duration: '2h 15m', price: 12000, label: 'Standard Class', pill: 'standard', airline: 'SpiceJet' },
        { departure: `${h + 2}:00`, arrival: `${h + 4}:15`, duration: '2h 15m', price: 18500, label: 'Premium Cabin', pill: 'premium', airline: 'Vistara' },
      ],
      bike: [
        { departure: '05:30 AM (Biker Dawn Ride)', arrival: '03:00 PM', duration: '~8h riding + pitstops', price: 1400, label: 'Self Cruiser / Tourer', pill: 'budget', bike: 'Fuel + Highway Tolls' },
        { departure: '06:00 AM (Scenic Convoy)', arrival: '04:00 PM', duration: '~9h scenic pace', price: 2800, label: 'Royal Enfield Rental', pill: 'standard', bike: 'Himalayan 450 + Helmet Kit' },
        { departure: 'Flexible departure', arrival: 'Flexible', duration: '~8h 30m', price: 4200, label: 'Super Tourer / Adventure', pill: 'premium', bike: 'BMW GS / KTM Adventure' },
      ],
      train: [
        { departure: `${h}:30`, arrival: `${h + 6}:00`, duration: '5h 30m', price: 1200, label: 'Sleeper Class', pill: 'budget', train: '12345 Express' },
        { departure: `${h + 1}:00`, arrival: `${h + 5}:45`, duration: '4h 45m', price: 2800, label: '3AC Tier', pill: 'standard', train: 'Shatabdi' },
        { departure: `${h + 2}:30`, arrival: `${h + 6}:30`, duration: '4h 00m', price: 4500, label: 'Tejas CC', pill: 'premium', train: 'Tejas Express' },
      ],
      bus: [
        { departure: `${h}:15`, arrival: `${h + 8}:15`, duration: '8h 00m', price: 600, label: 'Ordinary Sleeper', pill: 'budget', bus: 'State Roadways' },
        { departure: `${h + 1}:00`, arrival: `${h + 8}:30`, duration: '7h 30m', price: 1100, label: 'Volvo A/C CC', pill: 'standard', bus: 'Volvo Sleeper' },
        { departure: `${h + 2}:30`, arrival: `${h + 9}:00`, duration: '6h 30m', price: 2200, label: 'Mercedes Sleeper', pill: 'premium', bus: 'Mercedes Benz Multi-Axle' },
      ],
      car: [
        { departure: 'Flexible departure', arrival: 'Flexible arrival', duration: '~6h driving', price: 3500, label: 'Self-Drive Rental', pill: 'budget', car: 'Sedan (Fuel + Toll)' },
        { departure: 'On demand pick-up', arrival: 'On demand arrival', duration: '~6h with driver', price: 6500, label: 'Private Cab', pill: 'standard', car: 'SUV with Driver' },
      ],
    };

    const results = options[mode] || options.plane;
    results.sort((a, b) => a.price - b.price);

    return NextResponse.json({ mode, options: results });
  } catch (error: any) {
    console.error("Transit options error:", error);
    return NextResponse.json({ error: "Failed to fetch transit options" }, { status: 500 });
  }
}
