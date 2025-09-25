import React, { useState } from 'react';
import { useTheme } from '../styles/theme';
import { ArrowLeftIcon, UserCircleIcon, SettingsIcon } from '../styles/Icons';
import { useAppState } from '../../state';

interface UserInfoProps {
  onBack: () => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ onBack }) => {
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAppState((state) => state.auth);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // ===== HANDLERS =====
  const handleSignOut = () => {
    setIsSigningOut(true);
    window.open('https://www.superwizard.ai/auth/logout', '_blank');
    setTimeout(() => setIsSigningOut(false), 2000);
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

  // ===== STYLES =====
  const s = {
    container: {
      height: '100vh',
      width: '100vw',
      background: colors.app.primary,
      fontFamily: 'Geist',
      color: colors.text.primary,
      padding: '22px 16px',
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const
    },
    card: {
      background: colors.app.primary,
      borderRadius: '20px',
      padding: '20px',
      marginBottom: '20px',
      border: `1px solid ${colors.border.primary}`
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '20px'
    },
    iconWrapper: {
      width: '24px',
      height: '24px',
      marginRight: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    sectionTitle: {
      margin: 0,
      fontSize: '17px',
      fontWeight: '500',
      color: colors.text.primary
    },
    infoLabel: {
      color: colors.text.muted,
      fontSize: '14px',
      marginBottom: '4px'
    },
    infoValue: {
      color: colors.text.primary,
      fontWeight: '500',
      fontSize: '16px'
    },
    button: (bg: string, w = '90px') => ({
      background: bg,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      width: w
    }),
    actionCard: {
      background: colors.app.primary,
      borderRadius: '12px',
      padding: '12px',
      border: `1px solid ${colors.border.primary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    }
  };

  // ===== UNAUTHENTICATED VIEW =====
  if (!isAuthenticated || !user) {
    return (
      <div style={{ ...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <p style={{ marginBottom: '16px', color: colors.text.secondary }}>Not authenticated</p>
          <button onClick={onBack} style={s.button(colors.brand.main, 'auto')}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ===== COMPONENTS =====
  const InfoField = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div style={s.infoLabel}>{label}</div>
      <div style={s.infoValue}>{value}</div>
    </div>
  );

  const ActionButton = ({ label, onClick, bg, disabled = false, loading = false }: any) => (
    <div style={s.actionCard}>
      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '400', color: colors.text.primary }}>{label}</h4>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{ ...s.button(bg), cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
      >
        {loading ? 'Loading' : label.split(' ').pop()}
      </button>
    </div>
  );

  // ===== MAIN RENDER =====
  return (
    <div style={s.container}>
      {/* ===== HEADER ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button
          type="button"
          aria-label="Go back"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.app.buttonicn
          }}
          onClick={onBack}
        >
          <ArrowLeftIcon w="19px" h="19px" style={{ color: 'inherit' }} />
        </button>
        <h2 style={{
          fontSize: '24px',
          lineHeight: '34px',
          color: colors.text.primary,
          fontFamily: 'Roca One, serif',
          fontWeight: 'normal',
          margin: 0,
          WebkitTextStroke: `0.25px ${colors.text.primary}`,
          textShadow: 'none',
          transform: 'translateY(2px)',
          letterSpacing: '0.06em'
        }}>
          Profile
        </h2>
      </div>

      {/* ===== PROFILE SUMMARY ===== */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            marginRight: '16px',
            overflow: 'hidden',
            border: `2px solid ${colors.border.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: user.avatar_url ? 'transparent' : colors.brand.main
          }}>
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const p = e.currentTarget.parentElement;
                  if (p) {
                    p.style.background = colors.brand.main;
                    p.innerHTML = (user.full_name || user.email || 'U').charAt(0).toUpperCase();
                    p.style.fontSize = '20px';
                    p.style.fontWeight = '600';
                    p.style.color = 'white';
                  }
                }}
              />
            ) : (
              <span style={{ fontSize: '20px', fontWeight: '600', color: 'white' }}>
                {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '500', color: colors.text.primary }}>
              {user.full_name || 'No name provided'}
            </h2>
            <p style={{ margin: 0, fontSize: '15px', color: colors.text.muted }}>{user.email}</p>
          </div>
        </div>
      </div>

      {/* ===== PERSONAL INFORMATION ===== */}
      <div style={s.card}>
        <div style={s.sectionHeader}>
          <div style={s.iconWrapper}>
            <UserCircleIcon w="20px" h="20px" color={colors.text.muted} />
          </div>
          <h3 style={s.sectionTitle}>Personal Information</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InfoField label="Full Name" value={user.full_name || 'No name provided'} />
          <InfoField label="Email Address" value={user.email} />
          <InfoField
            label="Member Since"
            value={new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          />
          <InfoField label="Last Sign In" value={user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'} />
          <div>
            <div style={s.infoLabel}>Email Verification</div>
            <div style={{ ...s.infoValue, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Verified</span>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: colors.state.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ===== ACCOUNT ACTIONS ===== */}
      <div style={s.card}>
        <div style={s.sectionHeader}>
          <div style={s.iconWrapper}>
            <SettingsIcon w="20px" h="20px" color={colors.text.muted} />
          </div>
          <h3 style={s.sectionTitle}>Quick Actions</h3>
        </div>
        <ActionButton label="Sign Out" onClick={handleSignOut} bg={colors.state.error} disabled={isSigningOut} loading={isSigningOut} />
        <div style={{ ...s.actionCard, marginBottom: 0 }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '400', color: colors.text.primary }}>Usage & Credits</h4>
          <button
            onClick={() => window.open('https://www.superwizard.ai/settings#usage', '_blank')}
            style={s.button(colors.brand.main)}
            onMouseOver={(e) => e.currentTarget.style.background = colors.brand.hover}
            onMouseOut={(e) => e.currentTarget.style.background = colors.brand.main}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
