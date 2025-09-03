import React, { useState } from 'react';
import { colors } from '../styles/theme';
import { ArrowLeftIcon } from '../styles/Icons';
import { useAppState } from '../../state';

interface UserInfoProps {
  onBack: () => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ onBack }) => {
  const { user, isAuthenticated } = useAppState((state) => state.auth);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleOpenDashboard = () => {
    window.open('http://localhost:3000/dashboard', '_blank');
  };

  const handleSignOut = () => {
    setIsSigningOut(true);
    
    // Open the web app logout page which will handle the sign out
    // and automatically notify the extension
    window.open('http://localhost:3000/auth/logout', '_blank');
    
    // Reset loading state after a short delay
    setTimeout(() => {
      setIsSigningOut(false);
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // If not authenticated, show a message
  if (!isAuthenticated || !user) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: colors.background.primary,
        fontFamily: 'Geist',
        color: colors.text.secondary,
        padding: '22px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div>
          <p style={{ marginBottom: '16px' }}>Not authenticated</p>
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              background: colors.primary.main,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: colors.background.primary,
      fontFamily: 'Geist',
      color: colors.text.secondary,
      padding: '22px 16px',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
        {/* Back Button */}
        <div style={{
          marginBottom: '16px'
        }}>
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
        </div>
        
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          {/* Avatar */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            margin: '0 auto 16px',
            position: 'relative',
            overflow: 'hidden',
            border: `3px solid ${colors.border.secondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: user.avatar_url ? 'transparent' : colors.primary.main,
          }}>
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.style.background = colors.primary.main;
                    parent.innerHTML = (user.full_name || user.email || 'U').charAt(0).toUpperCase();
                    parent.style.fontSize = '28px';
                    parent.style.fontWeight = '600';
                    parent.style.color = 'white';
                  }
                }}
              />
            ) : (
              <span style={{
                fontSize: '28px',
                fontWeight: '600',
                color: 'white'
              }}>
                {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* User Details */}
        <div style={{
          marginBottom: '24px'
        }}>
          {/* Display Name */}
          <div style={{
            padding: '16px 0',
            borderBottom: `1px solid ${colors.border.primary}`
          }}>
            <div style={{ color: colors.text.disabled, fontSize: '12px', marginBottom: '4px' }}>
              Display Name
            </div>
            <div style={{ color: colors.text.primary, fontWeight: '500', fontSize: '14px' }}>
              {user.full_name || 'No name provided'}
            </div>
          </div>

          {/* Email */}
          <div style={{
            padding: '16px 0',
            borderBottom: `1px solid ${colors.border.primary}`
          }}>
            <div style={{ color: colors.text.disabled, fontSize: '12px', marginBottom: '4px' }}>
              Email
            </div>
            <div style={{ color: colors.text.primary, fontWeight: '500', fontSize: '14px' }}>
              {user.email}
            </div>
          </div>

          {/* Account Created */}
          <div style={{
            padding: '16px 0',
            borderBottom: `1px solid ${colors.border.primary}`
          }}>
            <div style={{ color: colors.text.disabled, fontSize: '12px', marginBottom: '4px' }}>
              Member Since
            </div>
            <div style={{ color: colors.text.primary, fontWeight: '500', fontSize: '14px' }}>
              {formatDate(user.created_at)}
            </div>
          </div>

          {/* Last Sign In */}
          <div style={{
            padding: '16px 0',
            borderBottom: `1px solid ${colors.border.primary}`
          }}>
            <div style={{ color: colors.text.disabled, fontSize: '12px', marginBottom: '4px' }}>
              Last Active
            </div>
            <div style={{ color: colors.text.primary, fontWeight: '500', fontSize: '14px' }}>
              {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
            </div>
          </div>

          {/* User ID */}
          <div style={{
            padding: '16px 0',
            borderBottom: `1px solid ${colors.border.primary}`
          }}>
            <div style={{ color: colors.text.disabled, fontSize: '12px', marginBottom: '4px' }}>
              User ID
            </div>
            <div style={{ 
              color: colors.text.primary, 
              fontWeight: '500',
              fontFamily: 'monospace',
              fontSize: '12px',
              wordBreak: 'break-all',
              lineHeight: '1.4'
            }}>
              {user.id}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexDirection: 'column',
          paddingBottom: '20px'
        }}>
          <button
            onClick={handleOpenDashboard}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: colors.primary.main,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: '48px'
            }}
            onMouseOver={(e) => {
               e.currentTarget.style.background = colors.primary.hover;
             }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = colors.primary.main;
            }}
          >
            Open Web Dashboard
          </button>
          
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'transparent',
              color: colors.text.secondary,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isSigningOut ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              minHeight: '48px',
              opacity: isSigningOut ? 0.6 : 1
            }}
            onMouseOver={(e) => {
              if (!isSigningOut) {
                e.currentTarget.style.background = colors.background.primary;
                e.currentTarget.style.borderColor = colors.text.secondary;
              }
            }}
            onMouseOut={(e) => {
              if (!isSigningOut) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = colors.border.primary;
              }
            }}
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
    </div>
  );
};

export default UserInfo;