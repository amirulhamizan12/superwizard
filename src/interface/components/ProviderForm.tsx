import React, { useState, useCallback, ReactNode, useMemo } from "react";
import { ViewIcon, ViewOffIcon, getProviderIcon } from "../styles/Icons";
import { getProviderTemplate, getModelIconId } from "../../wizardry/ai/endpoint/templates";
import { validateModelFormat, createUserConfiguredModel } from "../../wizardry/ai/endpoint/userConfig";
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

interface ModelSettingsModalProps {
  model: ModelType;
  onSave: (updates: any) => void;
  onClose: () => void;
}

interface ModelCardProps {
  model: ModelType;
  provider: string;
  onRemove: () => void;
  onEdit?: () => void;
  compact?: boolean;
}

interface AddedModelsViewProps {
  models: ModelType[];
  provider: string;
  onRemoveModel: (modelId: string) => void;
  onUpdateModel: (modelId: string, updates: ModelType) => void;
  onAddModel: (modelId: string) => void;
}

interface ModelConfigurationTabsProps {
  models: ModelType[];
  popularModels: string[];
  provider: string;
  onModelsChange: (models: ModelType[]) => void;
}

interface ProviderConfigurationFormProps {
  selectedProvider: string;
  isEditMode: boolean;
  currentConfig: ConfigType;
  onConfigUpdate: (updates: Partial<ConfigType>) => void;
  onSave: () => void;
  onCancel: () => void;
}

// ============================================================================
// SHARED STYLES HOOK
// ============================================================================

const useCommonStyles = () => {
  const { colors, shadows } = useTheme();
  
  return useMemo(() => ({
    btn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      borderRadius: 8,
      transition: "background 0.2s",
      letterSpacing: "0.06em",
      fontFamily: "Geist",
      fontSize: 12,
    },
    card: {
      background: colors.app.primary,
      borderRadius: 20,
      border: `1px solid ${colors.border.primary}`,
      letterSpacing: "0.06em",
      fontFamily: "Geist",
      fontSize: 12,
    },
    input: {
      padding: 10,
      borderRadius: 8,
      border: `1px solid ${colors.border.primary}`,
      background: colors.app.primary,
      color: colors.text.primary,
      fontSize: 13,
      fontFamily: "Geist",
      letterSpacing: "0.06em",
      height: 26,
    },
    modalOverlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20,
    },
    modalContent: {
      background: colors.app.primary,
      borderRadius: 20,
      padding: 16,
      maxWidth: 500,
      width: "100%",
      boxShadow: shadows.xl,
      border: `1px solid ${colors.border.primary}`,
    },
  }), [colors, shadows]);
};

// ============================================================================
// MODEL SETTINGS MODAL
// ============================================================================

const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({ model, onSave, onClose }) => {
  const { colors } = useTheme();
  const styles = useCommonStyles();
  const [preferredProvider, setPreferredProvider] = useState(
    model.additionalConfig?.provider?.order?.[0] || ""
  );
  const [allowFallbacks, setAllowFallbacks] = useState(
    Boolean(model.additionalConfig?.provider?.allow_fallbacks)
  );

  const handleSave = () => {
    onSave({
      ...model,
      additionalConfig: {
        ...model.additionalConfig,
        provider: {
          ...(model.additionalConfig?.provider || {}),
          order: preferredProvider ? [preferredProvider] : [],
          allow_fallbacks: allowFallbacks,
        },
      },
    });
    onClose();
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: colors.text.primary, marginBottom: 4 }}>
          Model Settings
        </h3>
        <p style={{ margin: 0, fontSize: 12, color: colors.text.muted, marginBottom: 20, fontFamily: "monospace" }}>
          {model.id}
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Preferred Provider
          </label>
          <input
            type="text"
            placeholder="e.g., Cerebras, Groq, Together AI..."
            value={preferredProvider}
            onChange={(e) => {
              const first = e.target.value.split(/[\n,]/).map(s => s.trim()).filter(Boolean)[0] || "";
              setPreferredProvider(first);
            }}
            style={{ width: "100%", ...styles.input, height: 30 }}
          />
          <p style={{ fontSize: 11, color: colors.text.muted, margin: "6px 0 0 0", lineHeight: 1.4 }}>
            Specify which provider OpenRouter should prefer for this model.{" "}
            <a href={`https://openrouter.ai/${model.id}`} target="_blank" rel="noreferrer" style={{ color: colors.brand.main, textDecoration: "none" }}>
              View available providers
            </a>
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: colors.text.primary, cursor: "pointer", padding: "0 12px", borderRadius: 8, transition: "background 0.15s ease", background: colors.app.tertiary, height: 30 }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.app.hover}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.app.tertiary}
          >
            <input type="checkbox" checked={allowFallbacks} onChange={(e) => setAllowFallbacks(e.target.checked)} style={{ cursor: "pointer", width: 18, height: 18 }} />
            <span style={{ fontWeight: 500 }}>Allow fallback to other providers</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ background: colors.app.primary, border: `1px solid ${colors.border.primary}`, color: colors.text.primary, fontWeight: 500, fontSize: 13, cursor: "pointer", padding: "8px 16px", borderRadius: 8, letterSpacing: "0.06em", fontFamily: "Geist", transition: "background 0.15s ease" }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.app.hover}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.app.primary}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} style={{ background: colors.brand.main, color: colors.text.white, border: "none", borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: "pointer", padding: "8px 16px", letterSpacing: "0.06em", fontFamily: "Geist", transition: "background 0.15s ease" }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.brand.hover}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.brand.main}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODEL CARD
