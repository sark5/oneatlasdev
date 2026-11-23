import { NextRequest } from "next/server";
import {
  parseComparisonQuery,
} from "@/server/api/query.schema";
import {
  compareModels,
} from "@/server/api/services/comparison.service";
import {
  successResponse,
  errorResponse,
} from "@/server/api/response";

export async function GET(request: NextRequest) {
  try {
    const query = parseComparisonQuery(
      request.nextUrl.searchParams
    );

    const result = await compareModels(query.models);

    return successResponse(result, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
