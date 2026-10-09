import { NextRequest } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

const jwtSecret = process.env.JWT_SECRET;

export function getAuthenticatedUserId(request: NextRequest): string | null {
  if (!jwtSecret) return null;
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ id: string; email: string; name?: string } | null> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return null;

  try {
    await dbConnect();
    const user = await User.findById(userId).select("email name").lean();
    if (!user) return null;
    return {
      id: (user as any)._id.toString(),
      email: (user as any).email,
      name: (user as any).name,
    };
  } catch {
    return null;
  }
}
