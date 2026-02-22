import type { DomainRule } from "@focus-shield/shared-types";

/**
 * Parse a URL string into its domain and path components.
 * Handles both full URLs (https://...) and bare domains (reddit.com).
 */
function parseUrl(url: string): { domain: string; path: string } {
  let normalized = url.trim().toLowerCase();

  // Strip protocol if present
  const protocolMatch = /^https?:\/\//.exec(normalized);
  if (protocolMatch) {
    normalized = normalized.slice(protocolMatch[0].length);
  }

  // Split on first slash to separate domain from path
  const slashIndex = normalized.indexOf("/");
  if (slashIndex === -1) {
    return { domain: normalized, path: "" };
  }

  return {
    domain: normalized.slice(0, slashIndex),
    path: normalized.slice(slashIndex + 1),
  };
}

/**
 * Parse a pattern into its domain and path parts.
 * Patterns can be: "*.reddit.com", "reddit.com", "youtube.com/shorts/*"
 */
function parsePattern(pattern: string): {
  domainPattern: string;
  pathPattern: string;
} {
  const normalized = pattern.trim().toLowerCase();

  const slashIndex = normalized.indexOf("/");
  if (slashIndex === -1) {
    return { domainPattern: normalized, pathPattern: "" };
  }

  return {
    domainPattern: normalized.slice(0, slashIndex),
    pathPattern: normalized.slice(slashIndex + 1),
  };
}

/**
 * Match a domain against a domain pattern.
 *
 * Rules:
 * - `*.reddit.com` matches any subdomain of reddit.com but NOT reddit.com itself
 * - `reddit.com` matches exactly reddit.com
 */
function matchDomainPart(domain: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) {
    // Wildcard subdomain matching
    const baseDomain = pattern.slice(2); // Remove "*."
    // Must be a subdomain — the domain must end with ".baseDomain"
    // e.g., "www.reddit.com" ends with ".reddit.com"
    return domain.endsWith(`.${baseDomain}`);
  }

  // Exact domain match
  return domain === pattern;
}

/**
 * Match a URL path against a path pattern with wildcard support.
 *
 * Rules:
 * - Empty pattern matches any path (or no path)
 * - `shorts/*` matches `shorts/abc123`, `shorts/xyz/456`
 * - `feed/*` matches `feed/anything`
 * - `*` at the end matches everything that follows
 */
function matchPathPart(path: string, pattern: string): boolean {
  // No path pattern means match everything
  if (pattern === "") {
    return true;
  }

  // If pattern has a trailing wildcard
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1); // Remove trailing "*"
    return path.startsWith(prefix);
  }

  // Exact path match
  return path === pattern;
}

/**
 * Check if a URL or domain matches a given pattern.
 *
 * Supported patterns:
 * - Wildcard: `*.reddit.com` — matches subdomains of reddit.com, NOT reddit.com itself
 * - Exact: `reddit.com` — matches only reddit.com
 * - Path-based: `youtube.com/shorts/*` — matches youtube.com/shorts/anything
 *
 * @param url - The URL or domain to test (e.g., "https://www.reddit.com/r/programming")
 * @param pattern - The pattern to match against (e.g., "*.reddit.com")
 * @returns true if the URL matches the pattern
 */
export function matchesDomain(url: string, pattern: string): boolean {
  const { domain, path } = parseUrl(url);
  const { domainPattern, pathPattern } = parsePattern(pattern);

  if (!matchDomainPart(domain, domainPattern)) {
    return false;
  }

  return matchPathPart(path, pathPattern);
}

/**
 * Check if a URL is blocked based on block and allow rules.
 *
 * Allow rules take priority: if a URL matches both a block rule and an allow rule,
 * it is considered ALLOWED (not blocked).
 *
 * @param url - The URL or domain to check
 * @param blockRules - Rules that block domains (type: "block")
 * @param allowRules - Rules that allow domains (type: "allow"), taking priority over block rules
 * @returns true if the URL is blocked, false if it is allowed
 */
export function isDomainBlocked(
  url: string,
  blockRules: DomainRule[],
  allowRules: DomainRule[],
): boolean {
  // Check allow rules first — if any match, the domain is allowed
  const isAllowed = allowRules.some((rule) => matchesDomain(url, rule.pattern));
  if (isAllowed) {
    return false;
  }

  // Check block rules — if any match, the domain is blocked
  return blockRules.some((rule) => matchesDomain(url, rule.pattern));
}
