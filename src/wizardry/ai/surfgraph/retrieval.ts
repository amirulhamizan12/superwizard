// ============================================================================
// WEBSITE-SPECIFIC RULES RETRIEVAL
// ============================================================================

type WebsiteRules = {
  domain: string;
  patterns: string[]; // URL patterns to match (e.g., "amazon.com", "web.whatsapp.com")
  rules: string[];
};

// Parse and structure all website-specific rules
const WEBSITE_RULES: WebsiteRules[] = [
  {
    domain: "Amazon",
    patterns: ["amazon.com", "www.amazon.com"],
    rules: [
      "Never use price filter inputs (min/max price, \"Go\" button)",
      "Include price range in search query: \"laptop $500-$1000\"",
    ],
  },
  {
    domain: "WhatsApp Web",
    patterns: ["web.whatsapp.com"],
    rules: [
      "Never press Enter when searching contacts",
      "Click last visible chat to load more contacts (don't search)",
      "Wait 10 seconds if no chats visible",
    ],
  },
  {
    domain: "Google Flights",
    patterns: ["google.com/travel/flights", "flights.google.com"],
    rules: [
      "HARD RULE: When you want to set the origin ('Where from?'), always follow this Sequence: Step 1: Click on <input type=\"text\" role=\"combobox\" aria-expanded=\"false\" aria-label=\"Where from?\"> | Step 2: setValue on <input type=\"text\" role=\"combobox\" aria-expanded=\"true\" aria-label=\"Where else?\"> | Step 3: Click on <li role=\"option\" aria-label=\"CITY_NAME\"> (If you don't see any search results in the dropdown options, then try to setValue another option)",
      "HARD RULE: When you want to set the destination ('Where to?'), always follow this Sequence: Step 1: Click on <input type=\"text\" role=\"combobox\" aria-expanded=\"false\" placeholder=\"Where to?\" aria-label=\"Where to? \"> | Step 2: setValue on <input type=\"text\" role=\"combobox\" aria-expanded=\"true\" aria-label=\"Where to? \"> | Step 3: Click on <li role=\"option\" aria-label=\"CITY_NAME\"> (If you don't see any search results in the dropdown options, then try to setValue another option)",
      "HARD RULE: When you want to set trip type between 'Round trip', 'One-way', 'Multi-city', always follow this Sequence: Step 1: Click on <span>Round trip</span> (this will show all the options available) | Step 2: Click on the trip type you want (defaults are <span>Round trip</span>, <span>One-way</span>, <span>Multi-city</span>)",
      "HARD RULE: When you want to set the departure and return date, always follow this Sequence: Step 1: Click on <input type=\"text\" placeholder=\"Departure\" aria-label=\"Departure\"></input> | Step 2: Click on <div aria-label=\"Sunday 28 December 2025\">28</div> (Select the date) | Step 3: Click on <div aria-label=\"Sunday 28 December 2025, departure date.\">28</div> (Select the date) | Step 4: Click on <button aria-label=\"Done. Search for round-trip flights, departing on 28 December 2025 and returning on 28 December 2025\"></button> (You must always follow this sequence and select both the dates, if it is a round trip, only select one date for one-way flight)",
      "Run search: After dates are set, click <button aria-label=\"Search\"> to execute the search or the explore button to execute the search.",

    ],
  },
  {
    domain: "Apple",
    patterns: ["apple.com", "www.apple.com"],
    rules: ["Click color options using <label for=\"\"> elements"],
  },
  {
    domain: "Gmail",
    patterns: ["mail.google.com"],
    rules: [
      "Recipients: <input aria-label=\"To recipients\" type=\"text\" role=\"combobox\">",
      "Subject: <input placeholder=\"Subject\" aria-label=\"Subject\">",
      "Body: <div aria-label=\"Message Body\" role=\"textbox\" contenteditable=\"true\">",
    ],
  },
  {
    domain: "GitHub",
    patterns: ["github.com"],
    rules: [
      "To perform a search on GitHub, always use the navigate action",
      "The correct URL format is: https://github.com/search?q=YOUR_QUERY",
      "Replace YOUR_QUERY with the desired search terms, using + to separate words (e.g., laptop+automation)",
      "Do not interact with the on-page search input; always navigate directly to the search results URL",
    ],
  },
  {
    domain: "X (Twitter)",
    patterns: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"],
    rules: [
      "When clicking on reply button, always use this specific element: <span>Reply</span>",
    ],
  },
];

// General rules that apply to all websites
const GENERAL_RULES: string[] = [
  "If you see a reCAPTCHA, use the respond tool to ask the user to solve it before continuing. Do not try to solve it yourself.",
];

// Extract domain from a URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return "";
  }
}

// Check if a URL matches any of the patterns for a website
function matchesPattern(url: string, patterns: string[]): boolean {
  const domain = extractDomain(url);
  return patterns.some(
    (pattern) =>
      domain === pattern ||
      domain.endsWith("." + pattern) ||
      url.includes(pattern)
  );
}

// Retrieve website-specific rules based on the current URL
export function getWebsiteRules(url: string): string | null {
  if (!url) return null;

  // Find matching website rules
  const matchingWebsite = WEBSITE_RULES.find((site) =>
    matchesPattern(url, site.patterns)
  );

  // Build the rules section
  let rulesSection = "";

  if (matchingWebsite) {
    rulesSection += `# WEBSITE-SPECIFIC RULES: ${matchingWebsite.domain}\n`;
    matchingWebsite.rules.forEach((rule) => {
      rulesSection += `- ${rule}\n`;
    });
  }

  // Always add general rules
  if (GENERAL_RULES.length > 0) {
    if (rulesSection) {
      rulesSection += "\n";
    }
    rulesSection += "# GENERAL RULES:\n";
    GENERAL_RULES.forEach((rule) => {
      rulesSection += `- ${rule}\n`;
    });
  }

  return rulesSection || null;
}

// Get all available website domains (for reference/debugging)
export function getAvailableWebsites(): string[] {
  return WEBSITE_RULES.map((site) => site.domain);
}

