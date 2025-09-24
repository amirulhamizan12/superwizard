import React from "react";
import { GoogleIcon } from "../styles/Icons";
import { useTheme } from "../styles/theme";
import { useAppState } from "../../state";

const Onboarding = () => {
  const { colors } = useTheme();
  const { 
    isAuthenticated, 
    user, 
    isLoading,
    actions: { loadAuthFromStorage, startAuthListener, stopAuthListener }
  } = useAppState((state) => state.auth);

  const { setCurrentView } = useAppState((state) => ({
    setCurrentView: state.settings.actions.setCurrentView,
  }));

  // Function to handle Google sign in navigation
  const handleGoogleSignIn = () => {
    // Open the login page in a new tab
    window.open('https://www.superwizard.ai/auth/login', '_blank');
  };

  const handleShowApiConfig = () => {
    setCurrentView('apiConfig');
  };



  // Show loading state
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colors.app.primary,
          fontFamily: "Geist",
          color: colors.text.secondary,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", marginBottom: "8px", color: colors.text.primary }}>Loading...</div>
          <div style={{ fontSize: "14px", color: colors.text.disabled }}>
            Checking authentication status
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show user info
  if (isAuthenticated && user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          background: colors.app.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Geist",
          color: colors.text.secondary,
        }}
      >
        <div
          style={{
            width: "400px",
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "30px",
              alignItems: "center",
              textAlign: "center",
              width: "100%",
            }}
          >
            <img
              src={require("../../assets/img/Superwizard.svg")}
              alt="Superwizard"
              style={{ height: "37px" }}
            />
            
            {/* User Info Section */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                width: "100%",
                alignItems: "center",
              }}
            >

              {/* Welcome Message */}
              <div>
                <h2
                  style={{
                    color: colors.text.primary,
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: "0 0 8px 0",
                  }}
                >
                  Welcome back!
                </h2>
                <p
                  style={{
                    color: colors.text.secondary,
                    fontSize: "16px",
                    margin: "0",
                  }}
                >
                  {user.full_name ? user.full_name : user.email}
                </p>
                {user.full_name && (
                  <p
                    style={{
                      color: colors.text.disabled,
                      fontSize: "14px",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {user.email}
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show the original onboarding
  const baseBtn = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    maxWidth: "305px",
    height: "40px",
    padding: "0 16px",
    fontSize: "16px",
    fontWeight: "500",
    borderRadius: "20px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: colors.app.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Geist",
        color: colors.text.secondary,
      }}
    >
      <div
        style={{
          width: "305px",
          height: "404.69px",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "30px",
            alignItems: "center",
            textAlign: "center",
            width: "100%",
          }}
        >
          <img
            src={require("../../assets/img/Superwizard.svg")}
            alt="Superwizard"
            style={{ height: "37px" }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              width: "100%",
              alignItems: "center",
            }}
          >
            <p
              style={{
                color: colors.text.secondary,
                fontSize: "17px",
                fontWeight: "400",
                margin: "0",
                fontFamily: "Geist",
                letterSpacing: "0.04em",
                lineHeight: "26px",
                maxWidth: "305px",
              }}
            >
              Sign in or configure your API key <br />
              to get started.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                style={{
                  ...baseBtn,
                  border: `1px solid ${colors.border.primary}`,
                  background: colors.app.primary,
                  color: colors.text.secondary,
                }}
                onClick={handleGoogleSignIn}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = colors.app.hover)
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = colors.app.primary)
                }
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GoogleIcon w="16px" h="16px" />
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    letterSpacing: "0.06em",
                    fontWeight: "500",
                  }}
                >
                  Continue with Google
                </span>
              </button>
              <div style={{ width: "305px", padding: "12px 0" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <hr
                    style={{
                      flex: "1",
                      height: "1px",
                      background: colors.border.primary,
                      border: "none",
                    }}
                  />
                  <p
                    style={{
                      color: colors.text.disabled,
                      fontSize: "13px",
                      fontWeight: "500",
                      padding: "0 12px",
                      margin: "0",
                      letterSpacing: "0.04em",
                    }}
                  >
                    OR
                  </p>
                  <hr
                    style={{
                      flex: "1",
                      height: "1px",
                      background: colors.border.primary,
                      border: "none",
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                style={{
                  ...baseBtn,
                  border: `1px solid ${colors.brand.main}`,
                  background: colors.brand.main,
                  color: colors.text.white,
                }}
                onClick={handleShowApiConfig}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = colors.brand.hover)
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = colors.brand.main)
                }
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    letterSpacing: "0.06em",
                    fontWeight: "500",
                  }}
                >
                  Set API Key
                </span>
              </button>
            </div>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: colors.text.disabled,
              textAlign: "center",
              maxWidth: "460px",
              margin: "0",
              fontFamily: "Geist",
              letterSpacing: "0.04em",
              lineHeight: "1.7",
            }}
          >
            By continuing, you acknowledge Superwizard's{" "}
            <a
              style={{
                color: colors.brand.main,
                textDecoration: "underline",
                fontWeight: "500",
                letterSpacing: "0.04em",
              }}
              href="https://www.superwizard.ai//privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              style={{
                color: colors.brand.main,
                textDecoration: "underline",
                fontWeight: "500",
                letterSpacing: "0.04em",
              }}
              href="https://www.superwizard.ai//terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
