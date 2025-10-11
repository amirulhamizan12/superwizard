export interface ProviderTemplate {
  id: string;
  displayName: string;
  baseURL: string;
  apiKeyPlaceholder: string;
  apiKeyUrl: string;
  defaultModels?: string[]; // Suggested models for this provider
  supportedModelFormat: string; // e.g., "provider/model" or "model"
  description?: string;
}

export const PROVIDER_TEMPLATES: Record<string, ProviderTemplate> = {
  server: {
    id: "server",
    displayName: "Server API (Authenticated)",
    baseURL: "https://www.superwizard.ai/api/v1",
    apiKeyPlaceholder: "Authenticated via login",
    apiKeyUrl: "#", // No external API key needed
    defaultModels: [
      "superwizard/gemini-2.0-flash",
      "superwizard/gemini-2.5-flash",
      "superwizard/gemini-2.5-flash-0925",
      "superwizard/gemini-2.5-flash-lite-0925",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
      "meta-llama/llama-4-maverick",
      "meta-llama/llama-4-scout",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-0925",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.0-flash",
      "google/gemini-2.0-flash-lite",
    ],
    supportedModelFormat: "provider/model",
    description: "Authenticated models available through Server API",
  },
  openai: {
    id: "openai",
    displayName: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    apiKeyPlaceholder: "sk-...",
    apiKeyUrl: "https://platform.openai.com/account/api-keys",
    defaultModels: [
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "o4-mini",
      "o3",
    ],
    supportedModelFormat: "model",
    description: "Official OpenAI models",
  },
  openrouter: {
    id: "openrouter",
    displayName: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKeyPlaceholder: "sk-or-...",
    apiKeyUrl: "https://openrouter.ai/keys",
    defaultModels: [
      "openai/gpt-5",
      "google/gemini-2.5-flash-preview-09-2025",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.0-flash-001",
      "google/gemini-2.0-flash-lite-001",
      "meta-llama/llama-4-maverick",
      "meta-llama/llama-4-scout",
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-sonnet-4",
      "moonshotai/kimi-k2-0905",
      "qwen/qwen3-coder-30b-a3b-instruct",
      "qwen/qwen3-coder",
    ],
    supportedModelFormat: "provider/model",
    description: "Access to multiple AI providers through OpenRouter",
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    baseURL: "https://api.anthropic.com/v1",
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyUrl: "https://console.anthropic.com/account/keys",
    defaultModels: [
      "claude-sonnet-4-20250514",
      "claude-3-7-sonnet-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
    ],
    supportedModelFormat: "model",
    description: "Official Anthropic Claude models",
  },
  google: {
    id: "google",
    displayName: "Google AI",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyPlaceholder: "AIza...",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    defaultModels: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ],
    supportedModelFormat: "model",
    description: "Official Google Gemini models",
  },
};

// Helper function to generate display names from model IDs
export const generateDisplayName = (modelId: string): string => {
  // Handle provider/model format
  if (modelId.includes("/")) {
    const [provider, model] = modelId.split("/");
    return model
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Handle simple model format
  return modelId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Helper function to get the appropriate icon ID for a model
export const getModelIconId = (modelId: string, providerId: string): string => {
  // For Server provider, extract the provider from the model ID
  if (providerId === "server" && modelId.includes("/")) {
    const [modelProvider] = modelId.split("/");

    // Map Server provider prefixes to icon IDs
    switch (modelProvider) {
      case "superwizard":
        return ""; // No icon for superwizard models
      case "openai":
        return "openai";
      case "google":
        return "google";
      case "anthropic":
        return "anthropic";
      case "meta-llama":
        return "meta";
      case "x-ai":
        return "x-ai";
      default:
        return ""; // No icon for unknown providers
    }
  }

  // For OpenRouter, extract the provider from the model ID
  if (providerId === "openrouter" && modelId.includes("/")) {
    const [modelProvider] = modelId.split("/");

    // Map OpenRouter provider prefixes to icon IDs
    switch (modelProvider) {
      case "openai":
        return "openai";
      case "google":
        return "google";
      case "anthropic":
        return "anthropic";
      case "meta-llama":
        return "meta";
      case "x-ai":
        return "x-ai";
      default:
        return "openrouter"; // Fallback to OpenRouter icon
    }
  }

  // For other providers, use the provider ID directly
  return providerId;
};

// Get template by provider ID
export const getProviderTemplate = (
  providerId: string
): ProviderTemplate | undefined => {
  return PROVIDER_TEMPLATES[providerId];
};

// Get all available provider templates
export const getAllProviderTemplates = (): ProviderTemplate[] => {
  return Object.values(PROVIDER_TEMPLATES);
};

// Check if a model is supported by Server provider
export const isServerModel = (modelId: string): boolean => {
  const serverTemplate = getProviderTemplate("server");
  return serverTemplate?.defaultModels?.includes(modelId) || false;
};

// Get provider type from model ID
export const getProviderTypeFromModel = (modelId: string): string => {
  // Check Server first
  if (isServerModel(modelId)) {
    return "server";
  }
  
  // Check other providers
  for (const [providerId, template] of Object.entries(PROVIDER_TEMPLATES)) {
    if (template.defaultModels?.includes(modelId)) {
      return providerId;
    }
  }
  
  // OpenRouter models typically have format "provider/model" (e.g., "openai/gpt-4")
  if (modelId.includes("/") && !modelId.startsWith("superwizard/")) {
    return "openrouter";
  }
  
  // If it's a simple model name without provider prefix, assume OpenAI
  if (!modelId.includes("/")) {
    return "openai";
  }
  
  return "unknown";
};