// ============================================================================

const ModelCard: React.FC<ModelCardProps> = ({ model, provider, onRemove, onEdit, compact = false }) => {
  const { colors } = useTheme();
  const iconId = getModelIconId(model.id, provider);
  const ProviderIcon = iconId ? getProviderIcon(iconId) : null;
  const preferredProvider = model.additionalConfig?.provider?.order?.[0] || null;

  if (compact) {
    return (
      <div style={{ background: colors.app.model, borderRadius: 18, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: colors.text.black, border: `1px solid ${colors.border.light}` }}>
        {ProviderIcon && <ProviderIcon w="12px" h="12px" style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model.displayName}</span>
        <button type="button" onClick={onRemove} style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.text.secondary, fontSize: 16, lineHeight: 1, padding: 0, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }} title="Remove model">×</button>
      </div>
    );
  }

  return (
    <div style={{ background: colors.app.primary, border: `1px solid ${colors.border.primary}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12, transition: "all 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {ProviderIcon && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.app.tertiary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ProviderIcon w="18px" h="18px" style={{ color: colors.text.primary }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: colors.text.primary, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model.displayName}</h4>
          <div style={{ fontSize: 11, color: colors.text.secondary, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model.id}</div>
          {preferredProvider && (
            <div style={{ marginTop: 6, fontSize: 11, color: colors.text.muted, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ background: colors.app.tertiary, padding: "2px 8px", borderRadius: 6, fontWeight: 500 }}>{preferredProvider}</span>
              {model.additionalConfig?.provider?.allow_fallbacks && <span style={{ fontSize: 10 }}>+ fallbacks</span>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {onEdit && (
            <button type="button" onClick={onEdit} style={{ background: colors.app.primary, border: `1px solid ${colors.border.primary}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 500, cursor: "pointer", color: colors.text.primary, transition: "background 0.15s ease" }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.app.hover}
              onMouseLeave={(e) => e.currentTarget.style.background = colors.app.primary}>
              Settings
            </button>
          )}
          <button type="button" onClick={onRemove} style={{ background: "transparent", border: `1px solid ${colors.border.primary}`, borderRadius: 6, cursor: "pointer", color: colors.text.secondary, fontSize: 14, lineHeight: 1, padding: "4px 8px", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }} title="Remove model"
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.state.error; e.currentTarget.style.color = colors.text.white; e.currentTarget.style.borderColor = colors.state.error; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = colors.text.secondary; e.currentTarget.style.borderColor = colors.border.primary; }}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ADDED MODELS VIEW
// ============================================================================

