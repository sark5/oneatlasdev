export function assertTestDatabase(
  testDatabaseUrl: string | undefined,
  productionDatabaseUrl: string | undefined,
  confirmation: string | undefined
): void {
  if (
    !testDatabaseUrl ||
    !productionDatabaseUrl ||
    confirmation !== "ONEATLAS_TEST_DATABASE_ONLY"
  ) {
    throw new Error(
      "Dedicated test database configuration and confirmation are required."
    );
  }

  const testUrl = new URL(testDatabaseUrl);
  const productionUrl = new URL(productionDatabaseUrl);

  const allowedProtocols = [
    "postgres:",
    "postgresql:",
  ];

  if (
    !allowedProtocols.includes(testUrl.protocol) ||
    !allowedProtocols.includes(productionUrl.protocol)
  ) {
    throw new Error("PostgreSQL URLs are required.");
  }

  if (testUrl.hostname === productionUrl.hostname) {
    throw new Error(
      "Test and production database hosts must be different."
    );
  }
}
