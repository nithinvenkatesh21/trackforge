"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateProfile(input: {
  name?: string;
  bio?: string;
  creatorRoles?: string[];
  genres?: string[];
  daw?: string;
  lookingFor?: string[];
  socialLinks?: {
    soundcloud?: string;
    spotify?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}) {
  const user = await requireUser();

  const [updated] = await db
    .update(users)
    .set({
      name: input.name !== undefined ? input.name : user.name,
      bio: input.bio !== undefined ? input.bio : user.bio,
      creatorRoles: input.creatorRoles !== undefined ? input.creatorRoles : user.creatorRoles,
      genres: input.genres !== undefined ? input.genres : user.genres,
      daw: input.daw !== undefined ? input.daw : user.daw,
      lookingFor: input.lookingFor !== undefined ? input.lookingFor : user.lookingFor,
      socialLinks: input.socialLinks !== undefined ? input.socialLinks : user.socialLinks,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  revalidatePath(`/profile/${user.id}`);
  return updated;
}
