import type { MyStateCreator } from "./index";
import { PROVIDER_TEMPLATES } from "../wizardry/ai/endpoint/templates";
import { UserConfiguredProvider, createUserConfiguredModel } from "../wizardry/ai/endpoint/userConfig";

// =============================================================================
// PROVIDER UTILITIES
// =============================================================================
const createProviderFromTemplate = (
  id: string,
  apiKey: string
): UserConfiguredProvider => {
  const template = PROVIDER_TEMPLATES[id];
  return {
    id,
    name: template.displayName,
    apiKey,
    baseURL: template.baseURL,
    models:
      template.defaultModels?.map((modelId) =>
        createUserConfiguredModel(modelId)
      ) || [],
  };
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
export type ViewMode = 'chat' | 'apiConfig' | 'userInfo';

export type SettingsSlice = {
  // Provider and AI settings
  configuredProviders: UserConfiguredProvider[];
  selectedModel: string;

  // UI state
  instructions: string | null;
  currentView: ViewMode;
  chatViewMode: "dev" | "direct";
  screenVisionEnabled: boolean;

  actions: {
    // Provider actions
    update: (values: Partial<SettingsSlice>) => void;
    updateConfiguredProviders: (providers: UserConfiguredProvider[]) => void;
    addConfiguredProvider: (provider: UserConfiguredProvider) => void;
    removeConfiguredProvider: (providerId: string) => void;
    updateApiKey: (providerId: string, apiKey: string | null) => void;

    // UI actions
    setInstructions: (instructions: string) => void;
    setCurrentView: (view: ViewMode) => void;
    setChatViewMode: (mode: "dev" | "direct") => void;
    setScreenVisionEnabled: (enabled: boolean) => void;
  };
};

// =============================================================================
// SLICE IMPLEMENTATION
// =============================================================================
export const createSettingsSlice: MyStateCreator<SettingsSlice> = (set) => ({
  // Default state
  configuredProviders: [],
  selectedModel: "Select Model",
  instructions: null,
  currentView: 'chat',
  chatViewMode: "direct",
  screenVisionEnabled: false,

  actions: {
    // Provider actions
    update: (values) =>
      set((state) => {
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && key in state.settings) {
            (state.settings as any)[key] = value;
          }
        });
      }),

    updateConfiguredProviders: (providers) =>
      set((state) => {
        state.settings.configuredProviders = providers;
      }),

    addConfiguredProvider: (provider) =>
      set((state) => {
        const providers = state.settings.configuredProviders;
        const index = providers.findIndex((p) => p.id === provider.id);
        if (index >= 0) providers[index] = provider;
        else providers.push(provider);
      }),

    removeConfiguredProvider: (providerId) =>
      set((state) => {
        state.settings.configuredProviders =
          state.settings.configuredProviders.filter((p) => p.id !== providerId);
      }),

    updateApiKey: (providerId, apiKey) =>
      set((state) => {
        const providers = state.settings.configuredProviders;
        const index = providers.findIndex((p) => p.id === providerId);

        if (apiKey && PROVIDER_TEMPLATES[providerId]) {
          const provider = createProviderFromTemplate(providerId, apiKey);
          if (index >= 0) providers[index] = provider;
          else providers.push(provider);
        } else if (index >= 0) {
          providers.splice(index, 1);
        }
      }),

    // UI actions
    setInstructions: (instructions) =>
      set((state) => {
        state.settings.instructions = instructions;
      }),
    setCurrentView: (view) =>
      set((state) => {
        state.settings.currentView = view;
      }),
    setChatViewMode: (mode) =>
      set((state) => {
        state.settings.chatViewMode = mode;
      }),
    setScreenVisionEnabled: (enabled) =>
      set((state) => {
        state.settings.screenVisionEnabled = enabled;
      }),
  },
});
