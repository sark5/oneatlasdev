import {
  getModelFacets,
} from "@/server/api/services/facets.service";
import {
  successResponse,
  errorResponse,
} from "@/server/api/response";

export async function GET() {
  try {
    const facets = await getModelFacets();

    return successResponse(facets, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
