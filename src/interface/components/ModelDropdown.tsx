import React from "react";
import { useAppState } from "../../state";
import { getUserConfiguredProviders, getAuthenticatedModels } from "../../wizardry/ai/endpoint/userConfig";
import { getModelIconId } from "../../wizardry/ai/endpoint/templates";
import { getProviderIcon } from "../styles/Icons";
import { colors } from "../styles/theme";

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

  const validConfiguredProviders = getUserConfiguredProviders(configuredProviders);
  const authenticatedModels = getAuthenticatedModels();
  
  // Show models if user is authenticated OR has valid providers
  const hasValidProvider = validConfiguredProviders.length > 0;
  if (!isAuthenticated && !hasValidProvider) return null;

  const handleModelChange = (value: string) =>
    updateSettings({ selectedModel: value });

  // Set default model if none selected or if selected model is not available
  React.useEffect(() => {
    // Get all available models
    const allAvailableModels = [
      ...(isAuthenticated ? authenticatedModels : []),
      ...validConfiguredProviders.flatMap(provider => provider.models)
    ];
    
    // Check if current selected model is available
    const isSelectedModelAvailable = selectedModel && selectedModel !== "Select Model" && allAvailableModels.some(model => model.id === selectedModel);
    
    if (!selectedModel || selectedModel === "Select Model" || !isSelectedModelAvailable) {
      // Prefer auth models first (if authenticated), then configured providers
      if (isAuthenticated && authenticatedModels.length > 0) {
        updateSettings({ selectedModel: authenticatedModels[0].id });
      } else if (validConfiguredProviders.length > 0 && validConfiguredProviders[0].models.length > 0) {
        updateSettings({ selectedModel: validConfiguredProviders[0].models[0].id });
      }
    }
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
          const isSelected = selectedModel === model.id;

          return (
            <div
              key={model.id}
              onClick={() => handleModelChange(model.id)}
              style={{
                borderRadius: "6px",
                padding: "5px 8px",
                transition: "all 0.2s ease",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: isSelected
                  ? colors.border.primary
                  : "transparent",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateX(3px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "2px",
                  background: "linear-gradient(45deg, #4285f4, #34a853, #fbbc05, #ea4335)",
                  flexShrink: 0,
                }}
              />
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
                  const isSelected = selectedModel === model.id;
                  const iconId = getModelIconId(model.id, provider.id);
                  const IconComponent = getProviderIcon(iconId);

                  return (
                    <div
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      style={{
                        borderRadius: "6px",
                        padding: "5px 8px",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: isSelected
                          ? colors.border.primary
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
        background: colors.background.primary,
        border: `1px solid ${colors.border.secondary}`,
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
          {authenticatedModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.displayName}
            </option>
          ))}
        </optgroup>
      )}
      
      {/* Show configured providers after */}
      {validConfiguredProviders.map((provider) => (
        <optgroup key={provider.id} label={provider.name}>
          {provider.models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.displayName}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

export default ModelDropdown;
