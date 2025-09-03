import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ViewIcon, ViewOffIcon, getProviderIcon } from "../styles/Icons";
import { getProviderTemplate } from "../../wizardry/ai/providers/templates";
import {
  validateModelFormat,
  createUserConfiguredModel,
} from "../../wizardry/ai/providers/userConfig";
import { colors, shadows } from "../styles/theme";

const s = {
  btn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    borderRadius: "6px",
    transition: "background 0.2s",
    letterSpacing: "0.06em",
    fontFamily: "Geist",
    fontSize: 12,
  },
  card: {
    background: colors.background.hover,
    borderRadius: "11px",
    border: `1px solid ${colors.border.primary}`,
    letterSpacing: "0.06em",
    fontFamily: "Geist",
    fontSize: 12,
  },
  input: {
    padding: 8,
    borderRadius: 8,
    border: `1px solid ${colors.border.primary}`,
    background: colors.background.primary,
    fontSize: 13,
  },
  shadow: shadows.md,
};

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

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) => (
  <div style={{ marginTop: 20 }}>
    <label
      style={{ fontSize: 13, fontWeight: 500, color: colors.text.primary }}
    >
      {label}
      {required && "*"}
    </label>
    {children}
  </div>
);

interface ProviderConfigurationFormProps {
  selectedProvider: string;
  isEditMode: boolean;
  currentConfig: ConfigType;
  onConfigUpdate: (updates: Partial<ConfigType>) => void;
  onSave: () => void;
  onCancel: () => void;
}

