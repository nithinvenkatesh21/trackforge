"use server";

import { getCurrentUser } from "@/lib/auth";

export async function getSelfUser() {
  return await getCurrentUser();
}
