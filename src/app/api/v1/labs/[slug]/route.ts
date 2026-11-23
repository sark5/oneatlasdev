import { NextRequest } from "next/server";
import { notFound } from "@/server/api/errors";
import {
  parseDirectoryQuery,
} from "@/server/api/query.schema";
import {
  getLabBySlug,
} from "@/server/api/services/directory.service";
import {
  successResponse,
  errorResponse,
} from "@/server/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const query = parseDirectoryQuery(
      request.nextUrl.searchParams
    );

    const result = await getLabBySlug(slug, query);

    if (!result) {
      throw notFound("AI lab");
    }

    return successResponse(result, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
