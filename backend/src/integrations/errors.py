"""Domain errors for GitHub/GitLab platform clients."""


class PrNotFound(Exception):
    """PR/MR missing, private, or inaccessible with configured credentials."""


class UpstreamRateLimited(Exception):
    """Platform responded with HTTP 429."""


class UpstreamError(Exception):
    """Network failure, timeout, or platform 5xx."""
