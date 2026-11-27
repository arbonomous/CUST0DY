import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const DEMO_USER_COOKIE = "cust0dy_active_desk";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const demoUserId = cookieStore.get(DEMO_USER_COOKIE)?.value;

  if (demoUserId) {
    const demoUser = await prisma.user.findUnique({ where: { id: demoUserId } });
    if (demoUser) return demoUser;
  }

  try {
    const session = await auth();
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
    if (sessionUserId) {
      const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
      if (user) return user;
    }
  } catch {
    // Fallback gracefully to default buyer desk in dev
  }

  // Default to seeded Buyer Desk so Cust0dy is immediately interactive on first load
  const fallback =
    (await prisma.user.findUnique({ where: { id: "user_buyer_1" } })) ??
    (await prisma.user.findFirst());

  return fallback;
}
