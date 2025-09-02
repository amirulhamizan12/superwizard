# API Connection System

## Overview

The API Connection System provides a unified gateway for communicating with multiple AI providers while handling authentication, request formatting, response processing, and error management. It abstracts provider-specific implementations behind a consistent interface.

## Architecture

### Core Components

```typescript
interface AIGateway {
  determineNextAction(
    taskInstructions: string,
    previousActions: ActionHistory[],
    simplifiedDOM: string,
    context?: string,
    screenshotDataUrl?: string,
    fullPrompt?: string
  ): Promise<ActionResponse | null>;
}

interface ActionResponse {
  actions: AIResponseResult[];
  usage: UsageMetrics;
  parseError?: boolean;
  rawResponse?: string;
}

interface UsageMetrics {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
```

## Provider Architecture

### Supported Providers

1. **Server API** (Authenticated Models)
   - Endpoint: `http://localhost:3000/api/v1/models/{author}/{slug}/endpoints`
   - Authentication: Session-based cookies
   - Models: `superwizard/gemini-2.0-flash`, `superwizard/gemini-2.5-pro`, etc.

2. **OpenAI**
   - Endpoint: `https://api.openai.com/v1/chat/completions`
   - Authentication: Bearer token
   - Models: `gpt-4.1`, `gpt-4o`, `o3`, etc.

3. **Anthropic**
   - Endpoint: `https://api.anthropic.com/v1/messages`
   - Authentication: x-api-key header
   - Models: `claude-sonnet-4`, `claude-3.5-sonnet`, etc.

4. **OpenRouter**
   - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
   - Authentication: Bearer token
   - Models: Multi-provider access (`openai/gpt-4`, `anthropic/claude-3.5-sonnet`, etc.)

5. **Google AI**
   - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
   - Authentication: API key parameter
   - Models: `gemini-2.5-pro`, `gemini-2.0-flash`, etc.

### Provider Templates

```typescript
interface ProviderTemplate {
  id: string;
  displayName: string;
  baseURL: string;
  apiKeyPlaceholder: string;
  apiKeyUrl: string;
  defaultModels?: string[];
  supportedModelFormat: string; // "provider/model" or "model"
  description?: string;
}

const PROVIDER_TEMPLATES: Record<string, ProviderTemplate> = {
  server: {
    id: "server",
    displayName: "Server API (Authenticated)",
    baseURL: "http://localhost:3000/api/v1",
    supportedModelFormat: "provider/model",
    // No API key needed - uses session auth
  },
  openai: {
    id: "openai",
    displayName: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    supportedModelFormat: "model",
    // Requires API key
  }
  // ... other providers
};
```

## Request Processing Flow

### 1. Provider Selection and Validation

```typescript
export async function determineNextAction(/* parameters */): Promise<ActionResponse | null> {
  const state = useAppState.getState();
  const { selectedModel, configuredProviders } = state.settings;
  const isAuthenticated = state.auth.isAuthenticated;
  
  // Determine provider type from model
  const providerType = getProviderTypeFromModel(selectedModel);
  const provider = getProviderByModel(selectedModel, configuredProviders);
  
  // Validate configuration
  if (!validateConfiguration(selectedModel, providerType, isAuthenticated, provider)) {
    return null;
  }
  
  // Process request based on provider type
  const response = await routeToProvider(providerType, /* ... */);
  return response;
}
```

### 2. Provider-Specific Request Handling

#### Server API (Authenticated)
```typescript
async function callServerAPI(model: string, messages: any[], maxTokens = 4096): Promise<APIResponse> {
  const authState = useAppState.getState().auth;
  const session = authState.session;
  
  if (!session?.user) {
    throw new Error("No valid authentication available. Please sign in to continue.");
  }
  
  const [author, slug] = model.split('/');
  
  const response = await fetch(`http://localhost:3000/api/v1/models/${author}/${slug}/endpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_tokens: maxTokens }),
    credentials: 'include'  // Include session cookies
  });
  
  if (!response.ok) handleAPIError(response, await response.text(), "Server");
  
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: createUsageMetrics(data, "default"),
  };
}
```

#### OpenAI API
```typescript
async function callOpenAIAPI(
  apiKey: string, baseURL: string, model: string,
  messages: Array<{ role: string; content: any }>,
  maxTokens: number, temperature: number
): Promise<APIResponse> {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ 
      model, 
      messages, 
      max_tokens: maxTokens, 
      temperature 
    }),
  });
  
  if (!response.ok) handleAPIError(response, await response.text(), "OpenAI");
  
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: createUsageMetrics(data, "default"),
  };
}
```

#### Anthropic API
```typescript
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
      model, 
      max_tokens: maxTokens, 
      temperature, 
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  
  if (!response.ok) handleAPIError(response, await response.text(), "Anthropic");
  
  const data = await response.json();
  return {
    content: data.content[0].text,
    usage: createUsageMetrics(data, "anthropic"),
  };
}
```

## Message Formatting

### Standard Message Format (OpenAI-compatible)
```typescript
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
```

### Anthropic Message Format
```typescript
// Anthropic uses separate system parameter and different image format
const userContent = hasScreenshot
  ? [
      { type: "text", text: prompt },
      { 
        type: "image", 
        source: { 
          type: "base64", 
          media_type: "image/png", 
          data: screenshotDataUrl.split(',')[1] 
        } 
      }
    ]
  : prompt;
