import { useAppState } from "../../state";
import { parseAIResponse, AIResponseResult } from "./parseResponse";
import { systemMessage } from "./systemPrompt";
import { formatPrompt } from "./formatPrompt";
import { getProviderTypeFromModel } from "./endpoint/templates";
import { getProviderByModel, getModelConfig } from "./endpoint/userConfig";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface UsageMetrics {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ActionResponse {
  actions: AIResponseResult[];
  usage: UsageMetrics;
  parseError?: boolean;
  rawResponse?: string;
}

type APIResponse = { content: string; usage: UsageMetrics };

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function handleAPIError(response: Response, errorText: string, apiType: string): never {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  try {
    const errorData = JSON.parse(errorText);
    if (errorData.error?.message) errorMessage = errorData.error.message;
  } catch {
    if (errorText) errorMessage = errorText;
  }
  throw new Error(`${apiType} API Error: ${errorMessage}`);
}

function getUserFriendlyError(errorMessage: string): string {
  const errorMap: Record<string, string> = {
    "401": "API key is invalid or expired. Please check your API key configuration.",
    "429": "Rate limit exceeded. Please wait a moment before trying again.",
    "500": "Server error from AI provider. Please try again later.",
    "403": "Access forbidden. Please check your API key permissions.",
  };
  
  for (const [code, message] of Object.entries(errorMap)) {
    if (errorMessage.includes(code)) return message;
  }
  
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Server Network error. Please check your internet connection.";
  }
  
  return errorMessage;
}

function createUsageMetrics(data: any, provider: string): UsageMetrics {
  switch (provider) {
    case "anthropic":
      return {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      };
    case "google":
      return {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      };
    default:
      return {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      };
  }
}

// ============================================================================
// API CLIENT FUNCTIONS
// ============================================================================

async function callServerAPI(model: string, messages: any[], maxTokens = 4096): Promise<APIResponse> {
  const authState = useAppState.getState().auth;
  
  const session = authState.session;
  
  if (!session?.user) {
    throw new Error("No valid authentication available. Please sign in to continue.");
  }

  const [author, slug] = model.split('/');
  if (!author || !slug) {
    throw new Error(`Invalid model format: ${model}. Expected format: author/slug`);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const response = await fetch(`https://lockheed-web.vercel.app/api/v1/models/${author}/${slug}/endpoints`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, max_tokens: maxTokens }),
    credentials: 'include'  // Always send cookies for session-based auth
  });

  if (!response.ok) handleAPIError(response, await response.text(), "Server");

  const data = await response.json();
  if (!data.choices?.[0]?.message) {
    throw new Error("Invalid response format from Server API");
  }

  return {
    content: data.choices[0].message.content,
    usage: createUsageMetrics(data, "default"),
  };
}

async function callAnthropicAPI(
  apiKey: string, baseURL: string, model: string, system: string,
  userContent: any, maxTokens: number, temperature: number
): Promise<APIResponse> {
  const response = await fetch(`${baseURL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model, max_tokens: maxTokens, temperature, system,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) handleAPIError(response, await response.text(), "Anthropic");

  const data = await response.json();
  if (!data.content?.length) {
    throw new Error("Invalid response format from Anthropic API");
  }

  return {
    content: data.content[0].text,
    usage: createUsageMetrics(data, "anthropic"),
  };
}

async function callOpenAIAPI(
  apiKey: string, baseURL: string, model: string,
  messages: Array<{ role: string; content: any }>,
  maxTokens: number, temperature: number, additionalConfig?: Record<string, any>
): Promise<APIResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, ...additionalConfig }),
  });

  if (!response.ok) handleAPIError(response, await response.text(), "OpenAI");

  const data = await response.json();
  const responseContent = data.choices?.[0]?.message?.content;

  if (!responseContent) {
    throw new Error("No content in response from OpenAI API");
  }

  return {
    content: responseContent,
    usage: createUsageMetrics(data, "default"),
  };
}

async function callOpenRouterAPI(
  apiKey: string, baseURL: string, model: string,
  messages: Array<{ role: string; content: any }>,
  maxTokens: number, temperature: number, additionalConfig?: Record<string, any>
): Promise<APIResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://www.superwizard.ai",
    "X-Title": "Superwizard AI",
  };

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, ...additionalConfig }),
  });

  if (!response.ok) handleAPIError(response, await response.text(), "OpenRouter");

  const data = await response.json();
  const responseContent = data.choices?.[0]?.message?.content;

  if (!responseContent) {
    throw new Error("No content in response from OpenRouter API");
  }

  return {
    content: responseContent,
    usage: createUsageMetrics(data, "default"),
  };
}

async function callGoogleAPI(
  apiKey: string, baseURL: string, model: string, prompt: string,
  maxTokens: number, temperature: number, screenshotDataUrl?: string
): Promise<APIResponse> {
  const hasScreenshot = screenshotDataUrl?.startsWith("data:");
  
  const parts: any[] = [{ text: prompt }];
  if (hasScreenshot) {
    parts.push({
      inline_data: {
        mime_type: "image/png",
        data: screenshotDataUrl!.split(',')[1]
      }
    });
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: { maxOutputTokens: maxTokens, temperature }
  };

  const response = await fetch(`${baseURL}/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) handleAPIError(response, await response.text(), "Google");

  const data = await response.json();
  const responseContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!responseContent) {
    throw new Error("No content in response from Google API");
  }

  return {
    content: responseContent,
    usage: createUsageMetrics(data, "google"),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMessages(hasScreenshot: boolean, prompt: string, screenshotDataUrl?: string) {
  const baseMessages = [{ role: "system", content: systemMessage }];
  
  if (hasScreenshot) {
    return [
      ...baseMessages,
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: screenshotDataUrl } },
        ],
      },
    ];
  }
  
  return [...baseMessages, { role: "user", content: prompt }];
}

