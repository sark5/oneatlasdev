export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (
  message = "Invalid request parameters.",
  details?: unknown
) =>
  new ApiError(400, "VALIDATION_ERROR", message, details);

export const notFound = (resource = "Resource") =>
  new ApiError(
    404,
    "NOT_FOUND",
    `${resource} was not found.`
  );
