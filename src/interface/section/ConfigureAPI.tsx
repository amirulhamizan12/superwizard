import React, { useState, useCallback, useMemo } from "react";
import { useAppState } from "../../state";
import { getAllProviderTemplates, getProviderTemplate } from "../../wizardry/ai/endpoint/templates";
import { UserConfiguredProvider, createUserConfiguredModel, getUserConfiguredProviders } from "../../wizardry/ai/endpoint/userConfig";
import ProviderCard from "../components/ProviderCard";
import ProviderConfigurationForm from "../components/ProviderForm";
import AddProviderMenu from "../components/ProviderMenu";
import { ArrowLeftIcon } from "../styles/Icons";
import { useTheme } from "../styles/theme";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CONSTANTS
// ============================================================================

const SHADOW = "0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px 0 rgba(0,0,0,0.06)";
const INITIAL_CONFIG: ConfigType = { apiKey: "", baseURL: "", models: [], newModel: "" };

// ============================================================================
// COMPONENT
// ============================================================================

const SetAPIKey: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { colors } = useTheme();
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
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
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ConfigType>(INITIAL_CONFIG);

  // ========================================
  // COMPUTED VALUES
  // ========================================
  
  const validProviders = useMemo(() => getUserConfiguredProviders(configuredProviders), [configuredProviders]);
  const allTemplates = useMemo(() => getAllProviderTemplates().filter(t => t.id !== 'server'), []);
  const availableToAdd = useMemo(() => 
    allTemplates.filter(t => !validProviders.some(v => v.id === t.id)), 
    [allTemplates, validProviders]
  );

  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  const resetForm = useCallback(() => {
    setShowAddProvider(false);
    setSelectedProvider(null);
    setIsEditMode(false);
    setEditingProviderId(null);
    setCurrentConfig(INITIAL_CONFIG);
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
      models: template.defaultModels?.map((id: string) => ({
        id,
        displayName: createUserConfiguredModel(id).displayName,
        maxTokens: 2048,
      })) || [],
      newModel: "",
    });
    setShowAddProvider(true);
  }, []);

  const editProvider = useCallback((providerId: string) => {
    const provider = validProviders.find((p: UserConfiguredProvider) => p.id === providerId);
    if (!provider) return;
    
    setSelectedProvider(providerId);
    setIsEditMode(true);
    setEditingProviderId(providerId);
    setCurrentConfig({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      models: provider.models.map(m => ({
        id: m.id,
        displayName: m.displayName,
        maxTokens: m.maxTokens,
        additionalConfig: m.additionalConfig,
      })),
      newModel: "",
    });
    setShowAddProvider(true);
  }, [validProviders]);

  const saveProvider = useCallback(() => {
    if (!selectedProvider || !currentConfig.apiKey.trim() || currentConfig.models.length === 0) return;
    
    const template = getProviderTemplate(selectedProvider);
    if (!template) return;
    
    const providerConfig: UserConfiguredProvider = {
      id: selectedProvider,
      name: template.displayName,
      apiKey: currentConfig.apiKey,
      baseURL: currentConfig.baseURL,
      models: currentConfig.models.map(m => 
        createUserConfiguredModel(m.id, m.displayName, m.maxTokens, m.additionalConfig)
      ),
    };
    
    addConfiguredProvider(providerConfig);
    resetForm();
  }, [selectedProvider, currentConfig, addConfiguredProvider, resetForm]);

  const beginChat = useCallback(() => {
    const allAvailableModelKeys = validProviders.flatMap(p => 
      p.models.map(m => `${p.id}:${m.id}`)
    );
    
    const isSelectedModelAvailable = selectedModel && 
      allAvailableModelKeys.includes(selectedModel);
    
    if ((!selectedModel || !isSelectedModelAvailable) && validProviders.length > 0) {
      const firstProvider = validProviders[0];
      if (firstProvider.models.length > 0) {
        updateSettings({ selectedModel: `${firstProvider.id}:${firstProvider.models[0].id}` });
      }
    }
    if (onBack) onBack();
  }, [selectedModel, validProviders, updateSettings, onBack]);

  const updateConfig = useCallback((updates: Partial<ConfigType>) => {
    setCurrentConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // ========================================
  // RENDER
  // ========================================
  
  return (
    <>
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}input:focus,input:focus-visible{outline:none!important;box-shadow:none!important;border-color:${colors.border.primary}!important}`}</style>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: colors.app.primary,
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
          {/* Header Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
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
                  color: colors.app.buttonicn,
                }}
                onClick={onBack}
              >
                <ArrowLeftIcon w="19px" h="19px" style={{ color: "inherit" }} />
              </button>
              <h2
                style={{
                  fontSize: 24,
                  lineHeight: "34px",
                  color: colors.text.primary,
                  fontFamily: "Roca One, serif",
                  fontWeight: 'normal',
                  margin: 0,
                  WebkitTextStroke: `0.25px ${colors.text.primary}`,
                  WebkitTextStrokeColor: colors.text.primary,
                  textShadow: 'none',
                  transform: "translateY(2px)",
                  letterSpacing: "0.06em",
                }}
              >
                Providers API
              </h2>
            </div>
            <p
              style={{
                color: colors.text.secondary,
                fontSize: 13,
                margin: 0,
                fontWeight: 400,
                letterSpacing: "0.06em",
                lineHeight: "1.6",
              }}
            >
              Configure your AI providers and models. Only models you add here will be available in the application.
            </p>
          </div>

          {/* Provider List */}
          {validProviders.length === 0 ? (
            <AddProviderMenu availableProviders={allTemplates} onProviderSelect={selectProvider} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {validProviders.map(provider =>
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

          {/* Add Provider Form */}
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

          {/* Add More Providers Menu */}
          {validProviders.length > 0 && availableToAdd.length > 0 && (
            <AddProviderMenu
              availableProviders={availableToAdd}
              isCompact={true}
              onProviderSelect={selectProvider}
            />
          )}

          {/* Begin Chat Button */}
          {validProviders.length > 0 && (
            <button
              type="button"
              style={{
                background: colors.brand.main,
                color: "white",
                border: "none",
                borderRadius: "20px",
                fontWeight: 500,
                fontSize: 16,
                padding: "15px 0",
                cursor: "pointer",
                width: "100%",
                boxShadow: SHADOW,
                letterSpacing: "0.06em",
                fontFamily: "Geist",
              }}
              onClick={beginChat}
              onMouseOver={e => e.currentTarget.style.background = colors.brand.hover}
              onMouseOut={e => e.currentTarget.style.background = colors.brand.main}
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
