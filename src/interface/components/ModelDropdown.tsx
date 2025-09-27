import React from "react";
import { useAppState } from "../../state";
import { getUserConfiguredProviders, getAuthenticatedModels } from "../../wizardry/ai/endpoint/userConfig";
import { getModelIconId } from "../../wizardry/ai/endpoint/templates";
import { getProviderIcon, SuperWizardIcon } from "../styles/Icons";
import { useTheme } from "../styles/theme";

// CSS styles to hide scrollbars
const hiddenScrollbarStyle = `
  .hidden-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hidden-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

const ModelDropdown = ({ inMenu = false }: { inMenu?: boolean }) => {
  const { selectedModel, isAuthenticated, configuredProviders, updateSettings } = useAppState(
    (state) => ({
      selectedModel: state.settings.selectedModel,
      isAuthenticated: state.auth.isAuthenticated,
      configuredProviders: state.settings.configuredProviders,
      updateSettings: state.settings.actions.update,
    })
  );
  const { colors } = useTheme();

  const validConfiguredProviders = getUserConfiguredProviders(configuredProviders);
  const authenticatedModels = getAuthenticatedModels();
  
  // Show models if user is authenticated OR has valid providers
  const hasValidProvider = validConfiguredProviders.length > 0;
  if (!isAuthenticated && !hasValidProvider) return null;

  // Helper to create composite key: "source:modelId"
  const createModelKey = (modelId: string, source: string) => `${source}:${modelId}`;
  
  const handleModelChange = (value: string) =>
    updateSettings({ selectedModel: value });

  // Initialize a default model only once (when none is selected). Never override user choice.
  React.useEffect(() => {
    const hasNoSelection = !selectedModel || selectedModel.trim() === "";
    if (!hasNoSelection) return;

    // Default priority:
    // 1) If authenticated, first Server default model
    // 2) Else first configured provider's first model
    // 3) Else first Server default model (even if unauthenticated, for consistency of default display)
    let firstModelKey: string | null = null;
      if (isAuthenticated && authenticatedModels.length > 0) {
      firstModelKey = createModelKey(authenticatedModels[0].id, "server");
      } else if (validConfiguredProviders.length > 0 && validConfiguredProviders[0].models.length > 0) {
      firstModelKey = createModelKey(validConfiguredProviders[0].models[0].id, validConfiguredProviders[0].id);
    } else if (authenticatedModels.length > 0) {
      firstModelKey = createModelKey(authenticatedModels[0].id, "server");
    }

    if (firstModelKey) updateSettings({ selectedModel: firstModelKey });
  }, [selectedModel, updateSettings, validConfiguredProviders, authenticatedModels, isAuthenticated]);

  React.useEffect(() => {
    // Add the scrollbar hiding styles to the document
    const styleElement = document.createElement("style");
    styleElement.textContent = hiddenScrollbarStyle;
    document.head.appendChild(styleElement);

    return () => {
      // Clean up the style element when component unmounts
      document.head.removeChild(styleElement);
    };
  }, []);

  if (inMenu) {
    return (
      <div
        className="hidden-scrollbar"
        style={{
          padding: "8px",
          maxHeight: "500px",
          overflowY: "auto",
          minWidth: "220px",
        }}
      >
        {/* Show auth-available models first (only if authenticated) */}
        {isAuthenticated && (
          <>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: colors.text.tertiary,
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontFamily: "Geist, sans-serif",
              }}
            >
              Superwizard
            </div>
            {authenticatedModels.map((model) => {
          const modelKey = createModelKey(model.id, "server");
          const isSelected = selectedModel === modelKey;
          const isSuperwizardModel = model.id.startsWith("superwizard/");
          const iconId = isSuperwizardModel ? null : getModelIconId(model.id, "server");
          const IconComponent = iconId ? getProviderIcon(iconId) : null;

          return (
            <div
              key={modelKey}
              onClick={() => handleModelChange(modelKey)}
              style={{
                borderRadius: "6px",
                padding: "5px 8px",
                transition: "all 0.2s ease",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: isSelected
                  ? colors.app.hover
                  : "transparent",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateX(3px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              {isSuperwizardModel ? (
                <SuperWizardIcon
                  style={{ width: "12px", height: "12px", flexShrink: 0 }}
                />
              ) : IconComponent ? (
                <IconComponent
                  style={{ width: "12px", height: "12px", flexShrink: 0 }}
                />
              ) : null}
              <span
                style={{
                  fontWeight: 500,
                  fontSize: "12px",
                  color: colors.text.primary,
                  whiteSpace: "nowrap",
                  fontFamily: "Geist, sans-serif",
                  letterSpacing: "0.06em",
                }}
              >
                {model.displayName}
              </span>
              </div>
            );})}
          </>
        )}
        
        {/* Show configured providers after auth models */}
        {validConfiguredProviders.length > 0 && (
          <React.Fragment>
            {isAuthenticated && (
              <hr
                style={{
                  border: "none",
                  borderTop: `1px solid ${colors.border.primary}`,
                  margin: "4px 0",
                  opacity: 0.6,
                }}
              />
            )}
            {validConfiguredProviders.map((provider, index) => (
              <React.Fragment key={provider.id}>
                {index > 0 && (
                  <hr
                    style={{
                      border: "none",
                      borderTop: `1px solid ${colors.border.primary}`,
                      margin: "4px 0",
                      opacity: 0.6,
                    }}
                  />
                )}
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: colors.text.tertiary,
                    marginBottom: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: "Geist, sans-serif",
                  }}
                >
                  {provider.name}
                </div>
                {provider.models.map((model) => {
                  const modelKey = createModelKey(model.id, provider.id);
                  const isSelected = selectedModel === modelKey;
                  const iconId = getModelIconId(model.id, provider.id);
                  const IconComponent = getProviderIcon(iconId);

                  return (
                    <div
                      key={modelKey}
                      onClick={() => handleModelChange(modelKey)}
                      style={{
                        borderRadius: "6px",
                        padding: "5px 8px",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: isSelected
                          ? colors.app.hover
                          : "transparent",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateX(3px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      {IconComponent && (
                        <IconComponent
                          style={{ width: "12px", height: "12px", flexShrink: 0 }}
                        />
                      )}
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: "12px",
                          color: colors.text.primary,
                          whiteSpace: "nowrap",
                          fontFamily: "Geist, sans-serif",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {model.displayName}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </React.Fragment>
        )}
      </div>
    );
  }

  return (
    <select
      value={selectedModel || ""}
      onChange={(e) => updateSettings({ selectedModel: e.target.value })}
      className="hidden-scrollbar"
      style={{
        fontSize: "12px",
        background: colors.app.primary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: "4px",
        padding: "4px 8px",
        maxHeight: "300px",
        overflowY: "auto",
        fontFamily: "Geist, sans-serif",
        letterSpacing: "0.06em",
      }}
    >
      {/* Show auth-available models first (only if authenticated) */}
      {isAuthenticated && (
        <optgroup label="Superwizard">
          {authenticatedModels.map((model) => {
            const modelKey = createModelKey(model.id, "server");
            return (
              <option key={modelKey} value={modelKey}>
                {model.displayName}
              </option>
            );
          })}
        </optgroup>
      )}
      
      {/* Show configured providers after */}
      {validConfiguredProviders.map((provider) => (
        <optgroup key={provider.id} label={provider.name}>
          {provider.models.map((model) => {
            const modelKey = createModelKey(model.id, provider.id);
            return (
              <option key={modelKey} value={modelKey}>
                {model.displayName}
              </option>
            );
          })}
        </optgroup>
      ))}
    </select>
  );
};

export default ModelDropdown;
