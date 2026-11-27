import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyDomainDnsTxt, verifySocialHandleBio } from "@/lib/dns-adapter";

const VerifySchema = z.object({
  type: z.enum(["DOMAIN", "HANDLE"]),
  target: z.string().min(2),
  platform: z.string().optional(),
  expectedToken: z.string().min(4),
  simulate: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = VerifySchema.parse(body);

    if (parsed.type === "DOMAIN") {
      const result = await verifyDomainDnsTxt(
        parsed.target,
        parsed.expectedToken,
        parsed.simulate
      );
      return NextResponse.json(result);
    }

    const result = await verifySocialHandleBio(
      parsed.target,
      parsed.platform || "X",
      parsed.expectedToken,
      parsed.simulate
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        verified: false,
        message: error instanceof Error ? error.message : "Verification check failed",
      },
      { status: 400 }
    );
  }
}