const ProviderConfigurationForm = React.memo(
  ({
    selectedProvider,
    isEditMode,
    currentConfig,
    onConfigUpdate,
    onSave,
    onCancel,
  }: ProviderConfigurationFormProps) => {
    const [showApiKey, setShowApiKey] = useState(false);
    const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
    const [newModelError, setNewModelError] = useState<string | null>(null);
    const shouldSaveAfterAdd = useRef(false);
    const template = getProviderTemplate(selectedProvider);

    useEffect(() => {
      if (shouldSaveAfterAdd.current) {
        shouldSaveAfterAdd.current = false;
        onSave();
      }
    }, [currentConfig.models, onSave]);

    const addModel = useCallback(
      (modelInput: string) => {
        const validation = validateModelFormat(modelInput, selectedProvider);
        if (
          !validation.isValid ||
          currentConfig.models.some((m) => m.id === modelInput)
        )
          return false;
        const newModel = createUserConfiguredModel(modelInput);
        onConfigUpdate({
          models: [
            ...currentConfig.models,
            {
              id: newModel.id,
              displayName: newModel.displayName,
              maxTokens: newModel.maxTokens,
              additionalConfig: newModel.additionalConfig,
            },
          ],
          newModel: "",
        });
        return true;
      },
      [selectedProvider, currentConfig.models, onConfigUpdate]
    );

    // Bulk adding disabled: models must be added one-at-a-time

    const handleAddModel = useCallback(() => {
      const modelInput = currentConfig.newModel.trim();
      if (!modelInput || !selectedProvider) return;
      if (/[\n,]/.test(modelInput)) {
        setNewModelError("Enter one model at a time");
        return;
      }
      addModel(modelInput);
    }, [currentConfig.newModel, selectedProvider, addModel]);

    const removeModel = useCallback(
      (modelIdToRemove: string) => {
        onConfigUpdate({
          models: currentConfig.models.filter(
            (model) => model.id !== modelIdToRemove
          ),
        });
      },
      [currentConfig.models, onConfigUpdate]
    );

    const handleKeyPress = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAddModel();
        }
      },
      [handleAddModel]
    );

    const handleSave = useCallback(() => {
      const modelInput = currentConfig.newModel.trim();
      if (modelInput && selectedProvider && addModel(modelInput)) {
        shouldSaveAfterAdd.current = true;
        return;
      }
      onSave();
    }, [currentConfig.newModel, selectedProvider, addModel, onSave]);

    const updateApiKey = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) =>
        onConfigUpdate({ apiKey: e.target.value }),
      [onConfigUpdate]
    );
    const updateBaseURL = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) =>
        onConfigUpdate({ baseURL: e.target.value }),
      [onConfigUpdate]
    );
    const updateNewModel = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onConfigUpdate({ newModel: value });
        const trimmed = value.trim();
        if (!trimmed) {
          setNewModelError(null);
          return;
        }
        // Disallow commas/newlines (single model at a time)
        if (/[\n,]/.test(trimmed)) {
          setNewModelError("Enter one model at a time");
          return;
        }
        const validation = validateModelFormat(trimmed, selectedProvider);
        if (!validation.isValid) {
          setNewModelError(validation.message || "Invalid model format");
          return;
        }
        if (currentConfig.models.some((m) => m.id === trimmed)) {
          setNewModelError("Model already added");
          return;
        }
        setNewModelError(null);
      },
      [onConfigUpdate, selectedProvider, currentConfig.models]
    );
    const toggleApiKey = useCallback(() => setShowApiKey((prev) => !prev), []);

    if (!template) return null;
    const Icon = getProviderIcon(selectedProvider);
    const isDisabled =
      !currentConfig.apiKey.trim() ||
      (currentConfig.models.length === 0 && !currentConfig.newModel.trim());

    return (
      <div style={{ ...s.card, boxShadow: s.shadow }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Icon && (
              <Icon w="15px" h="15px" style={{ color: colors.text.primary }} />
            )}
            <h2
              style={{
                fontWeight: 500,
                fontSize: 16,
                color: colors.text.primary,
                margin: 0,
              }}
            >
              {isEditMode ? "Edit" : "Configure"} {template.displayName}
            </h2>
          </div>

          <Field label="API Key" required>
            <div
              style={{ display: "flex", alignItems: "center", marginTop: 8 }}
            >
              <input
                type={showApiKey ? "text" : "password"}
                placeholder={template.apiKeyPlaceholder}
                value={currentConfig.apiKey}
                onChange={updateApiKey}
                style={{ flex: 1, ...s.input }}
                aria-required
                aria-label={`${template.displayName} API Key`}
              />
              <button
                type="button"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
                style={{
                  marginLeft: 8,
                  ...s.btn,
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: colors.background.card,
                  border: `1px solid ${colors.border.primary}`,
                }}
                onClick={toggleApiKey}
              >
                {showApiKey ? (
                  <ViewIcon w="15px" h="15px" />
                ) : (
                  <ViewOffIcon w="15px" h="15px" />
                )}
              </button>
            </div>
            {template.apiKeyUrl && (
              <div style={{ marginTop: 6 }}>
                <a
                  href={template.apiKeyUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    color: colors.text.secondary,
                    textDecoration: "underline",
                  }}
                >
                  Get API key
                </a>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <p
                style={{
                  fontSize: 11,
                  color: colors.text.secondary,
                  margin: 0,
                  lineHeight: 1.4,
                  fontStyle: "italic",
                }}
              >
                User are responsible for managing and securing their API keys
                according to the LLM provider's terms of service.
              </p>
            </div>
          </Field>

          <Field label="Base URL">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <input
                type="text"
                value={currentConfig.baseURL}
                onChange={updateBaseURL}
                style={{ width: "100%", ...s.input }}
                aria-label={`${template.displayName} Base URL`}
              />
              {currentConfig.baseURL &&
                currentConfig.baseURL !== template.baseURL && (
                  <button
                    type="button"
                    onClick={() =>
                      onConfigUpdate({ baseURL: template.baseURL })
                    }
                    style={{
                      ...s.btn,
                      padding: "6px 10px",
                      background: colors.background.card,
                      boxShadow: s.shadow,
                      border: `1px solid ${colors.border.secondary}`,
                    }}
                  >
                    Reset
                  </button>
                )}
            </div>
          </Field>

          <Field label="Models" required>
            <p
              style={{
                fontSize: 11,
                color: colors.text.placeholder,
                margin: "0 0 12px 0",
              }}
            >
              Expected format: {template.supportedModelFormat}
              {template.supportedModelFormat === "provider/model" &&
                " (e.g., openai/gpt-4.1)"}
            </p>
            {Array.isArray(template.defaultModels) &&
              template.defaultModels.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: colors.text.secondary,
                      marginBottom: 6,
                    }}
                  >
                    Popular models
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {template.defaultModels
                      .filter(
                        (m) => !currentConfig.models.some((cm) => cm.id === m)
                      )
                      .slice(0, 12)
                      .map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => addModel(m)}
                          style={{
                            ...s.btn,
                            display: "inline-flex",
                            alignItems: "center",
                            height: 26,
                            padding: "0 10px",
                            border: `1px solid ${colors.border.secondary}`,
                            background: colors.background.card,
                            borderRadius: 999,
                          }}
                        >
                          {m}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            {currentConfig.models.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <ul
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    gap: 8,
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    width: "100%",
                  }}
                >
                  {currentConfig.models.map((model, idx) => {
                    const isExpanded =
                      selectedProvider === "openrouter" &&
                      expandedModelId === model.id;
                    return (
                      <li
                        key={model.id}
                        style={{ alignSelf: "flex-start", maxWidth: "100%" }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            background: colors.stateBackground.blue,
                            borderRadius: 12,
                            padding: isExpanded ? 10 : "4px 8px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                            gap: 8,
                            maxWidth: "100%",
                            width: isExpanded ? "100%" : "auto",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              minHeight: isExpanded ? 24 : 18,
                              width: "100%",
                            }}
                          >
                            <span
                              style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "inline-block",
                                fontSize: 12,
                                fontWeight: 500,
                                color: colors.text.primary,
                              }}
                            >
                              {isExpanded
                                ? `Endpoint for ${model.displayName}`
                                : selectedProvider === "openrouter" &&
                                  model.additionalConfig?.provider?.order?.[0]
                                ? `${model.displayName} (${model.additionalConfig?.provider?.order?.[0]})`
                                : model.displayName}
                            </span>
                            <div
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              {selectedProvider === "openrouter" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedModelId((prev) =>
                                      prev === model.id ? null : model.id
                                    )
                                  }
                                  style={{
                                    marginLeft: 0,
                                    background: colors.background.hover,
                                    border: `1px solid ${colors.border.secondary}`,
                                    borderRadius: 6,
                                    padding: "1px 6px",
                                    fontSize: 10,
                                    cursor: "pointer",
                                    color: colors.text.secondary,
                                  }}
                                >
                                  {expandedModelId === model.id
                                    ? "Hide"
                                    : "Edit"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeModel(model.id)}
                                style={{
                                  marginLeft: 4,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: colors.background.scrollbarThumb,
                                  fontSize: 15,
                                  lineHeight: 1,
                                  padding: 0,
                                  width: 18,
                                  height: 18,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div style={{ marginTop: 2 }}>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 6,
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: 11,
                                    color: colors.text.placeholder,
                                    margin: "0 0 0 0",
                                  }}
                                >
                                  Choose one of the providers for{" "}
                                  {model.displayName} which you can find on the{" "}
                                  <a
                                    href={`https://openrouter.ai/${model.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: colors.text.secondary,
                                      textDecoration: "underline",
                                    }}
                                  >
                                    OpenRouter Model Page
                                  </a>
                                  .
                                </p>
                                <input
                                  type="text"
                                  placeholder="e.g., Cerebras, Groq, ..."
                                  value={
                                    Array.isArray(
                                      model.additionalConfig?.provider?.order
                                    ) &&
                                    model.additionalConfig!.provider.order
                                      .length > 0
                                      ? model.additionalConfig!.provider
                                          .order[0]
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const first =
                                      raw
                                        .split(/[\n,]/)
                                        .map((s) => s.trim())
                                        .filter(Boolean)[0] || "";
                                    const updated = [...currentConfig.models];
                                    updated[idx] = {
                                      ...model,
                                      additionalConfig: {
                                        ...model.additionalConfig,
                                        provider: {
                                          ...(model.additionalConfig
                                            ?.provider || {}),
                                          order: first ? [first] : [],
                                        },
                                      },
                                    };
                                    onConfigUpdate({ models: updated });
                                  }}
                                  style={{
                                    ...s.input,
                                    padding: "2px 8px",
                                    fontSize: 12,
                                    borderRadius: 8,
                                    borderColor: colors.border.secondary,
                                    margin: "6px 0",
                                    width: "100%",
                                    height: 32,
                                  }}
                                />
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontSize: 12,
                                    color: colors.text.primary,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(
                                      model.additionalConfig?.provider
                                        ?.allow_fallbacks
                                    )}
                                    onChange={(e) => {
                                      const allow = e.target.checked;
                                      const updated = [...currentConfig.models];
                                      updated[idx] = {
                                        ...model,
                                        additionalConfig: {
                                          ...model.additionalConfig,
                                          provider: {
                                            ...(model.additionalConfig
                                              ?.provider || {}),
                                            allow_fallbacks: allow,
                                          },
                                        },
                                      };
                                      onConfigUpdate({ models: updated });
                                    }}
                                    style={{ cursor: "pointer" }}
                                  />
                                  Allow fallbacks
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                placeholder="Type model ID and press Enter"
                value={currentConfig.newModel}
                onChange={updateNewModel}
                onKeyDown={handleKeyPress}
                style={{
                  width: "100%",
                  ...s.input,
                  borderColor: newModelError
                    ? colors.state.error
                    : colors.border.primary,
                }}
                aria-invalid={Boolean(newModelError)}
                aria-describedby={newModelError ? "model-error" : undefined}
              />
              <button
                type="button"
                onClick={handleAddModel}
                disabled={
                  Boolean(newModelError) || !currentConfig.newModel.trim()
                }
                style={{
                  ...s.btn,
                  padding: "6px 12px",
                  background: colors.primary.main,
                  color: colors.background.card,
                  boxShadow: s.shadow,
                  opacity:
                    Boolean(newModelError) || !currentConfig.newModel.trim()
                      ? 0.6
                      : 1,
                  cursor:
                    Boolean(newModelError) || !currentConfig.newModel.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Add
              </button>
            </div>
            {newModelError ? (
              <div
                id="model-error"
                style={{
                  color: colors.state.error,
                  fontSize: 11,
                  marginTop: 6,
                }}
              >
                {newModelError}
              </div>
            ) : (
              <div
                style={{
                  color: colors.text.placeholder,
                  fontSize: 11,
                  marginTop: 6,
                }}
              >
                Press Enter or click Add to append the model.
              </div>
            )}
          </Field>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 28,
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: colors.background.disabled,
                border: "none",
                color: colors.primary.main,
                fontWeight: 500,
                fontSize: 12,
                cursor: "pointer",
                padding: "6px 17px",
                borderRadius: 8,
                boxShadow: s.shadow,
                letterSpacing: "0.06em",
                fontFamily: "Geist",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isDisabled}
              style={{
                background: colors.primary.main,
                color: colors.background.card,
                border: "none",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 12,
                cursor: isDisabled ? "not-allowed" : "pointer",
                padding: "6px 17px",
                opacity: isDisabled ? 0.6 : 1,
                boxShadow: s.shadow,
                letterSpacing: "0.06em",
                fontFamily: "Geist",
              }}
            >
              {isEditMode ? "Update Provider" : "Save Provider"}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

export default ProviderConfigurationForm;
