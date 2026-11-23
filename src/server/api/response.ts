import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";

export function successResponse<T>(
  data: T,
  options?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    headers?: HeadersInit;
  }
) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(options?.pagination && {
        pagination: options.pagination,
      }),
    },
    {
      status: 200,
      headers: options?.headers,
    }
  );
}

export function errorResponse(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  ) {
    throw error;
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details !== undefined
            ? error.details
            : undefined,
        },
      },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request parameters.",
          details: error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  console.error("API_ERROR", error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    { status: 500 }
  );
}
