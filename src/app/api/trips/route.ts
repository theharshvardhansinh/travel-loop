import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Trip from "@/models/Trip";
import { getAuthenticatedUser } from "@/lib/auth";

function serializeTrip(trip: any) {
  const value = JSON.parse(JSON.stringify(trip.toObject ? trip.toObject() : trip));
  const normalize = (item: any): any => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object" && !(item instanceof Date)) {
      const mapped = Object.fromEntries(Object.entries(item).map(([key, child]) => [key, normalize(child)]));
      if (mapped._id) {
        mapped.id = mapped._id.toString();
        delete mapped._id;
      }
      return mapped;
    }
    return item;
  };
  return normalize(value);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const userEmail = user.email ? user.email.toLowerCase().trim() : "";
    
    // 1. Fetch all trips where user is owner, collaborator, or invited
    const allUserTrips = await Trip.find({
      $or: [
        { userId: user.id },
        { collaboratorUserIds: user.id },
        ...(userEmail
          ? [
              { collaboratorEmails: userEmail },
              { "collaborators.email": userEmail },
            ]
          : []),
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const activeTrips: any[] = [];
    const pendingInvitations: any[] = [];

    for (const rawTrip of allUserTrips) {
      const trip = serializeTrip(rawTrip);
      const isOwner = trip.userId === user.id;

      if (isOwner) {
        activeTrips.push(trip);
        continue;
      }

      // Check collaborator status for this user
      const userCollab = trip.collaborators?.find(
        (c: any) => c.email?.toLowerCase().trim() === userEmail || c.userId === user.id
      );

      if (userCollab) {
        if (userCollab.status === "pending") {
          pendingInvitations.push(trip);
        } else if (userCollab.status === "accepted") {
          activeTrips.push(trip);
        }
        // If declined, ignore
      } else {
        // Legacy fallback: if user email is in collaboratorEmails and not declined
        activeTrips.push(trip);
      }
    }
    
    return NextResponse.json(
      {
        trips: activeTrips,
        invitations: pendingInvitations,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const newTrip = await Trip.create({ ...body, userId: user.id });
    return NextResponse.json({ trip: serializeTrip(newTrip) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
