import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { getAuthenticatedUser } from "@/lib/auth";
import Trip from "@/models/Trip";
import mongoose from "mongoose";

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
    }

    await dbConnect();
    const user = await getAuthenticatedUser(request);
    const trip = await Trip.findById(params.id);

    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // Allow access if owner, collaborator, or public share
    return NextResponse.json({ trip: serializeTrip(trip) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
    }

    await dbConnect();
    const user = await getAuthenticatedUser(request);
    const body = await request.json();
    delete body._id;
    delete body.id;
    delete body.userId; // Preserve original creator

    const trip = await Trip.findById(params.id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const userEmail = user?.email?.toLowerCase().trim();
    const isOwner = user && trip.userId === user.id;
    const isCollab =
      user &&
      (trip.collaboratorUserIds?.includes(user.id) ||
        (userEmail && trip.collaboratorEmails?.includes(userEmail)));

    // Allow updates from owner, collaborator, or if modifying with valid auth
    const updatedTrip = await Trip.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedTrip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json({ trip: serializeTrip(updatedTrip) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
    }

    await dbConnect();
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const trip = await Trip.findById(params.id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const userEmail = user.email.toLowerCase().trim();
    const isOwner = trip.userId === user.id;

    if (isOwner) {
      await Trip.findByIdAndDelete(params.id);
    } else {
      // If collaborator deletes, remove them from collaborators list
      await Trip.findByIdAndUpdate(params.id, {
        $pull: {
          collaboratorEmails: userEmail,
          collaboratorUserIds: user.id,
        },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
