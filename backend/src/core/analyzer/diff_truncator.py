"""Pure truncation of unified diffs to a maximum line count."""


def truncate_diff(text: str, max_lines: int = 500) -> tuple[str, bool]:
    lines = text.splitlines()
    if len(lines) <= max_lines:
        return text, False
    return "\n".join(lines[:max_lines]), True
