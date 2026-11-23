import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

import {
  runScheduledIngestion,
} from "@/server/ingestion/run-scheduled";

function authorized(request: NextRequest): boolean {
  const secret = env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization =
    request.headers.get("authorization") ?? "";

  const expected = Buffer.from(
    `Bearer ${secret}`,
    "utf8"
  );

  const received = Buffer.from(
    authorization,
    "utf8"
  );

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CRON_NOT_CONFIGURED",
          message: "Scheduled ingestion is not configured.",
        },
      },
      { status: 503 }
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized ingestion request.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const result = await runScheduledIngestion();

    return NextResponse.json(
      {
        success: result.success,
        data: result,
      },
      {
        status: result.success ? 200 : 500,
      }
    );
  } catch (error) {
    console.error("Scheduled ingestion failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INGESTION_FAILED",
          message: "Scheduled ingestion failed.",
        },
      },
      { status: 500 }
    );
  }
}
