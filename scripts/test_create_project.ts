import { createProject } from "../lib/actions/projects";
import { db } from "../lib/db/index";
import { users, projects } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function runTest() {
  console.log("=== RUNNING LOCAL CREATE PROJECT TEST ===");

  const testClerkId = "user_3Gw0Ue3hspQBjkrMuq86TSUigTB";
  process.env.TEST_USER_CLERK_ID = testClerkId;

  try {
    // 1. Look up user row
    const [existingUser] = await db
      .select({ id: users.id, clerkId: users.clerkId })
      .from(users)
      .where(eq(users.clerkId, testClerkId))
      .limit(1);

    console.log("User lookup in DB:", existingUser);

    // 2. Prepare test input
    const input = {
      title: "Test Track " + Math.floor(Math.random() * 100000),
      description: "Automated test project creation",
      genre: "Trap",
      bpm: 140,
      key: "C Minor",
      visibility: "public" as const,
      neededRoles: ["producer" as const],
    };

    console.log("Input data for createProject:", input);

    // 3. Execute real server action
    const res = await createProject(input);
    console.log("createProject response:", res);

    if (res.success && res.project) {
      console.log("SUCCESS: Project created successfully with ID:", res.project.id);
      process.exit(0);
    } else {
      console.error("FAIL: Error returned from createProject:", res.error);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("UNHANDLED ERROR in test:", err);
    process.exit(1);
  }
}

runTest();
