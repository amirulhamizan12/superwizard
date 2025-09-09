import React, { useState, useCallback, useMemo } from "react";
import { useAppState } from "../../state";
import { getAllProviderTemplates, getProviderTemplate } from "../../wizardry/ai/endpoint/templates";
import { UserConfiguredProvider, createUserConfiguredModel, getUserConfiguredProviders } from "../../wizardry/ai/endpoint/userConfig";
import ProviderCard from "../components/ProviderCard";
import ProviderConfigurationForm from "../components/ProviderForm";
import AddProviderMenu from "../components/AddProviderMenu";
import { ArrowLeftIcon } from "../styles/Icons";
import { colors } from "../styles/theme";

const s = `
.hide-scrollbar::-webkit-scrollbar { display: none; }
      input:focus, input:focus-visible { outline: none !important; box-shadow: none !important; border-color: ${colors.border.primary} !important; }
`;

const btnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  borderRadius: "6px",
  transition: "background 0.2s",
  letterSpacing: "0.06em",
  fontFamily: "Geist",
  fontSize: 12,
};
const shadow = "0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px 0 rgba(0,0,0,0.06)";

type ModelType = {
  id: string;
  displayName: string;
  maxTokens: number;
  additionalConfig?: Record<string, any>;
};
type ConfigType = {
  apiKey: string;
  baseURL: string;
  models: ModelType[];
  newModel: string;
};

