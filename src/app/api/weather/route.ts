import { NextResponse } from "next/server";
import { resolveCoords, fetchWithTimeout } from "@/lib/geo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get("destination");
  const date = searchParams.get("date");

  if (!destination) {
    return NextResponse.json({ error: "Missing destination parameter" }, { status: 400 });
  }

  try {
    const coords = await resolveCoords(destination);
    if (!coords) {
      return NextResponse.json({ error: `Unknown destination: ${destination}` }, { status: 400 });
    }

    const { lat, lng } = coords;

    // Fetch 16-day forecast
    let forecastData = null;
    try {
      // Keep to documented daily variables. Unsupported fields make Open-Meteo
      // reject the whole request with a 400 instead of returning a partial forecast.
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,precipitation_sum&current_weather=true&timezone=auto&forecast_days=16`;
      const forecastRes = await fetchWithTimeout(forecastUrl, 8000);
      if (!forecastRes.ok) throw new Error(`Open-Meteo forecast returned ${forecastRes.status}`);
      forecastData = await forecastRes.json();
    } catch (forecastErr) {
      console.error("Forecast fetch error:", forecastErr);
    }

    // Fetch historical climate (same dates last year, up to 7 days around)
    let historicalData = null;
    if (date) {
      try {
        const tripDate = new Date(date);
        const lastYearStart = new Date(tripDate);
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
        const lastYearEnd = new Date(lastYearStart);
        lastYearEnd.setDate(lastYearEnd.getDate() + 6);
        const startStr = lastYearStart.toISOString().split("T")[0];
        const endStr = lastYearEnd.toISOString().split("T")[0];

        const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const archiveRes = await fetchWithTimeout(archiveUrl, 5000);
        if (!archiveRes.ok) throw new Error(`Open-Meteo archive returned ${archiveRes.status}`);
        historicalData = await archiveRes.json();
      } catch (histErr) {
        console.error("Historical data fetch error:", histErr);
      }
    }

    return NextResponse.json({
      city: destination,
      coordinates: coords,
      forecast: forecastData,
      historical: historicalData
    });
  } catch (error: any) {
    console.error("Error fetching weather:", error);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
