import { NextRequest, NextResponse } from "next/server";
import { calculateRoadRouteWithPitstops } from "@/lib/roadRouteEngine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, mode = "bike", tripVibe } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Origin and destination are required" },
        { status: 400 }
      );
    }

    const result = await calculateRoadRouteWithPitstops(
      origin,
      destination,
      mode === "car" ? "car" : "bike",
      tripVibe
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Road route calculation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to calculate road route" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get("origin") || "Mumbai";
    const destination = searchParams.get("destination") || "Goa";
    const mode = (searchParams.get("mode") || "bike") as "bike" | "car";
    const tripVibe = searchParams.get("tripVibe") || undefined;

    const result = await calculateRoadRouteWithPitstops(
      origin,
      destination,
      mode === "car" ? "car" : "bike",
      tripVibe
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Road route GET error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to calculate road route" },
      { status: 500 }
    );
  }
}
