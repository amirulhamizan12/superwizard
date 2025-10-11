import { useAppState } from "../../state";
import { parseAIResponse, AIResponseResult } from "./surfgraph/parseResponse";
import { systemMessage } from "./surfgraph/systemPrompt";
import { formatPrompt } from "./surfgraph/formatPrompt";
import { getProviderTypeFromModel } from "./endpoint/templates";
import { getProviderByModel, getModelConfig, parseModelKey } from "./endpoint/userConfig";

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

// Streaming response types
export interface StreamingActionResponse {
  actions: AIResponseResult[];
  usage: UsageMetrics;
  parseError?: boolean;
  rawResponse?: string;
}

export interface StreamingCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: string) => void;
  onUsage?: (usage: UsageMetrics) => void;
}

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

  const response = await fetch(`https://www.superwizard.ai/api/v1/models/${author}/${slug}/endpoints`, {
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

// Streaming version of Server API call
async function callServerAPIStreaming(
  model: string, 
  messages: any[], 
  maxTokens: number,
  callbacks: StreamingCallbacks
): Promise<void> {
  const authState = useAppState.getState().auth;
  const session = authState.session;
  
  if (!session?.user) {
    callbacks.onError("No valid authentication available. Please sign in to continue.");
    return;
  }

  const [author, slug] = model.split('/');
  if (!author || !slug) {
    callbacks.onError(`Invalid model format: ${model}. Expected format: author/slug`);
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const response = await fetch(`https://www.superwizard.ai/api/v1/models/${author}/${slug}/endpoints`, {
    method: "POST",
    headers,
    body: JSON.stringify({ 
      messages, 
      max_tokens: maxTokens,
      stream: true 
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text();
    callbacks.onError(`Server API error: ${errorText}`);
    return;
  }

  if (!response.body) {
    callbacks.onError("No response body for streaming");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete(fullContent);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              callbacks.onChunk(content);
            }
            
            // Capture usage data if available
            if (parsed.usage && callbacks.onUsage) {
              callbacks.onUsage(createUsageMetrics(parsed, "default"));
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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

// Streaming version of OpenAI API call
async function callOpenAIAPIStreaming(
  apiKey: string, baseURL: string, model: string,
  messages: Array<{ role: string; content: any }>,
  maxTokens: number, temperature: number, 
  callbacks: StreamingCallbacks,
  additionalConfig?: Record<string, any>
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ 
      model, 
      messages, 
      max_tokens: maxTokens, 
      temperature, 
      stream: true,
      ...additionalConfig 
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    callbacks.onError(`OpenAI API error: ${errorText}`);
    return;
  }

  if (!response.body) {
    callbacks.onError("No response body for streaming");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete(fullContent);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              callbacks.onChunk(content);
            }
            
            // Capture usage data if available
            if (parsed.usage && callbacks.onUsage) {
              callbacks.onUsage(createUsageMetrics(parsed, "default"));
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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

// Streaming version of OpenRouter API call
async function callOpenRouterAPIStreaming(
  apiKey: string, baseURL: string, model: string,
  messages: Array<{ role: string; content: any }>,
  maxTokens: number, temperature: number, 
  callbacks: StreamingCallbacks,
  additionalConfig?: Record<string, any>
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://www.superwizard.ai",
    "X-Title": "Superwizard AI",
  };

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ 
      model, 
      messages, 
      max_tokens: maxTokens, 
      temperature, 
      stream: true,
      ...additionalConfig 
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    callbacks.onError(`OpenRouter API error: ${errorText}`);
    return;
  }

  if (!response.body) {
    callbacks.onError("No response body for streaming");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete(fullContent);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              callbacks.onChunk(content);
            }
            
            // Capture usage data if available
            if (parsed.usage && callbacks.onUsage) {
              callbacks.onUsage(createUsageMetrics(parsed, "default"));
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function callGoogleAPI(
  apiKey: string, baseURL: string, model: string, prompt: string,
  maxTokens: number, temperature: number
): Promise<APIResponse> {
  const parts: any[] = [{ text: prompt }];

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

// Streaming version of Google API call
async function callGoogleAPIStreaming(
  apiKey: string, baseURL: string, model: string, prompt: string,
  maxTokens: number, temperature: number, 
  callbacks: StreamingCallbacks
): Promise<void> {
  const parts: any[] = [{ text: prompt }];

  const requestBody = {
    contents: [{ parts }],
    generationConfig: { maxOutputTokens: maxTokens, temperature }
  };

  const response = await fetch(`${baseURL}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    callbacks.onError(`Google API error: ${errorText}`);
    return;
  }

  if (!response.body) {
    callbacks.onError("No response body for streaming");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      
      // Simple approach: just stream the raw text content as it comes
      // Look for text content in the chunk and stream it directly
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          // Skip empty data events
          if (data === '') continue;
          
          try {
            const parsed = JSON.parse(data);
            
            // Extract and stream only the text content
            if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
              const textContent = parsed.candidates[0].content.parts[0].text;
              fullContent += textContent;
              callbacks.onChunk(textContent);
            }
            
            // Capture usage data if available
            if (parsed.usageMetadata && callbacks.onUsage) {
              callbacks.onUsage(createUsageMetrics(parsed, "google"));
            }
            
            // Check if streaming is complete
            if (parsed.candidates?.[0]?.finishReason) {
              callbacks.onComplete(fullContent);
              return;
            }
          } catch (e) {
            // Skip invalid JSON, continue processing
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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

// Streaming version of Anthropic API call
async function callAnthropicAPIStreaming(
  apiKey: string, baseURL: string, model: string, system: string,
  userContent: any, maxTokens: number, temperature: number,
  callbacks: StreamingCallbacks
): Promise<void> {
  const response = await fetch(`${baseURL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model, 
      max_tokens: maxTokens, 
      temperature, 
      system,
      messages: [{ role: "user", content: userContent }],
      stream: true
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    callbacks.onError(`Anthropic API error: ${errorText}`);
    return;
  }

  if (!response.body) {
    callbacks.onError("No response body for streaming");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete(fullContent);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            
            // Handle different event types from Anthropic
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              const content = parsed.delta.text;
              fullContent += content;
              callbacks.onChunk(content);
            } else if (parsed.type === 'message_stop') {
              callbacks.onComplete(fullContent);
              return;
            }
            
            // Capture usage data if available
            if (parsed.usage && callbacks.onUsage) {
              callbacks.onUsage(createUsageMetrics(parsed, "anthropic"));
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMessages(prompt: string) {
  const baseMessages = [{ role: "system", content: systemMessage }];
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
  preComputedPrompt?: string
): Promise<ActionResponse | null> {
  const state = useAppState.getState();
  const { selectedModel, configuredProviders } = state.settings;
  const isAuthenticated = state.auth.isAuthenticated;
  const allHistory = state.storage.actions.getCurrentChatMessages();
  const prompt = preComputedPrompt || await formatPrompt(
    taskInstructions, previousActions, simplifiedDOM, allHistory
  );

  // Parse the composite model key
  const { source, modelId } = parseModelKey(selectedModel);

  console.log("🔍 Formatted prompt being sent to AI:", {
    model: selectedModel,
    parsedModelId: modelId,
    source: source,
    promptLength: prompt.length,
    promptPreview: prompt.substring(0, 200) + "...",
  });

  // Use source if available, otherwise fall back to detecting from modelId
  const providerType = source || getProviderTypeFromModel(modelId);
  const provider = getProviderByModel(modelId, configuredProviders);
  const modelConfig = getModelConfig(modelId, configuredProviders);

  if (!validateConfiguration(modelId, providerType, isAuthenticated, provider, notifyError)) {
    return null;
  }

  try {
    const maxTokens = modelConfig?.maxTokens || 4096;
    const temperature = 0.7;
    let response: APIResponse;

    console.log(`🤖 Using ${providerType} API for model:`, modelId);

    switch (providerType) {
      case "server":
        response = await callServerAPI(modelId, createMessages(prompt), maxTokens);
        break;
      case "anthropic":
        response = await callAnthropicAPI(provider!.apiKey, provider!.baseURL, modelId, systemMessage, prompt, maxTokens, temperature);
        break;
      case "google":
        response = await callGoogleAPI(provider!.apiKey, provider!.baseURL, modelId, `${systemMessage}\n\n${prompt}`, maxTokens, temperature);
        break;
              case "openai":
          response = await callOpenAIAPI(provider!.apiKey, provider!.baseURL, modelId, createMessages(prompt), maxTokens, temperature, modelConfig?.additionalConfig);
          break;
        case "openrouter":
          response = await callOpenRouterAPI(provider!.apiKey, provider!.baseURL, modelId, createMessages(prompt), maxTokens, temperature, modelConfig?.additionalConfig);
          break;
        default:
          // Fallback to OpenAI for any other OpenAI-compatible providers
          response = await callOpenAIAPI(provider!.apiKey, provider!.baseURL, modelId, createMessages(prompt), maxTokens, temperature, modelConfig?.additionalConfig);
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

// Streaming version of determineNextAction
export async function determineNextActionStreaming(
  taskInstructions: string,
  previousActions: Extract<AIResponseResult, { thought: string }>[],
  simplifiedDOM: string,
  callbacks: StreamingCallbacks,
  preComputedPrompt?: string
): Promise<StreamingActionResponse | null> {
  const state = useAppState.getState();
  const { selectedModel, configuredProviders } = state.settings;
  const isAuthenticated = state.auth.isAuthenticated;
  const allHistory = state.storage.actions.getCurrentChatMessages();
  const prompt = preComputedPrompt || await formatPrompt(
    taskInstructions, previousActions, simplifiedDOM, allHistory
  );

  // Parse the composite model key
  const { source, modelId } = parseModelKey(selectedModel);

  console.log("🔍 Formatted prompt being sent to AI (streaming):", {
    model: selectedModel,
    parsedModelId: modelId,
    source: source,
    promptLength: prompt.length,
    promptPreview: prompt.substring(0, 200) + "...",
  });

  // Use source if available, otherwise fall back to detecting from modelId
  const providerType = source || getProviderTypeFromModel(modelId);
  const provider = getProviderByModel(modelId, configuredProviders);
  const modelConfig = getModelConfig(modelId, configuredProviders);

  if (!validateConfiguration(modelId, providerType, isAuthenticated, provider, callbacks.onError)) {
    return null;
  }

  try {
    const maxTokens = modelConfig?.maxTokens || 4096;
    const temperature = 0.7;
    let fullResponse = "";
    let capturedUsage: UsageMetrics | null = null;

    console.log(`🤖 Using ${providerType} API for model (streaming):`, modelId);

    // Set up streaming callbacks
    const streamingCallbacks: StreamingCallbacks = {
      onChunk: (chunk: string) => {
        fullResponse += chunk;
        callbacks.onChunk(chunk);
      },
      onComplete: (completeResponse: string) => {
        fullResponse = completeResponse;
        callbacks.onComplete(completeResponse);
      },
      onError: callbacks.onError,
      onUsage: (usage: UsageMetrics) => {
        capturedUsage = usage;
        callbacks.onUsage?.(usage);
      }
    };

    switch (providerType) {
      case "server":
        await callServerAPIStreaming(modelId, createMessages(prompt), maxTokens, streamingCallbacks);
        break;
      case "openai":
        await callOpenAIAPIStreaming(provider!.apiKey, provider!.baseURL, modelId, createMessages(prompt), maxTokens, temperature, streamingCallbacks, modelConfig?.additionalConfig);
        break;
      case "openrouter":
        await callOpenRouterAPIStreaming(provider!.apiKey, provider!.baseURL, modelId, createMessages(prompt), maxTokens, temperature, streamingCallbacks, modelConfig?.additionalConfig);
        break;
      case "anthropic":
        await callAnthropicAPIStreaming(provider!.apiKey, provider!.baseURL, modelId, systemMessage, prompt, maxTokens, temperature, streamingCallbacks);
        break;
      case "google":
        await callGoogleAPIStreaming(provider!.apiKey, provider!.baseURL, modelId, `${systemMessage}\n\n${prompt}`, maxTokens, temperature, streamingCallbacks);
        break;
      default:
        // For providers that don't support streaming, fall back to regular API call
        const response = await determineNextAction(taskInstructions, previousActions, simplifiedDOM, callbacks.onError, preComputedPrompt);
        if (response) {
          callbacks.onComplete(response.rawResponse || "");
          return {
            ...response
          };
        }
        return null;
    }

    // Parse the complete response after streaming is done
    const parsed = parseAIResponse(fullResponse);
    if ("error" in parsed) {
      callbacks.onError(`Failed to parse AI response. Error: ${parsed.error}`);
      return { 
        actions: [parsed], 
        usage: capturedUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, 
        parseError: true, 
        rawResponse: fullResponse
      };
    }

    return { 
      actions: [parsed], 
      usage: capturedUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, 
      rawResponse: fullResponse
    };
  } catch (error) {
    console.error("AI streaming request failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const userFriendlyMessage = getUserFriendlyError(errorMessage);

    callbacks.onError(`AI request failed. Error: ${userFriendlyMessage}`);
    return {
      actions: [{ error: userFriendlyMessage }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      parseError: false,
      rawResponse: ""
    };
  }
}
