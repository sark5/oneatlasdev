import { NextRequest } from "next/server";

import {
  parseRankingQuery,
} from "@/server/api/query.schema";

import {
  getRankings,
} from "@/server/api/services/ranking.service";

import {
  successResponse,
  errorResponse,
} from "@/server/api/response";

export async function GET(request: NextRequest) {
  try {
    const query = parseRankingQuery(
      request.nextUrl.searchParams
    );

    const result = await getRankings(query);

    return successResponse(result, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    if ((error as any)?.digest?.startsWith("NEXT_")) throw error;
    return errorResponse(error);
  }
}