const SetAPIKey: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const {
    configuredProviders,
    selectedModel,
    addConfiguredProvider,
    removeConfiguredProvider,
    updateSettings,
  } = useAppState((state) => ({
    configuredProviders: state.settings.configuredProviders,
    selectedModel: state.settings.selectedModel,
    addConfiguredProvider: state.settings.actions.addConfiguredProvider,
    removeConfiguredProvider: state.settings.actions.removeConfiguredProvider,
    updateSettings: state.settings.actions.update,
  }));

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(
    null
  );
  const [currentConfig, setCurrentConfig] = useState<ConfigType>({
    apiKey: "",
    baseURL: "",
    models: [],
    newModel: "",
  });

  const validProviders = useMemo(
    () => getUserConfiguredProviders(configuredProviders),
    [configuredProviders]
  );
  const allTemplates = useMemo(() => getAllProviderTemplates().filter(template => template.id !== 'server'), []);
  const availableToAdd = useMemo(
    () =>
      allTemplates.filter(
        (template) =>
          !validProviders.some((configured) => configured.id === template.id)
      ),
    [allTemplates, validProviders]
  );

  const resetForm = useCallback(() => {
    setShowAddProvider(false);
    setSelectedProvider(null);
    setIsEditMode(false);
    setEditingProviderId(null);
    setCurrentConfig({ apiKey: "", baseURL: "", models: [], newModel: "" });
  }, []);

  const selectProvider = useCallback((providerId: string) => {
    const template = getProviderTemplate(providerId);
    if (!template) return;
    setSelectedProvider(providerId);
    setIsEditMode(false);
    setEditingProviderId(null);
    setCurrentConfig({
      apiKey: "",
      baseURL: template.baseURL,
      models:
        template.defaultModels?.map((modelId: string) => ({
          id: modelId,
          displayName: createUserConfiguredModel(modelId).displayName,
          maxTokens: 2048,
        })) || [],
      newModel: "",
    });
    setShowAddProvider(true);
  }, []);

  const editProvider = useCallback(
    (providerId: string) => {
      const provider = validProviders.find(
        (p: UserConfiguredProvider) => p.id === providerId
      );
      if (!provider) return;
      setSelectedProvider(providerId);
      setIsEditMode(true);
      setEditingProviderId(providerId);
      setCurrentConfig({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL,
        models: provider.models.map(
          (model: {
            id: string;
            displayName: string;
            maxTokens: number;
            additionalConfig?: Record<string, any>;
          }) => ({
            id: model.id,
            displayName: model.displayName,
            maxTokens: model.maxTokens,
            additionalConfig: model.additionalConfig,
          })
        ),
        newModel: "",
      });
      setShowAddProvider(true);
    },
    [validProviders]
  );

  const saveProvider = useCallback(() => {
    if (
      !selectedProvider ||
      !currentConfig.apiKey.trim() ||
      currentConfig.models.length === 0
    )
      return;
    const template = getProviderTemplate(selectedProvider);
    if (!template) return;
    const providerConfig: UserConfiguredProvider = {
      id: selectedProvider,
      name: template.displayName,
      apiKey: currentConfig.apiKey,
      baseURL: currentConfig.baseURL,
      models: currentConfig.models.map((m) =>
        createUserConfiguredModel(
          m.id,
          m.displayName,
          m.maxTokens,
          m.additionalConfig
        )
      ),
    };
    addConfiguredProvider(providerConfig);
    resetForm();
  }, [selectedProvider, currentConfig, addConfiguredProvider, resetForm]);

  const beginChat = useCallback(() => {
    // Get all available models from valid providers
    const allAvailableModels = validProviders.flatMap(provider => provider.models);
    
    // Check if current selected model is available
    const isSelectedModelAvailable = selectedModel && selectedModel !== "Select Model" && allAvailableModels.some(model => model.id === selectedModel);
    
    if ((!selectedModel || selectedModel === "Select Model" || !isSelectedModelAvailable) && validProviders.length > 0) {
      const firstProvider = validProviders[0];
      if (firstProvider.models.length > 0) {
        updateSettings({ selectedModel: firstProvider.models[0].id });
      }
    }
    if (onBack) onBack();
  }, [selectedModel, validProviders, updateSettings, onBack]);

  const updateConfig = useCallback((updates: Partial<ConfigType>) => {
    setCurrentConfig((prev) => ({ ...prev, ...updates }));
  }, []);



  return (
    <>
      <style>{s}</style>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: colors.background.primary,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="hide-scrollbar"
      >
        <div
          style={{
            maxWidth: 665,
            margin: "0 auto",
            padding: "22px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 19,
            alignItems: "stretch",
            boxSizing: "border-box",
            minHeight: "100vh",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
              }}
            >
              <button
                type="button"
                aria-label="Go back"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.border.dark,
                }}
                onClick={onBack}
              >
                <ArrowLeftIcon w="19px" h="19px" style={{ color: "inherit" }} />
              </button>
              <h2
                style={{
                  fontSize: 24,
                  lineHeight: "34px",
                  color: colors.text.accent,
                  fontFamily: "Roca One, serif",
                  fontWeight: 400,
                  margin: 0,
                  WebkitTextStroke: `0.75px ${colors.text.accent}`,
                  WebkitTextStrokeColor: colors.text.accent,
                  textShadow: `0.5px 0.5px 0 ${colors.text.accent}`,
                  transform: "translateY(2px)",
                  letterSpacing: "0.06em",
                }}
              >
                Providers
              </h2>
            </div>
            <p
              style={{
                color: colors.text.placeholder,
                fontSize: 13,
                margin: 0,
                fontWeight: 400,
                letterSpacing: "0.06em",
                lineHeight: "1.6",
              }}
            >
              Configure your AI providers and models. Only models you add here
              will be available in the application.
            </p>
          </div>

          {validProviders.length === 0 ? (
            <AddProviderMenu
              availableProviders={allTemplates}
              onProviderSelect={selectProvider}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {validProviders.map((provider) =>
                isEditMode && editingProviderId === provider.id ? (
                  <ProviderConfigurationForm
                    key={provider.id}
                    selectedProvider={selectedProvider!}
                    isEditMode={isEditMode}
                    currentConfig={currentConfig}
                    onConfigUpdate={updateConfig}
                    onSave={saveProvider}
                    onCancel={resetForm}
                  />
                ) : (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    onEdit={editProvider}
                    onRemove={removeConfiguredProvider}
                  />
                )
              )}
            </div>
          )}

          {showAddProvider && !isEditMode && selectedProvider && (
            <ProviderConfigurationForm
              selectedProvider={selectedProvider}
              isEditMode={isEditMode}
              currentConfig={currentConfig}
              onConfigUpdate={updateConfig}
              onSave={saveProvider}
              onCancel={resetForm}
            />
          )}

          {validProviders.length > 0 && availableToAdd.length > 0 && (
            <AddProviderMenu
              availableProviders={availableToAdd}
              isCompact={true}
              onProviderSelect={selectProvider}
            />
          )}

          {validProviders.length > 0 && (
            <button
              type="button"
              style={{
                background: colors.primary.main,
                color: "white",
                border: "none",
                borderRadius: 11,
                fontWeight: 500,
                fontSize: 16,
                padding: "15px 0",
                cursor: "pointer",
                width: "100%",
                boxShadow: shadow,
                letterSpacing: "0.06em",
                fontFamily: "Geist",
              }}
              onClick={beginChat}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = colors.primary.hover)
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = colors.primary.main)
              }
            >
              Begin Chat
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SetAPIKey;
