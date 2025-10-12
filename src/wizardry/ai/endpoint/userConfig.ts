import { generateDisplayName, getProviderTemplate } from "./templates";

export interface UserConfiguredModel {
  id: string; 
  displayName: string; 
  maxTokens: number;
  additionalConfig?: Record<string, any>;
}

export interface UserConfiguredProvider {
  id: string;
  name: string;
  apiKey: string;
  baseURL: string;
  models: UserConfiguredModel[];
}

export interface ModelConfig {
  maxTokens: number;
  additionalConfig?: Record<string, any>;
}

// ============================================================================
// MODEL KEY PARSING
// ============================================================================

// Parse composite model key in format "source:modelId"
// Falls back to treating entire string as modelId for backwards compatibility
export function parseModelKey(modelKey: string): { source: string | null; modelId: string } {
  if (modelKey.includes(":")) {
    const [source, ...modelIdParts] = modelKey.split(":");
    return { source, modelId: modelIdParts.join(":") }; // Rejoin in case modelId itself contains ":"
  }
  return { source: null, modelId: modelKey };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getUserConfiguredProviders = (
  configuredProviders: UserConfiguredProvider[]
): UserConfiguredProvider[] => {
  return configuredProviders.filter(
    (provider) =>
      provider.apiKey && provider.apiKey.trim() && provider.models.length > 0
  );
};

export const getAllAvailableModels = (
  configuredProviders: UserConfiguredProvider[]
): Record<string, string[]> => {
  const userProviders = getUserConfiguredProviders(configuredProviders);
  const modelsByProvider: Record<string, string[]> = {};

  userProviders.forEach((provider) => {
    modelsByProvider[provider.id] = provider.models.map((m) => m.id);
  });

  return modelsByProvider;
};

export const getModelConfig = (
  modelKey: string,
  configuredProviders: UserConfiguredProvider[]
): ModelConfig | undefined => {
  const { modelId } = parseModelKey(modelKey);
  const userProviders = getUserConfiguredProviders(configuredProviders);

  for (const provider of userProviders) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) {
      return {
        maxTokens: model.maxTokens,
        additionalConfig: model.additionalConfig,
      };
    }
  }

  return undefined;
};

export const getProviderByModel = (
  modelKey: string,
  configuredProviders: UserConfiguredProvider[]
): UserConfiguredProvider | undefined => {
  const { modelId } = parseModelKey(modelKey);
  const userProviders = getUserConfiguredProviders(configuredProviders);

  return userProviders.find((provider) =>
    provider.models.some((model) => model.id === modelId)
  );
};

export const getFriendlyModelName = (
  modelKey: string,
  configuredProviders: UserConfiguredProvider[],
  isAuthenticated?: boolean
): string => {
  const { source, modelId } = parseModelKey(modelKey);
  
  // If source is explicitly "server", check authenticated models first
  if (source === "server" || isAuthenticated) {
    const authenticatedModels = getAuthenticatedModels();
    const authModel = authenticatedModels.find((m) => m.id === modelId);
    if (authModel && (source === "server" || !source)) {
      return authModel.displayName;
    }
  }

  // Then check configured providers
  const userProviders = getUserConfiguredProviders(configuredProviders);
  for (const provider of userProviders) {
    // If source is specified, only match that provider
    if (source && provider.id !== source) continue;
    
    const model = provider.models.find((m) => m.id === modelId);
    if (model) {
      return model.displayName;
    }
  }

  // Fallback to generated name if not found
  return generateDisplayName(modelId);
};

export const validateModelFormat = (
  modelId: string,
  providerId: string
): { isValid: boolean; message?: string } => {
  const template = getProviderTemplate(providerId);
  if (!template) {
    return { isValid: false, message: "Unknown provider" };
  }

  const hasSlash = modelId.includes("/");
  const shouldHaveSlash = template.supportedModelFormat === "provider/model";

  if (shouldHaveSlash && !hasSlash) {
    return {
      isValid: false,
      message: `${template.displayName} models should be in format: provider/model (e.g., openai/gpt-4)`,
    };
  }

  if (!shouldHaveSlash && hasSlash) {
    return {
      isValid: false,
      message: `${template.displayName} models should not include provider prefix (e.g., gpt-4o)`,
    };
  }

  return { isValid: true };
};

export const createUserConfiguredModel = (
  modelId: string,
  customDisplayName?: string,
  maxTokens = 2048,
  additionalConfig?: Record<string, any>
): UserConfiguredModel => {
  return {
    id: modelId,
    displayName: customDisplayName || generateDisplayName(modelId),
    maxTokens,
    additionalConfig,
  };
};

export const hasAnyConfiguredProvider = (
  configuredProviders: UserConfiguredProvider[]
): boolean => {
  return getUserConfiguredProviders(configuredProviders).length > 0;
};

export const getAuthenticatedModels = (): UserConfiguredModel[] => {
  const serverTemplate = getProviderTemplate("server");
  if (!serverTemplate || !serverTemplate.defaultModels) {
    return [];
  }

  return serverTemplate.defaultModels.map((modelId) => ({
    id: modelId,
    displayName: generateDisplayName(modelId),
    maxTokens: 2048,
  }));
};
