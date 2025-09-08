import React, { useState } from "react";
import {
  EditIcon,
  DeleteIcon,
  CloseIcon,
  getProviderIcon,
} from "../styles/Icons";
import { UserConfiguredProvider } from "../../wizardry/ai/endpoint/userConfig";
import { colors, shadows } from "../styles/theme";

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

// Using centralized shadow
const shadow = shadows.md;

interface ActionBtnProps {
  onClick: () => void;
  icon: React.ComponentType<any>;
  label: string;
  variant?: "edit" | "delete";
}

const ActionBtn: React.FC<ActionBtnProps> = ({
  onClick,
  icon: Icon,
  label,
  variant,
}) => {
  const [hover, setHover] = React.useState(false);
  let hoverBg = undefined;
  if (hover && variant === "delete") hoverBg = colors.state.error;
  if (hover && variant === "edit") hoverBg = colors.border.primary;
  return (
    <button
      type="button"
      aria-label={label}
      style={{
        ...btnStyle,
        minWidth: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: hover && variant === "delete" ? "white" : colors.text.dark,
        letterSpacing: "0.06em",
        fontFamily: "Geist",
        fontSize: 12,
        background: hoverBg || btnStyle.background,
        transition: "background 0.2s",
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Icon
        w="15px"
        h="15px"
        style={{ color: hover && variant === "delete" ? "white" : "inherit" }}
      />
    </button>
  );
};

interface ProviderCardProps {
  provider: UserConfiguredProvider;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

const ProviderCard = React.memo(
  ({ provider, onEdit, onRemove }: ProviderCardProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const Icon = getProviderIcon(provider.id);

    return (
      <>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              background: colors.background.hover,
              borderRadius: "8px",
              border: `1px solid ${colors.border.primary}`,
              boxShadow: shadow,
              width: "100%",
              letterSpacing: "0.06em",
              fontFamily: "Geist",
              fontSize: 12,
            }}
          >
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {Icon && (
                          <Icon
                            w="15px"
                            h="15px"
                            style={{
                              color: colors.text.primary,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <h2
                          style={{
                            fontWeight: 500,
                            fontSize: 16,
                            color: colors.text.primary,
                            margin: 0,
                            lineHeight: "1.2",
                          }}
                        >
                          {provider.name}
                        </h2>
                      </div>
                      <p
                        style={{
                          fontSize: "13px",
                          color: colors.text.placeholder,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={provider.baseURL}
                      >
                        {provider.baseURL}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexShrink: 0,
                    }}
                  >
                    <ActionBtn
                      onClick={() => onEdit(provider.id)}
                      icon={EditIcon}
                      label="Edit provider"
                      variant="edit"
                    />
                    <ActionBtn
                      onClick={() => setShowDeleteDialog(true)}
                      icon={DeleteIcon}
                      label="Remove provider"
                      variant="delete"
                    />
                  </div>
                </div>
              </div>
              {provider.models.length > 0 && (
                <>
                  <hr
                    style={{
                      margin: "20px 0",
                      border: "0",
                      borderTop: `1px solid ${colors.border.primary}`,
                      width: "100%",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: colors.text.primary,
                        margin: 0,
                      }}
                    >
                      Models ({provider.models.length}):
                    </p>
                    <ul
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        width: "100%",
                      }}
                    >
                      {provider.models.map((model) => {
                        const firstPreferred =
                          provider.id === "openrouter" &&
                          Array.isArray(
                            model.additionalConfig?.provider?.order
                          ) &&
                          model.additionalConfig?.provider?.order?.[0]
                            ? model.additionalConfig.provider.order[0]
                            : null;
                        const label = firstPreferred
                          ? `${model.displayName} (${firstPreferred})`
                          : model.displayName;
                        return (
                          <li key={model.id} style={{ display: "flex" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                background: colors.stateBackground.blue,
                                color: colors.text.primary,
                                borderRadius: "15px",
                                padding: "4px 11px",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <span
                                title={label}
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {label}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {showDeleteDialog && (
          <>
            {/* Overlay */}
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.48)",
                backdropFilter: "blur(4px)",
                zIndex: 9999,
                transition: "opacity 0.3s ease, backdrop-filter 0.3s ease",
              }}
              onClick={() => setShowDeleteDialog(false)}
            />
            {/* Dialog */}
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: colors.background.card,
                borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                zIndex: 10000,
                minWidth: 320,
                maxWidth: 400,
                width: "90%",
                padding: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <header
                style={{
                  minHeight: 56,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px 0 20px",
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: colors.text.primary,
                    margin: 0,
                    fontFamily: "Geist",
                  }}
                >
                  Delete provider?
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 6,
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => setShowDeleteDialog(false)}
                >
                  <CloseIcon
                    w="20px"
                    h="20px"
                    style={{ color: colors.text.placeholder }}
                  />
                </button>
              </header>
              <div
                style={{
                  padding: "20px",
                  paddingTop: 8,
                  color: colors.text.primary,
                  fontSize: 15,
                  letterSpacing: "0.06em",
                }}
              >
                This will delete{" "}
                <strong style={{ letterSpacing: "0.06em" }}>
                  {provider.name}
                </strong>
                .<br />
                <span
                  style={{
                    color: colors.text.placeholder,
                    fontSize: 13,
                    display: "block",
                    marginTop: 12,
                    letterSpacing: "0.06em",
                  }}
                >
                  This action cannot be undone. All configurations for this
                  provider will be removed.
                </span>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                    marginTop: 28,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: colors.border.primary,
                      color: colors.text.primary,
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 20px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "Geist",
                      letterSpacing: "0.06em",
                    }}
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{
                      background: colors.state.error,
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 20px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "Geist",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      letterSpacing: "0.06em",
                    }}
                    onClick={() => {
                      setShowDeleteDialog(false);
                      onRemove(provider.id);
                    }}
                  >
                    <DeleteIcon w="16px" h="16px" style={{ color: "white" }} />{" "}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }
);

export default ProviderCard;
