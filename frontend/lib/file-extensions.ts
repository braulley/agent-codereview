/** Allowlist from docs/spec.md §Compatibilidade / C07 CA-RF01-02 */
export const ALLOWED_EXTENSIONS = [
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".java",
  ".go",
  ".php",
  ".rb",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export function getFileExtension(filename: string): string {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) {
    return "";
  }
  return lower.slice(dot);
}

export function isAllowedExtension(filename: string): boolean {
  const ext = getFileExtension(filename);
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}
