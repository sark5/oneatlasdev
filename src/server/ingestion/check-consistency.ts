import "dotenv/config";

import { prisma } from "@/lib/prisma";

import {
  findModelSummaryDrift,
  repairModelSummaries,
} from "./services/consistency.service";

async function main() {
  console.log("Checking OneAtlas model summaries...");

  const before = await findModelSummaryDrift();

  console.log(
    "Models with summary drift:",
    before.length
  );

  if (before.length > 0) {
    console.table(before);

    console.log("Repairing summaries...");

    await repairModelSummaries();
  }

  const after = await findModelSummaryDrift();

  console.log(
    "Remaining inconsistent models:",
    after.length
  );

  if (after.length > 0) {
    throw new Error(
      "Some model summaries remain inconsistent."
    );
  }

  console.log("Consistency check passed.");
}

main()
  .catch((error: unknown) => {
    console.error(
      "Consistency check failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
