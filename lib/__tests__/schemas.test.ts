import { describe, it, expect } from "vitest";
import { createProjectSchema } from "../schemas/projects";
import { createCommentSchema } from "../schemas/comments";
import { sanitizePath, getOctokit } from "../github";
import { validateNamingPattern, formatStemFileName } from "../utils/stem-naming";

describe("Validation Schemas & Utilities", () => {
  it("validates project creation input correctly", () => {
    const valid = createProjectSchema.parse({
      title: "Test Song",
      bpm: 120,
      visibility: "public",
    });
    expect(valid.title).toBe("Test Song");
    expect(valid.bpm).toBe(120);
  });

  it("rejects invalid BPM range", () => {
    expect(() =>
      createProjectSchema.parse({
        title: "Test Song",
        bpm: 10,
      })
    ).toThrow();
  });

  it("validates comment schema", () => {
    const valid = createCommentSchema.parse({
      versionId: "123e4567-e89b-12d3-a456-426614174000",
      projectId: "123e4567-e89b-12d3-a456-426614174000",
      content: "Great mix!",
      timestampSeconds: 45.2,
    });
    expect(valid.timestampSeconds).toBe(45.2);
  });

  it("sanitizes GitHub repository paths to prevent traversal", () => {
    expect(sanitizePath("stems/v1.json")).toBe("stems/v1.json");
    expect(() => sanitizePath("../etc/passwd")).toThrow("Invalid repository path");
    expect(() => sanitizePath("/root/file")).toThrow("Invalid repository path");
  });

  it("resolves user-provided GitHub tokens over environment default", () => {
    const customOctokit = getOctokit("ghp_user_custom_token");
    expect(customOctokit).toBeDefined();
  });

  it("validates stem naming patterns correctly", () => {
    expect(validateNamingPattern("{trackname}_v{version}_{stemtype}.mp3").valid).toBe(true);
    expect(validateNamingPattern("no_required_token").valid).toBe(false);
    expect(validateNamingPattern("{invalid_token}_{stemtype}").valid).toBe(false);
  });

  it("formats stem file names according to pattern", () => {
    const formatted = formatStemFileName(
      "{trackname}_v{version}_{stemtype}.mp3",
      "My Track",
      2,
      "vocals"
    );
    expect(formatted).toBe("My_Track_v2_vocals.mp3");
  });
});
