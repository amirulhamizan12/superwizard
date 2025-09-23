import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../styles/theme";

// ============================================================================
// TYPES
// ============================================================================

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

interface TabSelectorProps {
  position: { top: number; left: number };
  onSelect: (tab: TabInfo) => void;
  onClose: () => void;
}

// ============================================================================
// TAB SELECTOR COMPONENT
// ============================================================================

const TabSelector: React.FC<TabSelectorProps> = ({ position, onSelect, onClose }) => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { colors, shadows } = useTheme();
  const selectedItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch all tabs from Chrome
    const fetchTabs = async () => {
      try {
        const allTabs = await chrome.tabs.query({});
        // Filter out extension pages and system pages
        const validTabs = allTabs
          .filter(tab => 
            tab.id && 
            tab.title && 
            tab.url &&
            !tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('chrome-extension://') &&
            !tab.url.startsWith('edge://') &&
            !tab.url.startsWith('about:')
          )
          .map(tab => ({
            id: tab.id!,
            title: tab.title || 'Untitled',
            url: tab.url || '',
            favIconUrl: tab.favIconUrl
          }));
        setTabs(validTabs);
      } catch (error) {
        console.error('Failed to fetch tabs:', error);
      }
    };

    fetchTabs();
  }, []);

  useEffect(() => {
    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, tabs.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (tabs[selectedIndex]) {
          onSelect(tabs[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, selectedIndex, onSelect, onClose]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1100,
        }}
      />
      
      {/* Dropdown */}
      <div
        className="hidden-scrollbar"
        style={{
          position: 'fixed',
          bottom: position.top + 10,
          left: position.left,
          maxWidth: '500px',
          width: 'calc(100vw - 40px)',
          maxHeight: '300px',
          overflowY: 'auto',
          background: colors.app.primary,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: '12px',
          boxShadow: `0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)`,
          zIndex: 1101,
          padding: '8px',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {tabs.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              color: colors.text.tertiary,
              fontSize: '13px',
              fontFamily: 'Geist, sans-serif',
              textAlign: 'center',
            }}
          >
            No available tabs
          </div>
        ) : (
          tabs.map((tab, index) => (
            <div
              key={tab.id}
              ref={index === selectedIndex ? selectedItemRef : null}
              onClick={() => onSelect(tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '6px 9px',
                cursor: 'pointer',
                borderRadius: '6px',
                background: index === selectedIndex ? colors.app.hover : 'transparent',
                transition: 'all 0.2s ease',
                marginBottom: '2px',
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateX(3px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              {/* Favicon */}
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tab.favIconUrl ? (
                  <img
                    src={tab.favIconUrl}
                    alt=""
                    style={{
                      width: '13px',
                      height: '13px',
                      borderRadius: '2px',
                    }}
                    onError={(e) => {
                      // Fallback to globe icon if favicon fails to load
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent && !parent.querySelector('svg')) {
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.setAttribute('width', '13');
                        svg.setAttribute('height', '13');
                        svg.setAttribute('viewBox', '0 0 24 24');
                        svg.setAttribute('fill', 'none');
                        svg.setAttribute('stroke', colors.text.tertiary);
                        svg.setAttribute('stroke-width', '2');
                        svg.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>';
                        parent.appendChild(svg);
                      }
                    }}
                  />
                ) : (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.text.tertiary}
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                )}
              </div>

              {/* Tab info */}
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: colors.text.primary,
                    fontFamily: 'Geist, sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '0.06em',
                  }}
                >
                  {tab.title}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          /* Hidden scrollbar styles */
          .hidden-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hidden-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
    </>
  );
};

export default TabSelector;
