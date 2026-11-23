import { NextRequest } from "next/server";
import {
  parseDirectoryQuery,
} from "@/server/api/query.schema";
import {
  getLabs,
} from "@/server/api/services/directory.service";
import {
  successResponse,
  errorResponse,
} from "@/server/api/response";

export async function GET(request: NextRequest) {
  try {
    const query = parseDirectoryQuery(
      request.nextUrl.searchParams
    );

    const result = await getLabs(query);

    return successResponse(result.data, {
      pagination: result.pagination,
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
