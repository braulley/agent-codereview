import { validatePrUrl } from "@/lib/pr-url-validator";

describe("validatePrUrl", () => {
  it("accepts a valid GitHub PR URL", () => {
    expect(validatePrUrl("https://github.com/owner/repo/pull/123")).toEqual({
      ok: true,
      platform: "github",
      owner: "owner",
      repo: "repo",
      number: 123,
    });
  });

  it("accepts a valid GitLab MR URL", () => {
    expect(
      validatePrUrl("https://gitlab.com/group/repo/-/merge_requests/45"),
    ).toEqual({
      ok: true,
      platform: "gitlab",
      owner: "group",
      repo: "repo",
      number: 45,
    });
  });

  it("rejects non-numeric PR number (CT05)", () => {
    expect(validatePrUrl("https://github.com/user/repo/pull/abc")).toEqual(
      expect.objectContaining({
        ok: false,
        error: "INVALID_PR_URL",
      }),
    );
  });

  it("rejects empty, http, and foreign hosts", () => {
    for (const url of [
      "",
      "   ",
      "http://github.com/owner/repo/pull/1",
      "https://bitbucket.org/owner/repo/pull-requests/1",
    ]) {
      expect(validatePrUrl(url)).toEqual(
        expect.objectContaining({ ok: false, error: "INVALID_PR_URL" }),
      );
    }
  });
});
