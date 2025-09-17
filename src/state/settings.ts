import type { MyStateCreator } from "./index";
import { PROVIDER_TEMPLATES } from "../wizardry/ai/endpoint/templates";
import { UserConfiguredProvider, createUserConfiguredModel } from "../wizardry/ai/endpoint/userConfig";

// ═════════════════════════════════════════════════════════════════════════════
// § PROVIDER UTILITIES
// ═════════════════════════════════════════════════════════════════════════════
const createProviderFromTemplate = (id: string, apiKey: string): UserConfiguredProvider => {
  const template = PROVIDER_TEMPLATES[id];
  return {
    id,
    name: template.displayName,
    apiKey,
    baseURL: template.baseURL,
    models: template.defaultModels?.map((modelId) => createUserConfiguredModel(modelId)) || [],
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// § TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════
export type ViewMode = 'chat' | 'apiConfig' | 'userInfo';
export type ChatViewMode = 'basic' | 'developer';
export interface SelectedTab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
}
export type SettingsSlice = {
  configuredProviders: UserConfiguredProvider[];
  selectedModel: string;
  instructions: string | null;
  currentView: ViewMode;
  chatView: ChatViewMode;
  streamingEnabled: boolean;
  darkMode: boolean;
  selectedTab: SelectedTab | null;
  actions: {
    update: (values: Partial<SettingsSlice>) => void;
    updateConfiguredProviders: (providers: UserConfiguredProvider[]) => void;
    addConfiguredProvider: (provider: UserConfiguredProvider) => void;
    removeConfiguredProvider: (providerId: string) => void;
    updateApiKey: (providerId: string, apiKey: string | null) => void;
    setInstructions: (instructions: string) => void;
    setCurrentView: (view: ViewMode) => void;
    setChatView: (view: ChatViewMode) => void;
    setStreamingEnabled: (enabled: boolean) => void;
    setDarkMode: (enabled: boolean) => void;
    setSelectedTab: (tab: SelectedTab | null) => void;
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// § SLICE IMPLEMENTATION
// ═════════════════════════════════════════════════════════════════════════════
export const createSettingsSlice: MyStateCreator<SettingsSlice> = (set) => ({
  configuredProviders: [],
  selectedModel: "",
  instructions: null,
  currentView: 'chat',
  chatView: 'basic',
  streamingEnabled: true,
  darkMode: false,
  selectedTab: null,
  actions: {
    update: (values) => set((state) => {
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && key in state.settings) (state.settings as any)[key] = value;
      });
    }),
    updateConfiguredProviders: (providers) => set((state) => { state.settings.configuredProviders = providers; }),
    addConfiguredProvider: (provider) => set((state) => {
      const providers = state.settings.configuredProviders;
      const index = providers.findIndex((p) => p.id === provider.id);
      if (index >= 0) providers[index] = provider;
      else providers.push(provider);
    }),
    removeConfiguredProvider: (providerId) => set((state) => {
      state.settings.configuredProviders = state.settings.configuredProviders.filter((p) => p.id !== providerId);
    }),
    updateApiKey: (providerId, apiKey) => set((state) => {
      const providers = state.settings.configuredProviders;
      const index = providers.findIndex((p) => p.id === providerId);
      if (apiKey && PROVIDER_TEMPLATES[providerId]) {
        const provider = createProviderFromTemplate(providerId, apiKey);
        if (index >= 0) providers[index] = provider;
        else providers.push(provider);
      } else if (index >= 0) providers.splice(index, 1);
    }),
    setInstructions: (instructions) => set((state) => { state.settings.instructions = instructions; }),
    setCurrentView: (view) => set((state) => { state.settings.currentView = view; }),
    setChatView: (view) => set((state) => { state.settings.chatView = view; }),
    setStreamingEnabled: (enabled) => set((state) => { state.settings.streamingEnabled = enabled; }),
    setDarkMode: (enabled) => set((state) => { state.settings.darkMode = enabled; }),
    setSelectedTab: (tab) => set((state) => { state.settings.selectedTab = tab; }),
  },
});