```

### Google AI Message Format
```typescript
// Google uses parts array with inline_data for images
const parts: any[] = [{ text: prompt }];
if (hasScreenshot) {
  parts.push({
    inline_data: {
      mime_type: "image/png",
      data: screenshotDataUrl.split(',')[1]
    }
  });
}

const requestBody = {
  contents: [{ parts }],
  generationConfig: { maxOutputTokens: maxTokens, temperature }
};
```

## Error Handling

### Error Classification and Recovery

```typescript
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
    return "Network error. Please check your internet connection.";
  }
  
  return errorMessage;
}
```

### Retry Logic

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Usage Metrics Processing

### Unified Usage Tracking

```typescript
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
    default: // OpenAI format
      return {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      };
  }
}
```

## Configuration Management

### Provider Configuration

```typescript
interface UserConfiguredProvider {
  id: string;
  name: string;
  apiKey: string;
  baseURL: string;
  models: UserConfiguredModel[];
}

interface UserConfiguredModel {
  id: string;
  displayName: string;
  maxTokens: number;
  additionalConfig?: Record<string, any>;
}
```

### Model Selection Logic

```typescript
export const getProviderTypeFromModel = (modelId: string): string => {
  // Check Server models first
  if (isServerModel(modelId)) {
    return "server";
  }
  
  // Check configured provider models
  for (const [providerId, template] of Object.entries(PROVIDER_TEMPLATES)) {
    if (template.defaultModels?.includes(modelId)) {
      return providerId;
    }
  }
  
  // OpenRouter models have format "provider/model"
  if (modelId.includes("/") && !modelId.startsWith("superwizard/")) {
    return "openrouter";
  }
  
  // Default to OpenAI for simple model names
  return "openai";
};
```

## Security Considerations

### API Key Management
- API keys stored in Chrome's secure local storage
- Keys encrypted using Chrome's built-in encryption
- No transmission of keys except to designated endpoints
- Automatic key validation on configuration

### Request Security
- HTTPS enforcement for all external API calls
- Proper CORS handling for cross-origin requests
- Request/response logging for debugging (optional)
- Rate limiting to prevent abuse

### Data Privacy
- No user data transmitted except to configured AI providers
- Screenshot data only sent when explicitly enabled
- Conversation history remains local
- No analytics or tracking implemented

## Performance Optimization

### Request Optimization
```typescript
// Efficient prompt caching
const promptCache = new Map<string, string>();

// Connection pooling for repeated requests
const connectionPool = new Map<string, any>();

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();
```

### Response Processing
```typescript
// Streaming response handling (future enhancement)
interface StreamingResponse {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

// Parallel processing for multiple providers
async function tryMultipleProviders(
  providers: string[], 
  request: any
): Promise<ActionResponse> {
  const promises = providers.map(provider => callProvider(provider, request));
  return Promise.race(promises);
}
```

## Monitoring and Debugging

### Request Logging
```typescript
interface APIRequestLog {
  timestamp: string;
  provider: string;
  model: string;
  promptLength: number;
  responseLength: number;
  duration: number;
  success: boolean;
  error?: string;
  usage?: UsageMetrics;
}

// Debug logging (development only)
console.log("🔍 Formatted prompt being sent to AI:", {
  model: selectedModel,
  promptLength: prompt.length,
  promptPreview: prompt.substring(0, 200) + "...",
});
```

### Health Monitoring
```typescript
interface ProviderHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime: number;
  errorRate: number;
}

// Provider health checking
async function checkProviderHealth(providerId: string): Promise<ProviderHealth> {
  // Implementation for monitoring provider availability
}
```

## Future Enhancements

### Planned Features
1. **Streaming Responses**: Real-time response processing
2. **Provider Failover**: Automatic fallback to backup providers
3. **Response Caching**: Cache similar requests for performance
4. **Batch Processing**: Multiple requests in single API call
5. **Custom Endpoints**: User-defined API endpoints

### Advanced Capabilities
1. **Function Calling**: Structured tool use with compatible models
2. **Multi-Modal Input**: Enhanced image and document processing
3. **Context Windows**: Intelligent context management for long conversations
4. **Model Routing**: Automatic model selection based on task type
5. **Cost Optimization**: Usage-based provider selection

This API Connection System provides a robust, scalable foundation for AI provider integration while maintaining security, performance, and extensibility for future enhancements.