import React, { useState } from "react";
import { EditIcon, DeleteIcon, CloseIcon, getProviderIcon } from "../styles/Icons";
import { UserConfiguredProvider } from "../../wizardry/ai/endpoint/userConfig";
import { useTheme } from "../styles/theme";

// ============================================================================
// SHARED STYLES
// ============================================================================

const baseBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  borderRadius: "8px",
  transition: "all 0.2s",
  letterSpacing: "0.06em",
  fontFamily: "Geist",
  fontSize: 12,
};

const flexCenter = {
  display: "flex",
  alignItems: "center",
};

// ============================================================================
// ACTION BUTTON COMPONENT
// ============================================================================

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
  const [hover, setHover] = useState(false);
  const { colors } = useTheme();
  
  const hoverBg = hover && variant === "delete" 
    ? colors.state.error 
    : hover && variant === "edit" 
    ? colors.border.light 
    : undefined;
  
  const textColor = hover && variant === "delete" 
    ? "white" 
    : colors.text.primary;

  return (
    <button
      type="button"
      aria-label={label}
      style={{
        ...baseBtn,
        ...flexCenter,
        minWidth: "32px",
        height: "32px",
        justifyContent: "center",
        color: textColor,
        background: hoverBg || baseBtn.background,
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Icon w="15px" h="15px" style={{ color: textColor }} />
    </button>
  );
};

// ============================================================================
// DELETE CONFIRMATION DIALOG
// ============================================================================

interface DeleteDialogProps {
  provider: UserConfiguredProvider;
  onClose: () => void;
  onConfirm: () => void;
  colors: any;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({
  provider,
  onClose,
  onConfirm,
  colors,
}) => (
  <>
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        transition: "opacity 0.3s ease, backdrop-filter 0.3s ease",
      }}
      onClick={onClose}
    />
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: colors.app.primary,
        borderRadius: "20px",
        border: `1px solid ${colors.border.primary}`,
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
          minHeight: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px 0 16px",
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
            ...baseBtn,
            ...flexCenter,
            justifyContent: "center",
            padding: 4,
          }}
          onClick={onClose}
        >
          <CloseIcon w="20px" h="20px" style={{ color: colors.text.secondary }} />
        </button>
      </header>
      <div
        style={{
          padding: "16px",
          paddingTop: 6,
          color: colors.text.primary,
          fontSize: 14,
          letterSpacing: "0.06em",
        }}
      >
        This will delete <strong style={{ letterSpacing: "0.06em" }}>{provider.name}</strong>.
        <br />
        <span
          style={{
            color: colors.text.muted,
            fontSize: 13,
            display: "block",
            marginTop: 10,
            letterSpacing: "0.06em",
          }}
        >
          This action cannot be undone. All configurations for this provider will be removed.
        </span>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button
            type="button"
            style={{
              ...baseBtn,
              background: colors.app.primary,
              color: colors.text.primary,
              border: `1px solid ${colors.border.primary}`,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 500,
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            style={{
              ...baseBtn,
              ...flexCenter,
              background: colors.state.error,
              color: "white",
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 500,
              gap: 6,
            }}
            onClick={onConfirm}
          >
            <DeleteIcon w="16px" h="16px" style={{ color: "white" }} /> Delete
          </button>
        </div>
      </div>
    </div>
  </>
);

// ============================================================================
// PROVIDER CARD COMPONENT
// ============================================================================

interface ProviderCardProps {
  provider: UserConfiguredProvider;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

const ProviderCard = React.memo(({ provider, onEdit, onRemove }: ProviderCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const Icon = getProviderIcon(provider.id);
  const { colors } = useTheme();

  const handleConfirmDelete = () => {
    setShowDeleteDialog(false);
    onRemove(provider.id);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            background: colors.app.primary,
            borderRadius: "20px",
            border: `1px solid ${colors.border.primary}`,
            width: "100%",
            letterSpacing: "0.06em",
            fontFamily: "Geist",
            fontSize: 12,
          }}
        >
          <div style={{ padding: "16px" }}>
            {/* Provider Header */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "14px" }}>
              <div
                style={{
                  ...flexCenter,
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ ...flexCenter, gap: "8px" }}>
                      {Icon && (
                        <Icon
                          w="15px"
                          h="15px"
                          style={{ color: colors.text.primary, flexShrink: 0 }}
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
                        color: colors.text.muted,
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
                {/* Action Buttons */}
                <div style={{ ...flexCenter, gap: "8px", flexShrink: 0 }}>
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
            {/* Models List */}
            {provider.models.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: colors.text.muted,
                    margin: 0,
                  }}
                >
                  Models ({provider.models.length}):
                </p>
                <ul
                  style={{
                    ...flexCenter,
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
                      Array.isArray(model.additionalConfig?.provider?.order) &&
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
                            background: colors.app.model,
                            color: colors.text.black,
                            borderRadius: "12px",
                            padding: "4px 10px",
                            display: "inline-flex",
                            alignItems: "center",
                            fontWeight: 500,
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
            )}
          </div>
        </div>
      </div>
      {showDeleteDialog && (
        <DeleteDialog
          provider={provider}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
          colors={colors}
        />
      )}
    </>
  );
});

export default ProviderCard;
