import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_COOKIE } from "@/lib/session";

const SwitchSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = SwitchSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Desk account not found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set(DEMO_USER_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        alias: user.alias,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