function validateConfiguration(
  selectedModel: string, providerType: string, isAuthenticated: boolean,
  provider: any, notifyError?: (error: string) => void
): boolean {
  if (!selectedModel) {
    notifyError?.("No model selected. Please select a model from the dropdown.");
    return false;
  }

  if (providerType === "server") {
    if (!isAuthenticated) {
      notifyError?.("Please sign in to use authenticated models.");
      return false;
    }
  } else {
    if (!provider) {
      notifyError?.("Provider not configured for this model. Please configure the provider in settings.");
      return false;
    }
    if (!provider.apiKey?.trim()) {
      notifyError?.("API key not configured for this provider. Please add your API key in settings.");
      return false;
    }
  }
  return true;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function determineNextAction(
  taskInstructions: string,
  previousActions: Extract<AIResponseResult, { thought: string }>[],
  simplifiedDOM: string,
  notifyError?: (error: string) => void,
  screenshotDataUrl?: string,
  preComputedPrompt?: string
): Promise<ActionResponse | null> {
  const state = useAppState.getState();
  const { selectedModel, configuredProviders } = state.settings;
  const isAuthenticated = state.auth.isAuthenticated;
  const allHistory = state.storage.actions.getCurrentChatMessages();
  const prompt = preComputedPrompt || await formatPrompt(
    taskInstructions, previousActions, simplifiedDOM, allHistory, screenshotDataUrl
  );

  console.log("🔍 Formatted prompt being sent to AI:", {
    model: selectedModel,
    promptLength: prompt.length,
    promptPreview: prompt.substring(0, 200) + "...",
  });

  const provider = getProviderByModel(selectedModel, configuredProviders);
  const modelConfig = getModelConfig(selectedModel, configuredProviders);
  const providerType = getProviderTypeFromModel(selectedModel);

  if (!validateConfiguration(selectedModel, providerType, isAuthenticated, provider, notifyError)) {
    return null;
  }

  try {
    const hasScreenshot = screenshotDataUrl?.startsWith("data:");
    const maxTokens = modelConfig?.maxTokens || 4096;
    const temperature = 0.7;
    let response: APIResponse;

    console.log(`🤖 Using ${providerType} API for model:`, selectedModel);

    switch (providerType) {
      case "server":
        response = await callServerAPI(selectedModel, createMessages(!!hasScreenshot, prompt, screenshotDataUrl), maxTokens);
        break;
      case "anthropic":
        const userContent = hasScreenshot
          ? [{ type: "text", text: prompt }, { type: "image", source: { type: "base64", media_type: "image/png", data: screenshotDataUrl!.split(',')[1] } }]
          : prompt;
        response = await callAnthropicAPI(provider!.apiKey, provider!.baseURL, selectedModel, systemMessage, userContent, maxTokens, temperature);
        break;
      case "google":
        response = await callGoogleAPI(provider!.apiKey, provider!.baseURL, selectedModel, `${systemMessage}\n\n${prompt}`, maxTokens, temperature, screenshotDataUrl);
        break;
              case "openai":
          response = await callOpenAIAPI(provider!.apiKey, provider!.baseURL, selectedModel, createMessages(!!hasScreenshot, prompt, screenshotDataUrl), maxTokens, temperature, modelConfig?.additionalConfig);
          break;
        case "openrouter":
          response = await callOpenRouterAPI(provider!.apiKey, provider!.baseURL, selectedModel, createMessages(!!hasScreenshot, prompt, screenshotDataUrl), maxTokens, temperature, modelConfig?.additionalConfig);
          break;
        default:
          // Fallback to OpenAI for any other OpenAI-compatible providers
          response = await callOpenAIAPI(provider!.apiKey, provider!.baseURL, selectedModel, createMessages(!!hasScreenshot, prompt, screenshotDataUrl), maxTokens, temperature, modelConfig?.additionalConfig);
    }

    const parsed = parseAIResponse(response.content);
    if ("error" in parsed) {
      notifyError?.(`Failed to parse AI response. Error: ${parsed.error}`);
      return { actions: [parsed], usage: response.usage, parseError: true, rawResponse: response.content };
    }

    return { actions: [parsed], usage: response.usage, rawResponse: response.content };
  } catch (error) {
    console.error("AI request failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const userFriendlyMessage = getUserFriendlyError(errorMessage);

    notifyError?.(`AI request failed. Error: ${userFriendlyMessage}`);
    return {
      actions: [{ error: userFriendlyMessage }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      parseError: false,
      rawResponse: "",
    };
  }
}
