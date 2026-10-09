import { NextResponse } from "next/server";
import { callSerpApi } from "@/lib/serpapi";
import { getCached, setCached } from "@/lib/redis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const check_in_date = searchParams.get("check_in_date");
  const check_out_date = searchParams.get("check_out_date");

  if (!q || !check_in_date || !check_out_date) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const requestedCheckIn = new Date(`${check_in_date}T00:00:00Z`);
  const requestedCheckOut = new Date(`${check_out_date}T00:00:00Z`);
  if (Number.isNaN(requestedCheckIn.getTime()) || Number.isNaN(requestedCheckOut.getTime())) {
    return NextResponse.json({ error: "Invalid hotel dates" }, { status: 400 });
  }

  // Google Hotels rejects past dates. Keep the requested stay length, but make
  // a live availability search for a future window when viewing an old trip.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const stayNights = Math.max(1, Math.round((requestedCheckOut.getTime() - requestedCheckIn.getTime()) / 86400000));
  let effectiveCheckIn = requestedCheckIn;
  let effectiveCheckOut = requestedCheckOut;
  if (requestedCheckIn <= today) {
    effectiveCheckIn = new Date(today);
    effectiveCheckIn.setUTCDate(effectiveCheckIn.getUTCDate() + 14);
    effectiveCheckOut = new Date(effectiveCheckIn);
    effectiveCheckOut.setUTCDate(effectiveCheckOut.getUTCDate() + stayNights);
    console.info(`[Hotels] Past trip dates replaced with next available search window for ${q}.`);
  }
  const formatDate = (value: Date) => value.toISOString().slice(0, 10);
  const effectiveCheckInDate = formatDate(effectiveCheckIn);
  const effectiveCheckOutDate = formatDate(effectiveCheckOut);

  // 1. Cache Lookup
  const cacheKey = `tripmitra:hotels:${q.toLowerCase().trim()}:${effectiveCheckInDate}:${effectiveCheckOutDate}`;
  try {
    const cachedHotels = await getCached<any>(cacheKey);
    if (cachedHotels) {
      return NextResponse.json(cachedHotels);
    }

    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
      const mockData = {
        properties: [
          {
            name: "The Grand Retreat Resort",
            overall_rating: 4.8,
            rate_per_night: { lowest: "₹4,500" },
            images: [{ thumbnail: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }]
          },
          {
            name: "Boutique Cozy Heights",
            overall_rating: 4.2,
            rate_per_night: { lowest: "₹2,800" },
            images: [{ thumbnail: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }]
          },
          {
            name: "Eco Park View Lodge",
            overall_rating: 4.5,
            rate_per_night: { lowest: "₹3,200" },
            images: [{ thumbnail: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }]
          }
        ]
      };
      return NextResponse.json(mockData);
    }

    const data = await callSerpApi({
      engine: "google_hotels",
      q,
      check_in_date: effectiveCheckInDate,
      check_out_date: effectiveCheckOutDate,
      currency: "INR",
      hl: "en"
    });

    if (data && data.properties) {
      // Cache SerpAPI result for 24 hours
      await setCached(cacheKey, data, 86400);
      return NextResponse.json(data);
    }

    if (data && data.error) {
      console.error(`[SerpAPI Hotels API Error] SerpAPI returned an error code/message: "${data.error}"`);
    } else {
      console.error(`[SerpAPI Hotels Format Error] Request succeeded but returned no properties. Response keys: ${data ? Object.keys(data).join(", ") : "null"}`);
    }

    // Failover Mock Data
    console.warn(`SerpAPI hotels query failed. Returning mock hotels failover.`);
    const mockFailover = {
      properties: [
        {
          name: `${q} Heritage Palace & Spa`,
          overall_rating: 4.8,
          rate_per_night: { lowest: "₹5,400" },
          images: [{ thumbnail: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" }]
        },
        {
          name: `${q} Grand Premium Resort`,
          overall_rating: 4.6,
          rate_per_night: { lowest: "₹4,200" },
          images: [{ thumbnail: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" }]
        },
        {
          name: `${q} Boutique Overlook Inn`,
          overall_rating: 4.4,
          rate_per_night: { lowest: "₹3,100" },
          images: [{ thumbnail: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" }]
        }
      ]
    };

    // Cache mock failover for 2 hours
    await setCached(cacheKey, mockFailover, 7200);

    return NextResponse.json(mockFailover);
  } catch (error: any) {
    console.error("[SerpAPI Hotels Exception] Failed to execute hotel query:", error);
    return NextResponse.json({ error: `Failed to fetch hotels: ${error.message}` }, { status: 500 });
  }
}
