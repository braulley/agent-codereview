export type PrPlatform = "github" | "gitlab";

export type ValidatePrUrlSuccess = {
  ok: true;
  platform: PrPlatform;
  owner: string;
  repo: string;
  number: number;
};

export type ValidatePrUrlFailure = {
  ok: false;
  error: "INVALID_PR_URL";
  message: string;
  detail: string;
};

export type ValidatePrUrlResult = ValidatePrUrlSuccess | ValidatePrUrlFailure;

const INVALID: ValidatePrUrlFailure = {
  ok: false,
  error: "INVALID_PR_URL",
  message:
    "A URL fornecida não corresponde a um Pull Request GitHub ou Merge Request GitLab válido.",
  detail:
    "Formato esperado: https://github.com/{owner}/{repo}/pull/{number}",
};

/** Anchored https-only GitHub PR / GitLab MR patterns; number is digits only. */
const GITHUB_RE =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/;
const GITLAB_RE =
  /^https:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/-\/merge_requests\/(\d+)$/;

export function validatePrUrl(url: string): ValidatePrUrlResult {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) {
    return INVALID;
  }

  const github = GITHUB_RE.exec(trimmed);
  if (github) {
    const number = Number(github[3]);
    if (number < 1) {
      return INVALID;
    }
    return {
      ok: true,
      platform: "github",
      owner: github[1],
      repo: github[2],
      number,
    };
  }

  const gitlab = GITLAB_RE.exec(trimmed);
  if (gitlab) {
    const number = Number(gitlab[3]);
    if (number < 1) {
      return INVALID;
    }
    return {
      ok: true,
      platform: "gitlab",
      owner: gitlab[1],
      repo: gitlab[2],
      number,
    };
  }

  return INVALID;
}
