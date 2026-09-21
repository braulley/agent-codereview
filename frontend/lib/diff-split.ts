/**
 * Split a unified diff (or plain text) into old/new values for DiffViewer.
 * Pure utility — no I/O.
 */

export type SplitDiffResult = {
  oldValue: string;
  newValue: string;
  hunkStarts: number[];
};

/** Line indices (0-based) in the rendered newValue where hunks begin. */
export function splitUnifiedDiff(diffText: string): SplitDiffResult {
  const lines = diffText.replace(/\r\n/g, "\n").split("\n");
  const oldLines: string[] = [];
  const newLines: string[] = [];
  const hunkStarts: number[] = [];
  let inHunk = false;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      hunkStarts.push(newLines.length);
      inHunk = true;
      continue;
    }
    if (
      line.startsWith("diff ") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ")
    ) {
      inHunk = false;
      continue;
    }

    if (!inHunk && !line.startsWith("+") && !line.startsWith("-") && !line.startsWith(" ")) {
      // Plain text (not a unified diff): mirror into both sides.
      oldLines.push(line);
      newLines.push(line);
      continue;
    }

    if (line.startsWith("+")) {
      newLines.push(line.slice(1));
    } else if (line.startsWith("-")) {
      oldLines.push(line.slice(1));
    } else if (line.startsWith(" ")) {
      const body = line.slice(1);
      oldLines.push(body);
      newLines.push(body);
    } else if (line === "\\ No newline at end of file") {
      continue;
    } else {
      oldLines.push(line);
      newLines.push(line);
    }
  }

  // If nothing looked like a diff, treat whole input as new side only.
  if (
    oldLines.length === 0 &&
    newLines.length === 0 &&
    diffText.trim().length > 0
  ) {
    return { oldValue: "", newValue: diffText, hunkStarts: [0] };
  }

  return {
    oldValue: oldLines.join("\n"),
    newValue: newLines.join("\n"),
    hunkStarts: hunkStarts.length > 0 ? hunkStarts : [0],
  };
}
