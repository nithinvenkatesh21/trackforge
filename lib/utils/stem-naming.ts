export function validateNamingPattern(pattern: string): { valid: boolean; error?: string } {
  if (!pattern) {
    return { valid: true }; // Optional
  }

  // Extract all tokens in curly braces
  const tokens = pattern.match(/\{[^}]+\}/g) || [];

  // Check required token
  if (!tokens.some((t) => t === "{stemtype}")) {
    return {
      valid: false,
      error: "Naming pattern must contain required token {stemtype}",
    };
  }

  const allowedTokens: string[] = ["{stemtype}", "{trackname}", "{version}"];

  // Reject unknown tokens
  for (const t of tokens) {
    if (!allowedTokens.includes(t)) {
      return {
        valid: false,
        error: `Unknown token ${t} in naming pattern. Allowed tokens: {stemtype}, {trackname}, {version}`,
      };
    }
  }

  return { valid: true };
}

export function formatStemFileName(
  pattern: string | undefined | null,
  trackName: string,
  versionNumber: number,
  stemType: "vocals" | "drums" | "bass" | "other"
): string {
  const defaultPattern = "{trackname}_v{version}_{stemtype}.mp3";
  const activePattern = pattern && validateNamingPattern(pattern).valid ? pattern : defaultPattern;

  return activePattern
    .replace("{trackname}", trackName.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .replace("{version}", String(versionNumber))
    .replace("{stemtype}", stemType);
}