const AddedModelsView: React.FC<AddedModelsViewProps> = ({ models, provider, onRemoveModel, onUpdateModel, onAddModel }) => {
  const { colors } = useTheme();
  const styles = useCommonStyles();
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [customModelValue, setCustomModelValue] = useState("");
  const [customModelError, setCustomModelError] = useState<string | null>(null);

  const editingModel = models.find(m => m.id === editingModelId);

  const handleCustomModelChange = useCallback((value: string) => {
    setCustomModelValue(value);
    const trimmed = value.trim();

    if (!trimmed) {
      setCustomModelError(null);
      return;
    }

    if (/[\n,]/.test(trimmed)) {
      setCustomModelError("Enter one model at a time");
      return;
    }

    const validation = validateModelFormat(trimmed, provider);
    if (!validation.isValid) {
      setCustomModelError(validation.message || "Invalid model format");
      return;
    }

    if (models.some(m => m.id === trimmed)) {
      setCustomModelError("Model already added");
      return;
    }

    setCustomModelError(null);
  }, [models, provider]);

  const handleCustomModelAdd = useCallback(() => {
    const trimmed = customModelValue.trim();
    if (!trimmed || customModelError) return;
    onAddModel(trimmed);
    setCustomModelValue("");
    setCustomModelError(null);
  }, [customModelValue, customModelError, onAddModel]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomModelAdd();
    }
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: colors.text.primary, marginBottom: 4 }}>Added Models</h3>
            <p style={{ margin: 0, fontSize: 12, color: colors.text.muted }}>{models.length} {models.length === 1 ? "model" : "models"} configured</p>
          </div>
        </div>

        <div style={{ padding: 16, background: colors.app.tertiary, borderRadius: 12, border: `1px solid ${colors.border.light}` }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: colors.text.secondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Add Custom Model</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <input type="text" placeholder="Enter model ID (e.g., gpt-4-turbo)" value={customModelValue} onChange={(e) => handleCustomModelChange(e.target.value)} onKeyDown={handleKeyPress}
                style={{ width: "100%", ...styles.input, border: `${customModelError ? 2 : 1}px solid ${customModelError ? colors.state.error : colors.border.primary}` }}
                aria-invalid={Boolean(customModelError)} aria-describedby={customModelError ? "custom-model-error" : undefined} />
            </div>
            <button type="button" onClick={handleCustomModelAdd} disabled={Boolean(customModelError) || !customModelValue.trim()}
              style={{ padding: "0 10px", borderRadius: 8, border: "none", background: colors.brand.main, color: colors.text.white, fontSize: 13, fontWeight: 500, cursor: Boolean(customModelError) || !customModelValue.trim() ? "not-allowed" : "pointer", opacity: Boolean(customModelError) || !customModelValue.trim() ? 0.5 : 1, transition: "all 0.15s ease", whiteSpace: "nowrap", height: 26 }}
              onMouseEnter={(e) => { if (!Boolean(customModelError) && customModelValue.trim()) e.currentTarget.style.background = colors.brand.hover; }}
              onMouseLeave={(e) => e.currentTarget.style.background = colors.brand.main}>
              Add
            </button>
          </div>
          {customModelError ? (
            <div id="custom-model-error" style={{ color: colors.state.error, fontSize: 12, marginTop: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠</span><span>{customModelError}</span>
            </div>
          ) : (
            <div style={{ color: colors.text.muted, fontSize: 11, marginTop: 8 }}>Press Enter or click "Add Model"</div>
          )}
        </div>

        {models.length === 0 ? (
          <div style={{ padding: "48px 24px", background: colors.app.tertiary, borderRadius: 12, border: `2px dashed ${colors.border.light}`, textAlign: "center" }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.text.primary, marginBottom: 6 }}>No models added yet</h4>
            <p style={{ margin: 0, fontSize: 13, color: colors.text.muted, maxWidth: 320, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>Use the "Add Custom Model" section above to add your first model</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {models.map(model => (
              <ModelCard key={model.id} model={model} provider={provider} onRemove={() => onRemoveModel(model.id)}
                onEdit={provider === "openrouter" ? () => setEditingModelId(model.id) : undefined} />
            ))}
          </div>
        )}

        {models.length > 0 && (
          <div style={{ padding: "12px 16px", background: colors.app.tertiary, borderRadius: 8, border: `1px solid ${colors.border.light}`, display: "flex", gap: 24, fontSize: 12, color: colors.text.secondary }}>
            <div><span style={{ fontWeight: 600 }}>Total:</span> {models.length}</div>
          </div>
        )}
      </div>

      {editingModel && (
        <ModelSettingsModal model={editingModel} onSave={(updates) => onUpdateModel(editingModel.id, updates)} onClose={() => setEditingModelId(null)} />
      )}
    </>
  );
};

// ============================================================================
// MODEL CONFIGURATION TABS
// ============================================================================

const ModelConfigurationTabs: React.FC<ModelConfigurationTabsProps> = ({ models, popularModels, provider, onModelsChange }) => {
  const handleAddModel = useCallback((modelId: string) => {
    const validation = validateModelFormat(modelId, provider);
    if (!validation.isValid || models.some(m => m.id === modelId)) return false;

    const newModel = createUserConfiguredModel(modelId);
    onModelsChange([...models, { id: newModel.id, displayName: newModel.displayName, maxTokens: newModel.maxTokens, additionalConfig: newModel.additionalConfig }]);
    return true;
  }, [models, provider, onModelsChange]);

  const handleRemoveModel = useCallback((modelId: string) => {
    onModelsChange(models.filter(m => m.id !== modelId));
  }, [models, onModelsChange]);

  const handleUpdateModel = useCallback((modelId: string, updates: ModelType) => {
    onModelsChange(models.map(m => m.id === modelId ? updates : m));
  }, [models, onModelsChange]);

  return <AddedModelsView models={models} provider={provider} onRemoveModel={handleRemoveModel} onUpdateModel={handleUpdateModel} onAddModel={handleAddModel} />;
};

// ============================================================================
// FIELD COMPONENT
// ============================================================================

const Field = ({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) => {
  const { colors } = useTheme();
  return (
    <div style={{ marginTop: 20 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: colors.text.primary, marginBottom: 8, display: "block" }}>
        {label}{required && "*"}
      </label>
      {children}
    </div>
  );
};

// ============================================================================
// PROVIDER CONFIGURATION FORM
// ============================================================================

const ProviderConfigurationForm = React.memo(({ selectedProvider, isEditMode, currentConfig, onConfigUpdate, onSave, onCancel }: ProviderConfigurationFormProps) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const template = getProviderTemplate(selectedProvider);
  const { colors } = useTheme();
  const styles = useCommonStyles();

  const updateApiKey = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onConfigUpdate({ apiKey: e.target.value }), [onConfigUpdate]);
  const updateBaseURL = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onConfigUpdate({ baseURL: e.target.value }), [onConfigUpdate]);
  const toggleApiKey = useCallback(() => setShowApiKey(prev => !prev), []);
  const handleModelsChange = useCallback((newModels: ModelType[]) => onConfigUpdate({ models: newModels }), [onConfigUpdate]);

  if (!template) return null;
  
  const Icon = getProviderIcon(selectedProvider);
  const isDisabled = !currentConfig.apiKey.trim() || currentConfig.models.length === 0;

  return (
    <div style={styles.card}>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {Icon && <Icon w="15px" h="15px" style={{ color: colors.text.primary }} />}
          <h2 style={{ fontWeight: 500, fontSize: 16, color: colors.text.primary, margin: 0 }}>
            {isEditMode ? "Edit" : "Configure"} {template.displayName}
          </h2>
        </div>

        <Field label="API Key" required>
          <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
            <input type={showApiKey ? "text" : "password"} placeholder={template.apiKeyPlaceholder} value={currentConfig.apiKey} onChange={updateApiKey}
              style={{ flex: 1, ...styles.input }} aria-required aria-label={`${template.displayName} API Key`} />
            <button type="button" aria-label={showApiKey ? "Hide API key" : "Show API key"}
              style={{ marginLeft: 6, ...styles.btn, width: 28, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: colors.app.primary, border: `1px solid ${colors.border.primary}` }}
              onClick={toggleApiKey}>
              {showApiKey ? <ViewIcon w="15px" h="15px" style={{ color: colors.text.primary }} /> : <ViewOffIcon w="15px" h="15px" style={{ color: colors.text.primary }} />}
            </button>
          </div>
          {template.apiKeyUrl && (
            <div style={{ marginTop: 6 }}>
              <a href={template.apiKeyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: colors.text.secondary, textDecoration: "underline" }}>Get API key</a>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 12, color: colors.text.muted, margin: 0, lineHeight: 1.4, fontStyle: "italic" }}>
              User are responsible for managing and securing their API keys according to the LLM provider's terms of service.
            </p>
          </div>
        </Field>

        <Field label="Base URL">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <input type="text" value={currentConfig.baseURL} onChange={updateBaseURL} style={{ width: "100%", ...styles.input }} aria-label={`${template.displayName} Base URL`} />
            {currentConfig.baseURL && currentConfig.baseURL !== template.baseURL && (
              <button type="button" onClick={() => onConfigUpdate({ baseURL: template.baseURL })}
                style={{ ...styles.btn, padding: "4px 8px", background: colors.app.primary, border: `1px solid ${colors.border.primary}` }}>
                Reset
              </button>
            )}
          </div>
        </Field>

        <ModelConfigurationTabs models={currentConfig.models} popularModels={template.defaultModels || []} provider={selectedProvider} onModelsChange={handleModelsChange} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="button" onClick={onCancel} style={{ background: colors.app.primary, border: `1px solid ${colors.border.primary}`, color: colors.text.primary, fontWeight: 500, fontSize: 13, cursor: "pointer", padding: "6px 16px", borderRadius: 8, letterSpacing: "0.06em", fontFamily: "Geist" }}>
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={isDisabled}
            onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.background = colors.brand.hover; }}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.brand.main}
            style={{ background: colors.brand.main, color: colors.text.white, border: "none", borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: isDisabled ? "not-allowed" : "pointer", padding: "6px 16px", opacity: isDisabled ? 0.6 : 1, letterSpacing: "0.06em", fontFamily: "Geist" }}>
            {isEditMode ? "Update Provider" : "Save Provider"}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ProviderConfigurationForm;