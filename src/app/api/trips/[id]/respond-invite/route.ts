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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
    }

    await dbConnect();
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await request.json();
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "Action must be 'accept' or 'decline'" }, { status: 400 });
    }

    const trip = await Trip.findById(params.id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const userEmail = user.email.toLowerCase().trim();
    const userName = user.name || userEmail.split("@")[0];

    // Find collaborator entry in trip
    let collaborators = trip.collaborators || [];
    const collabIndex = collaborators.findIndex(
      (c) => c.email?.toLowerCase().trim() === userEmail || c.userId === user.id
    );

    if (action === "accept") {
      if (collabIndex !== -1) {
        collaborators[collabIndex].status = "accepted";
        collaborators[collabIndex].userId = user.id;
        collaborators[collabIndex].name = userName;
        collaborators[collabIndex].respondedAt = new Date();
      } else {
        collaborators.push({
          email: userEmail,
          userId: user.id,
          name: userName,
          status: "accepted",
          invitedAt: new Date(),
          respondedAt: new Date(),
        });
      }

      // Ensure user ID is in collaboratorUserIds and email in collaboratorEmails
      const userIds = trip.collaboratorUserIds || [];
      if (!userIds.includes(user.id)) userIds.push(user.id);

      const emails = trip.collaboratorEmails || [];
      if (!emails.includes(userEmail)) emails.push(userEmail);

      // Add name to travellerNames if not present
      const names = trip.travellerNames || [];
      if (!names.includes(userName)) {
        names.push(userName);
      }

      trip.collaborators = collaborators;
      trip.collaboratorUserIds = userIds;
      trip.collaboratorEmails = emails;
      trip.travellerNames = names;
      trip.travelers = names.length > trip.travelers ? names.length : trip.travelers;

      await trip.save();
      return NextResponse.json({ message: "Invitation accepted", trip: serializeTrip(trip) }, { status: 200 });
    } else {
      // Decline
      if (collabIndex !== -1) {
        collaborators[collabIndex].status = "declined";
        collaborators[collabIndex].respondedAt = new Date();
      }
      // Remove from active collaborator lists
      trip.collaborators = collaborators;
      trip.collaboratorUserIds = (trip.collaboratorUserIds || []).filter((id) => id !== user.id);
      trip.collaboratorEmails = (trip.collaboratorEmails || []).filter((em) => em !== userEmail);

      await trip.save();
      return NextResponse.json({ message: "Invitation declined" }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
