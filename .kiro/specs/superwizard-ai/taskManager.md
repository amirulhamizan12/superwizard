# Task Manager System

## Overview

The Task Manager is the central orchestration system that coordinates the entire automation workflow from user command input to task completion. It manages the execution lifecycle, progress tracking, error handling, and state coordination across all extension components.

## Architecture

### Core Components

```typescript
interface TaskManagerSlice {
  tabId: number;                    // Target tab for automation
  status: TaskStatus;               // Current execution state
  actionStatus: ActionStatus;       // Granular action progress
  taskProgress: TaskProgress;       // Progress tracking data
  actions: TaskManagerActions;      // Available operations
}

type TaskStatus = "idle" | "running" | "completed" | "failed" | "error" | "success";
type ActionStatus = "idle" | "initializing" | "pulling-dom" | "performing-query" | "performing-action";
```

### Task Progress Tracking

```typescript
interface TaskProgress {
  total: number;                    // Estimated total steps
  completed: number;                // Completed steps count
  type: string;                     // Task category (search, form, navigation, etc.)
  validationRules?: {
    successIndicators: string[];    // DOM patterns indicating success
    failureIndicators: string[];    // DOM patterns indicating failure
    pendingIndicators: string[];    // DOM patterns indicating in-progress
  };
}
```

## Execution Workflow

### 1. Task Initialization

```typescript
async runTask(onError?: (error: string) => void): Promise<void>
```

**Process:**
1. **Validation**: Verify instructions exist and are valid
2. **User Message Creation**: Create chat history entry for user command
3. **Progress Setup**: Parse task requirements and initialize progress tracking
4. **Tab Management**: Identify target tab and handle restricted URLs
5. **State Setup**: Set task running state and initialize tracking

**Key Features:**
- Automatic navigation away from restricted Chrome URLs to Google.com
- Progress estimation based on task complexity analysis
- Chat history integration for conversation continuity

### 2. Main Execution Loop

The core automation loop that continues until task completion or failure:

```typescript
while (shouldContinue && !wasStopped()) {
  // 1. Wait for any active actions to complete
  if (hasActiveAction()) await waitForActionCompletion();
  
  // 2. Ensure page stability before DOM analysis
  setActionStatus("pulling-dom");
  await ensurePageStability(tabId);
  
  // 3. Extract and simplify current DOM state
  const pageDOM = await getSimplifiedDom();
  
  // 4. Prepare AI context with history and current state
  setActionStatus("performing-query");
  const fullFormattedPrompt = await formatPrompt(
    instructions, 
    previousActions, 
    currentDom, 
    allHistory, 
    screenshotDataUrl
  );
  
  // 5. Get next action from AI
  const actionResponse = await determineNextAction(/* ... */);
  
  // 6. Execute the determined action
  setActionStatus("performing-action");
  const actionResult = await executeAction(action);
  
  // 7. Validate and update progress
  const validationResult = validateAction(name, actionResult);
  if (validationResult === "success") {
    updateProgress();
  }
  
  // 8. Check for completion conditions
  shouldContinue = !["finish", "fail", "respond"].includes(name);
}
```

### 3. Action Execution

```typescript
const executeAction = async (action: AIResponseResult) => {
  const { name, args } = action.parsedAction;
  
  // Terminal actions (end execution)
  if (["finish", "fail", "respond"].includes(name)) {
    return { success: name !== "fail", message: args.message || "" };
  }
  
  // DOM actions (continue execution)
  if (["click", "setValue", "navigate", "waiting"].includes(name)) {
    return await callDOMAction(name, args);
  }
  
  return { success: false, error: `Unknown action: ${name}` };
};
```

## State Management

### Task Status Transitions

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> running: runTask()
    running --> pulling-dom: DOM extraction
    pulling-dom --> performing-query: AI processing
    performing-query --> performing-action: Action execution
    performing-action --> running: Continue loop
    performing-action --> completed: finish()
    performing-action --> failed: fail()
    performing-action --> success: respond()
    performing-action --> error: Exception
    running --> idle: interrupt()
    completed --> idle: New task
    failed --> idle: New task
    success --> idle: New task
    error --> idle: New task
