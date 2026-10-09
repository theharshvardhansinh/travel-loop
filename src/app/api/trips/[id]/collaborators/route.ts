import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { getAuthenticatedUser } from "@/lib/auth";
import Trip from "@/models/Trip";
import User from "@/models/User";
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

// POST /api/trips/[id]/collaborators — invite a co-traveler by email
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
    }

    await dbConnect();
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === user.email.toLowerCase().trim()) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    const trip = await Trip.findById(params.id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // Only the owner can invite collaborators
    if (trip.userId !== user.id) {
      return NextResponse.json({ error: "Only the trip owner can invite co-travelers" }, { status: 403 });
    }

    // Check if already invited/accepted
    const collaborators = trip.collaborators || [];
    const existingCollab = collaborators.find(
      (c: any) => c.email?.toLowerCase().trim() === normalizedEmail
    );

    if (existingCollab) {
      if (existingCollab.status === "accepted") {
        return NextResponse.json({ error: "This person has already joined the trip" }, { status: 400 });
      }
      if (existingCollab.status === "pending") {
        return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 400 });
      }
      // If declined before, re-invite them
      existingCollab.status = "pending";
      existingCollab.invitedAt = new Date();
      existingCollab.respondedAt = undefined;
    } else {
      // Check if user with this email exists in our DB
      const invitedUser = await User.findOne({ email: normalizedEmail }).lean();

      collaborators.push({
        email: normalizedEmail,
        userId: invitedUser ? (invitedUser as any)._id.toString() : undefined,
        name: invitedUser ? (invitedUser as any).name : undefined,
        status: "pending",
        invitedAt: new Date(),
      });
    }

    // Also add to collaboratorEmails array for backwards compatibility
    if (!trip.collaboratorEmails?.includes(normalizedEmail)) {
      trip.collaboratorEmails = [...(trip.collaboratorEmails || []), normalizedEmail];
    }

    trip.collaborators = collaborators;
    await trip.save();

    return NextResponse.json(
      { message: "Invitation sent successfully", trip: serializeTrip(trip) },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/trips/[id]/collaborators — remove a co-traveler by email
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
    }

    await dbConnect();
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    const trip = await Trip.findById(params.id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    if (trip.userId !== user.id) {
      return NextResponse.json({ error: "Only the trip owner can remove co-travelers" }, { status: 403 });
    }

    trip.collaborators = (trip.collaborators || []).filter(
      (c: any) => c.email?.toLowerCase().trim() !== normalizedEmail
    );
    trip.collaboratorEmails = (trip.collaboratorEmails || []).filter(
      (em: string) => em.toLowerCase().trim() !== normalizedEmail
    );
    trip.collaboratorUserIds = (trip.collaboratorUserIds || []).filter(
      (uid: string) => {
        // Keep if not matching the removed collaborator
        return true; // Will clean up via collaborators array
      }
    );

    await trip.save();

    return NextResponse.json({ message: "Co-traveler removed", trip: serializeTrip(trip) }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
