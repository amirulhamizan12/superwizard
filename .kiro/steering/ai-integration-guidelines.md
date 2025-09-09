---
inclusion: fileMatch
fileMatchPattern: "src/wizardry/ai/**/*.ts"
---

# AI Integration Guidelines for Superwizard AI

## Multi-Provider Architecture

### Provider Abstraction Pattern
```typescript
interface AIProvider {
  id: string;
  name: string;
  baseURL: string;
  authenticate(apiKey: string): boolean;
  formatRequest(prompt: string, options: RequestOptions): any;
  parseResponse(response: any): ActionResponse;
  handleError(error: any): string;
}
```

### Unified Gateway Implementation
- Use consistent interface across all providers
- Implement proper error handling and retry logic
- Support provider failover for reliability
- Maintain usage tracking and cost monitoring

## Prompt Engineering Standards

### Chain-of-Thought Structure
Always enforce this specific reasoning pattern in prompts:
1. **Task Acknowledgment**: "The user asked me to do: [task]"
2. **Progress Analysis**: "Based on Current Actions History, I have done: [summary]"
3. **DOM State Evaluation**: "Now let me analyze the current DOM state..."
4. **Next Step Planning**: "Given the task and DOM state, I think I should..."
5. **Element Identification**: "Looking at current page contents, I can identify..."
6. **Memory Storage**: Optional context preservation for complex tasks

### Response Format Enforcement
```xml
<thought>
[Chain-of-thought reasoning following the structure above]
</thought>
<action>actionName(parameters)</action>
```

### DOM Context Optimization
- Simplify DOM to essential interactive elements only
- Assign unique data-id attributes for reliable targeting
- Include relevant context (form structure, navigation state)
- Limit DOM size to prevent token overflow

## Action System Design

### Supported Actions
```typescript
type ActionName = 
  | 'click'      // click(elementId: number)
  | 'setValue'   // setValue(elementId: number, text: string)
  | 'navigate'   // navigate(url: string)
  | 'waiting'    // waiting(seconds: number)
  | 'finish'     // finish()
  | 'fail'       // fail(message: string)
  | 'respond';   // respond(message: string)
```

### Action Validation Rules
- Validate element IDs exist in current DOM
- Check parameter types match expected formats
- Ensure action sequence logic is sound
- Implement safety constraints for destructive actions

## Error Handling Strategies

### Provider-Specific Error Handling
```typescript
function handleProviderError(error: any, provider: string): string {
  const errorMap: Record<string, Record<string, string>> = {
    openai: {
      '401': 'Invalid API key. Please check your OpenAI configuration.',
      '429': 'Rate limit exceeded. Please wait before trying again.',
      '500': 'OpenAI service error. Please try again later.'
    },
    anthropic: {
      '401': 'Invalid API key. Please check your Anthropic configuration.',
      '429': 'Rate limit exceeded. Please wait before trying again.',
      '500': 'Anthropic service error. Please try again later.'
    }
  };
  
  return errorMap[provider]?.[error.status] || `${provider} API error: ${error.message}`;
}
```

### Retry Logic Implementation
- Use exponential backoff for transient failures
- Implement circuit breaker pattern for persistent failures
- Maintain request context for retry attempts
- Log retry attempts for debugging

## Response Processing

### Usage Metrics Normalization
```typescript
function normalizeUsageMetrics(data: any, provider: string): UsageMetrics {
  switch (provider) {
    case 'anthropic':
      return {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      };
    case 'google':
      return {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0
      };
    default: // OpenAI format
      return {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      };
  }
}
```

### Response Validation
- Validate response format matches expected structure
- Check for required fields in AI responses
- Implement fallback parsing for malformed responses
- Log parsing errors for debugging

## Security Considerations

### API Key Management
- Store keys in Chrome's secure storage only
- Never log or expose keys in console output
- Implement key rotation support
- Validate keys before making requests

### Request Sanitization
- Sanitize all user inputs before including in prompts
- Validate URLs before navigation actions
- Implement content filtering for sensitive data
- Use proper encoding for special characters

## Performance Optimization

### Request Optimization
```typescript
// Implement request caching for similar prompts
const promptCache = new Map<string, ActionResponse>();

// Use connection pooling for repeated requests
const connectionPool = new Map<string, any>();

// Implement request deduplication
const pendingRequests = new Map<string, Promise<ActionResponse>>();
```

### Context Management
- Limit conversation history to prevent token overflow
- Implement intelligent context pruning
- Use compression for large DOM structures
- Cache frequently used prompt templates

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
```

### Debug Information
- Log prompt construction process in development
- Track token usage across providers
- Monitor response parsing success rates
- Maintain error frequency statistics

These guidelines ensure robust, secure, and efficient AI integration while maintaining consistency across all providers and use cases.