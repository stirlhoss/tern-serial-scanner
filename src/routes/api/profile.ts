import { json } from "@solidjs/router";
import { getSession } from "~/lib/server";
import { updateUser, findUserById } from "~/lib/db";

interface ProfileUpdateData {
  name?: string | null;
  location?: 15 | 16;
}

export async function POST({ request }: { request: Request }) {
  try {
    const session = await getSession();
    const currentUser = session.data;

    if (!currentUser?.id) {
      return json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, location } = body;

    const updates: ProfileUpdateData = {};

    // Validate and prepare updates
    if (name !== undefined) {
      if (name === null || name.trim() === "") {
        updates.name = null;
      } else {
        updates.name = name.trim();
      }
    }

    if (location !== undefined) {
      const locationNum = parseInt(location);
      if (locationNum === 15 || locationNum === 16) {
        updates.location = locationNum;
      } else if (location !== "" && location !== null) {
        return json(
          {
            success: false,
            message: "Invalid location. Must be 15 or 16.",
          },
          { status: 400 },
        );
      }
    }

    // Update user in database
    const updatedUser = await updateUser(currentUser.id, updates);

    if (!updatedUser) {
      return json(
        {
          success: false,
          message: "User not found or update failed",
        },
        { status: 404 },
      );
    }

    // Update session with new data
    await session.update({
      ...currentUser,
      name: updatedUser.name,
      location: updatedUser.location,
    });

    return json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        location: updatedUser.location,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return json(
      {
        success: false,
        message: "Failed to update profile. Please try again.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    const currentUser = session.data;

    if (!currentUser?.id) {
      return json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Get fresh user data from database
    const user = await findUserById(currentUser.id);

    if (!user) {
      return json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return json(
      {
        success: false,
        message: "Failed to fetch profile data",
      },
      { status: 500 },
    );
  }
}
