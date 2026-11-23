import { NextRequest } from "next/server";
import { parseModelQuery } from "@/server/api/query.schema";
import { getModels } from "@/server/api/services/model.service";
import {
  successResponse,
  errorResponse,
} from "@/server/api/response";

export async function GET(request: NextRequest) {
  try {
    const filters = parseModelQuery(
      request.nextUrl.searchParams
    );

    const result = await getModels(filters);

    return successResponse(result.data, {
      pagination: result.pagination,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
