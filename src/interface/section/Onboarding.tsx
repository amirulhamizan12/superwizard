import React from "react";
import SetAPIKey from "./ConfigureAPI";
import { GoogleIcon } from "../styles/Icons";
import { colors } from "../styles/theme";
import { useAppState } from "../../state";

const Onboarding = () => {
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
    window.open('https://lockheed-web.vercel.app/auth/login', '_blank');
  };

  const handleShowApiConfig = () => {
    setCurrentView('apiConfig');
  };

  const handleOpenDashboard = () => {
    window.open('https://lockheed-web.vercel.app/dashboard', '_blank');
  };

  const handleSignOut = () => {
    window.open('https://lockheed-web.vercel.app/auth/logout', '_blank');
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
          background: colors.background.primary,
          fontFamily: "Geist",
          color: colors.text.secondary,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", marginBottom: "8px" }}>Loading...</div>
          <div style={{ fontSize: "14px", color: colors.text.disabled }}>
            Checking authentication status
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show user info and dashboard options
  if (isAuthenticated && user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          background: colors.background.primary,
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
              {/* Avatar */}
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  position: "relative",
                  overflow: "hidden",
                  border: `3px solid ${colors.border.secondary}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: user.avatar_url ? "transparent" : colors.primary.main,
                }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.style.background = colors.primary.main;
                        parent.innerHTML = (user.full_name || user.email || 'U').charAt(0).toUpperCase();
                        parent.style.fontSize = "28px";
                        parent.style.fontWeight = "600";
                        parent.style.color = "white";
                      }
                    }}
                  />
                ) : (
                  <span style={{
                    fontSize: "28px",
                    fontWeight: "600",
                    color: "white"
                  }}>
                    {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

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

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  style={{
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
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: `1px solid ${colors.primary.main}`,
                    background: colors.primary.main,
                    color: "white",
                  }}
                  onClick={handleOpenDashboard}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = colors.primary.hover)
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = colors.primary.main)
                  }
                >
                  Open Web Dashboard
                </button>

                <button
                  type="button"
                  style={{
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
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: `1px solid ${colors.border.primary}`,
                    background: "transparent",
                    color: colors.text.secondary,
                  }}
                  onClick={handleSignOut}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = colors.background.secondary)
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Sign Out
                </button>
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
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: colors.background.primary,
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
                  border: `1px solid ${colors.border.secondary}`,
                  background: "#f6f6f6",
                  color: colors.text.secondary,
                }}
                onClick={handleGoogleSignIn}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#efefef")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#f6f6f6")
                }
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GoogleIcon boxSize="16px" />
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
                      background: colors.border.secondary,
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
                      background: colors.border.secondary,
                      border: "none",
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                style={{
                  ...baseBtn,
                  border: `1px solid ${colors.primary.main}`,
                  background: colors.primary.main,
                  color: "white",
                }}
                onClick={handleShowApiConfig}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = colors.primary.hover)
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = colors.primary.main)
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
            Superwizard is an open source project.{" "}
            <a
              style={{
                color: colors.primary.main,
                textDecoration: "underline",
                fontWeight: "500",
                letterSpacing: "0.04em",
              }}
              href="#"
            >
              View on GitHub
            </a>{" "}
            or{" "}
            <a
              style={{
                color: colors.primary.main,
                textDecoration: "underline",
                fontWeight: "500",
                letterSpacing: "0.04em",
              }}
              href="#"
            >
              Contribute
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