```

### Progress Validation

The Task Manager implements intelligent progress validation:

```typescript
validateAction(actionType: string, result: any): "success" | "pending" | "failure" {
  const { validationRules } = this.taskProgress;
  if (!rules) return "success";
  
  const resultStr = JSON.stringify(result).toLowerCase();
  
  // Check for explicit success indicators
  if (rules.successIndicators.some(indicator => 
    resultStr.includes(indicator.toLowerCase())
  )) {
    return "success";
  }
  
  // Check for explicit failure indicators
  if (rules.failureIndicators.some(indicator => 
    resultStr.includes(indicator.toLowerCase())
  )) {
    return "failure";
  }
  
  return "pending";
}
```

## Error Handling

### Error Classification

1. **Recoverable Errors**: Temporary issues that can be retried
   - Network timeouts
   - Element not found (DOM changes)
   - Page loading delays

2. **Task-Level Errors**: Issues requiring user intervention
   - Invalid commands
   - Authentication failures
   - Site restrictions

3. **System-Level Errors**: Critical failures requiring restart
   - Extension permission issues
   - Chrome API failures
   - Memory/resource exhaustion

### Error Recovery Strategy

```typescript
const handleError = async (error: Error | string, tabId?: number) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Log error for debugging
  console.error("Task execution error:", error);
  
  // Notify user through callback
  onError?.(errorMessage);
  
  // Create error history entry
  const errorEntry = createHistoryEntry(
    `<Action>Task Error("${errorMessage}")</Action>`,
    "Task Error",
    { message: errorMessage }
  );
  
  // Update chat history
  await addMessageToCurrentChat(errorEntry);
  
  // Update task state
  updateTaskState({ status: "error", actionStatus: "idle" });
  
  // Clean up task running state
  if (tabId) await setTaskRunningState(false, tabId);
};
```

## Task Requirements Parsing

The system analyzes user instructions to estimate task complexity:

```typescript
export function parseTaskRequirements(instructions: string): TaskProgress {
  const taskConfig = {
    total: 1,
    completed: 0,
    type: "general",
    validationRules: undefined
  };
  
  // Analyze instruction complexity
  const words = instructions.toLowerCase().split(' ');
  const actionWords = ['click', 'type', 'search', 'navigate', 'fill', 'submit'];
  const actionCount = words.filter(word => actionWords.includes(word)).length;
  
  // Estimate steps based on complexity indicators
  if (instructions.includes('and then') || instructions.includes('after')) {
    taskConfig.total = Math.max(actionCount, 3);
  } else if (actionCount > 1) {
    taskConfig.total = actionCount;
  }
  
  // Categorize task type
  if (words.some(w => ['search', 'find', 'look'].includes(w))) {
    taskConfig.type = 'search';
  } else if (words.some(w => ['fill', 'form', 'submit'].includes(w))) {
    taskConfig.type = 'form';
  } else if (words.some(w => ['navigate', 'go', 'visit'].includes(w))) {
    taskConfig.type = 'navigation';
  }
  
  return taskConfig;
}
```

## Integration Points

### With AI System
- Provides context and history for prompt generation
- Receives and validates AI responses
- Manages conversation flow and memory

### With DOM Operations
- Coordinates action execution timing
- Manages page stability requirements
- Handles action result validation

### With State Management
- Persists task progress and history
- Manages chat session continuity
- Coordinates with settings and authentication

### With UI Components
- Provides real-time status updates
- Enables user interruption capabilities
- Manages progress visualization

## Performance Considerations

### Memory Management
- Limits chat history size to prevent memory bloat
- Cleans up completed task data
- Manages screenshot storage efficiently

### Execution Optimization
- Implements intelligent delays between actions
- Batches DOM queries when possible
- Uses efficient event handling patterns

### Error Prevention
- Validates inputs before execution
- Implements circuit breaker patterns
- Monitors resource usage

## Configuration Options

### Task Execution Settings
```typescript
interface TaskConfig {
  maxRetries: number;           // Maximum retry attempts per action
  actionDelay: number;          // Delay between actions (ms)
  pageStabilityTimeout: number; // Max wait for page stability (ms)
  progressValidation: boolean;  // Enable progress validation
  screenshotCapture: boolean;   // Capture screenshots for AI context
}
```

### Default Configuration
```typescript
const DEFAULT_TASK_CONFIG: TaskConfig = {
  maxRetries: 3,
  actionDelay: 100,
  pageStabilityTimeout: 5000,
  progressValidation: true,
  screenshotCapture: false // User configurable
};
```

## Future Enhancements

### Planned Features
1. **Advanced Progress Prediction**: ML-based step estimation
2. **Parallel Action Execution**: Multi-tab coordination
3. **Task Templates**: Reusable automation patterns
4. **Performance Analytics**: Execution time optimization
5. **Smart Retry Logic**: Context-aware retry strategies

### API Extensions
1. **Task Scheduling**: Delayed and recurring tasks
2. **Conditional Logic**: If/then automation flows
3. **Data Extraction**: Structured data collection
4. **Cross-Site Workflows**: Multi-domain automation
5. **Integration Hooks**: External system connectivity

This Task Manager system provides the foundation for reliable, intelligent browser automation while maintaining flexibility for future enhancements and integrations.