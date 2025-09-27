import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { fonts } from "../styles/fonts";
import { ClickIcon, SetValueIcon, NavigationIcon } from "../styles/Icons";
import { useAppState } from "../../state";
import { useTheme } from "../styles/theme";

interface MarkdownRendererProps {
  content: string;
}

// ============================================================================
// KEYFRAMES ANIMATION
// ============================================================================

const KEYFRAMES = `
  @keyframes shimmer-wave {
    0% { background-position: 300% 0; }
    50% { background-position: 0% 0; }
    100% { background-position: -300% 0; }
  }
  @keyframes slide-in {
    0% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

// ============================================================================
// UTILITY FUNCTION: Extract text from React children
// ============================================================================

const extractTextFromChildren = (children: React.ReactNode): string => {
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (children == null) {
    return '';
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (typeof children === 'object' && 'props' in children) {
    // Handle React elements by extracting text from their props.children
    const reactElement = children as React.ReactElement;
    if (reactElement.props && typeof reactElement.props === 'object' && 'children' in reactElement.props) {
      const elementChildren = reactElement.props.children as React.ReactNode;
      return extractTextFromChildren(elementChildren);
    }
  }
  // Fallback for any other case
  return String(children);
};

// ============================================================================
// STATUS BOX COMPONENT (Toast/Notification Card)
// ============================================================================

interface StatusBoxProps {
  children: React.ReactNode;
  type?: string;
}

const StatusBox: React.FC<StatusBoxProps> = ({ children, type }) => {
  const statusText = extractTextFromChildren(children).trim();
  const { colors, shadows } = useTheme();
  
  // Parse status type from attribute or content
  const statusType = (type || '').trim();
  const contentLower = statusText.toLowerCase();
  
  // Format status text: convert StatusType("message") to StatusType: message
  const formatStatusText = (text: string): string => {
    // Match patterns like: StatusType("message") or StatusType('message')
    // Handles: Task Error("message"), Action Failed("message"), etc.
    const doubleQuoteMatch = text.match(/^(.+?)\("(.+)"\)$/);
    if (doubleQuoteMatch) {
      const [, statusTypeName, message] = doubleQuoteMatch;
      return `${statusTypeName.trim()}: ${message}`;
    }
    // Also handle single quotes: StatusType('message')
    const singleQuoteMatch = text.match(/^(.+?)\('(.+)'\)$/);
    if (singleQuoteMatch) {
      const [, statusTypeName, message] = singleQuoteMatch;
      return `${statusTypeName.trim()}: ${message}`;
    }
    return text;
  };

  const formattedStatusText = formatStatusText(statusText);
  
  // Determine status variant
  const getStatusConfig = () => {
    // Check attribute first, then content
    const checkString = statusType || contentLower;
    
    if (checkString.includes('success') || checkString.includes('completed') || checkString.includes('done')) {
      return {
        color: colors.state.success,
        bgColor: 'rgba(16, 185, 129, 0.1)', // Light green background
        borderColor: colors.state.success,
        icon: '✓',
        label: 'Success',
      };
    }
    if (checkString.includes('error') || checkString.includes('failed') || checkString.includes('failure')) {
      return {
        color: colors.state.error,
        bgColor: 'rgba(239, 68, 68, 0.1)', // Light red background
        borderColor: colors.state.error,
        icon: '✕',
        label: 'Error',
      };
    }
    if (checkString.includes('warning') || checkString.includes('warn') || checkString.includes('caution')) {
      return {
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)', // Light orange background
        borderColor: '#F59E0B',
        icon: '⚠',
        label: 'Warning',
      };
    }
    // Default to info
    return {
      color: colors.brand.main,
      bgColor: 'rgba(29, 123, 167, 0.1)', // Light blue background
      borderColor: colors.brand.main,
      icon: 'ℹ',
      label: 'Info',
    };
  };

  const config = getStatusConfig();
  // Use the formatted status text as message, or label if empty
  const displayText = formattedStatusText || config.label;

  const styles = {
    container: {
      backgroundColor: config.bgColor,
      border: `1px solid ${config.borderColor}`,
      borderRadius: '8px',
      padding: '12px 16px',
      margin: '12px 0',
      marginLeft: 0,
      marginRight: 0,
      boxShadow: shadows.md,
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box' as const,
      display: 'block' as const,
    },
    message: {
      fontFamily: fonts.body,
      fontSize: '14px',
      lineHeight: 1.5,
      color: colors.text.primary,
      margin: 0,
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-word' as const,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.message}>{displayText}</div>
    </div>
  );
};

// ============================================================================
// ACTION BOX COMPONENT
// ============================================================================

const ActionBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const actionText = extractTextFromChildren(children).trim();
  const taskStatus = useAppState((s) => s.taskManager.status);
  const actionStatus = useAppState((s) => s.taskManager.actionStatus);
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [needsTruncation, setNeedsTruncation] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // Action Text Formatting
  // --------------------------------------------------------------------------

  const formatActionText = (text: string) => {
    const waitingMatch = text.match(/waiting\((\d+)\)/i);
    if (waitingMatch) return `Waiting ${waitingMatch[1]} seconds for page to load`;
    
    const clickMatch = text.match(/click\((\d+)\)/i);
    if (clickMatch) return `Click element`;
    
    const setValueMatch = text.match(/setValue\((\d+),\s*"([^"]*)"\)/i);
    if (setValueMatch) {
      const value = setValueMatch[2].replace(/\\n/g, '\n').trim();
      return `Input text|||${value}`;
    }
    
    const navigateMatch = text.match(/navigate\(["']([^"']+)["']\)/i);
    if (navigateMatch) {
      const url = navigateMatch[1];
      try {
        // Extract domain from URL
        const urlObj = new URL(url);
        let domain = urlObj.hostname;
        // Remove 'www.' prefix if present
        if (domain.startsWith('www.')) {
          domain = domain.substring(4);
        }
        return `navigate to ${domain}`;
      } catch (e) {
        // If URL parsing fails, try to extract domain manually
        let domain = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
        domain = domain.split('/')[0]; // Remove path
        return `navigate to ${domain}`;
      }
    }
    
    return text;
  };

  const getActionIcon = () => {
    const lower = actionText.toLowerCase();
    if (lower.startsWith('click')) return <ClickIcon w={16} h={16} color={colors.brand.main} />;
    if (lower.startsWith('setvalue')) return <SetValueIcon w={16} h={16} color={colors.brand.main} />;
    if (lower.startsWith('navigate')) return <NavigationIcon w={16} h={16} color={colors.brand.main} />;
    return null;
  };

  // --------------------------------------------------------------------------
  // State & Effects
  // --------------------------------------------------------------------------

  const isWaitingAction = actionText.toLowerCase().startsWith('waiting');
  const isActionRunning = taskStatus === "running" && actionStatus === "performing-action";
  const isWaitingRunning = isWaitingAction && isActionRunning;
  const hasIcon = getActionIcon() !== null;
  const formattedText = formatActionText(actionText);
  const isSetValueAction = formattedText.includes('|||');
  const [setValueLabel, setValueContent] = isSetValueAction ? formattedText.split('|||') : [formattedText, ''];

  React.useEffect(() => {
    if (isSetValueAction && contentRef.current) {
      const element = contentRef.current;
      const lineHeight = parseInt(getComputedStyle(element).lineHeight);
      const maxLines = Math.floor(200 / lineHeight);
      const actualLines = element.scrollHeight / lineHeight;
      setNeedsTruncation(actualLines > maxLines);
    }
  }, [isSetValueAction, setValueContent]);

  // --------------------------------------------------------------------------
  // Styles
  // --------------------------------------------------------------------------

  const baseInputBox = {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 0 8px 12px',
    marginLeft: '8px',
    fontFamily: '"Geist", sans-serif',
    fontSize: '14px',
    lineHeight: 1.5,
    color: colors.text.secondary,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    overflow: 'hidden',
    transition: 'max-height 0.3s ease',
  };

  const styles = {
    box: {
      border: 'none',
      borderRadius: '8px',
      margin: '16px 0',
      backgroundColor: colors.app.primary,
      overflow: 'hidden',
    },
    content: {
      backgroundColor: colors.app.primary,
      margin: 0,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      border: 'none',
      overflowX: 'auto' as const,
    },
    text: {
      fontFamily: fonts.body,
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: 1.4,
      color: colors.text.primary,
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-word' as const,
      margin: 0,
      flex: 1,
    },
    wave: {
      position: 'relative' as const,
      background: `linear-gradient(90deg, ${colors.text.primary} 0%, ${colors.text.primary} 30%, ${colors.brand.main} 50%, ${colors.text.primary} 70%, ${colors.text.primary} 100%)`,
      backgroundSize: '300% 100%',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      animation: 'shimmer-wave 6s ease-in-out infinite',
    },
    wrapper: {
      display: 'flex',
      flexDirection: 'column' as const,
      width: '100%',
      gap: '8px',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    label: {
      fontFamily: fonts.body,
      fontSize: '14px',
      fontWeight: 500,
      color: colors.text.primary,
    },
    inputBox: {
      ...baseInputBox,
      borderLeft: `1px solid ${colors.border.light}`,
      maxHeight: '200px',
    },
    inputBoxExp: {
      ...baseInputBox,
      borderLeft: `1px solid ${colors.border.primary}`,
      maxHeight: 'none',
    },
    btn: {
      background: 'none',
      border: 'none',
      color: colors.brand.main,
      fontFamily: '"Geist", sans-serif',
      fontSize: '12px',
      cursor: 'pointer',
      padding: '4px 0',
      marginLeft: '8px',
      textAlign: 'left' as const,
      transition: 'color 0.2s ease',
    },
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div style={styles.box}>
      <div style={styles.content}>
        {isSetValueAction ? (
          <div style={styles.wrapper}>
            <div style={styles.header}>
              {getActionIcon()}
              <span style={styles.label}>{setValueLabel}</span>
            </div>
            <div ref={contentRef} style={isExpanded ? styles.inputBoxExp : styles.inputBox}>
              {setValueContent}
            </div>
            {needsTruncation && (
              <button 
                style={styles.btn} 
                onClick={() => setIsExpanded(!isExpanded)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.brand.hover;
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.brand.main;
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {isExpanded ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>
        ) : (
          <>
            {hasIcon && getActionIcon()}
            <pre style={isWaitingRunning ? { ...styles.text, ...styles.wave } : styles.text}>
              {formattedText}
            </pre>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MARKDOWN RENDERER COMPONENT
// ============================================================================

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { colors } = useTheme();
  
  // --------------------------------------------------------------------------
  // Content Preprocessing
  // --------------------------------------------------------------------------

  const cleanContent = React.useMemo(() => {
    let cleaned = content;
    
    // Handle <thought> tags stream-safe
    const THOUGHT_OPEN = '__THOUGHT_OPEN__';
    const THOUGHT_CLOSE = '__THOUGHT_CLOSE__';
    const tokenized = cleaned.replace(/<thought>/gi, THOUGHT_OPEN).replace(/<\/thought>/gi, THOUGHT_CLOSE);
    
    let result = '';
    let i = 0;
    let inThought = false;
    
    while (i < tokenized.length) {
      if (tokenized.startsWith(THOUGHT_OPEN, i)) {
        result += '&lt;thought&gt;';
        inThought = true;
        i += THOUGHT_OPEN.length;
        continue;
      }
      if (tokenized.startsWith(THOUGHT_CLOSE, i)) {
        result += '&lt;/thought&gt;';
        inThought = false;
        i += THOUGHT_CLOSE.length;
        continue;
      }
      const ch = tokenized[i];
      if (inThought) {
        if (ch === '&') result += '&amp;';
        else if (ch === '<') result += '&lt;';
        else if (ch === '>') result += '&gt;';
        else result += ch;
      } else {
        result += ch;
      }
      i++;
    }
    
    cleaned = result
      .replace(/\[(?:textbox|input|text|button|link|field|dropdown|select|checkbox|radio|textarea)\]/gi, '')
      .replace(/<input[^>]*\/?>/gi, '')
      .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, '')
      .replace(/<textarea[^>]*\/?>/gi, '')
      .replace(/<select[^>]*>[\s\S]*?<\/select>/gi, '')
      .replace(/<select[^>]*\/?>/gi, '')
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
      .replace(/<form[^>]*\/?>/gi, '');
    
    return cleaned;
  }, [content]);
  
  // --------------------------------------------------------------------------
  // Styles
  // --------------------------------------------------------------------------

  const headingBase = {
    marginTop: '1.5em',
    marginBottom: '0.5em',
    fontWeight: 600,
    color: colors.text.primary,
  };

  const s = {
    root: {
      fontFamily: fonts.body,
      fontSize: '14px',
      lineHeight: 1.6,
      color: colors.text.primary,
      letterSpacing: '0.02em',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box' as const,
    },
    h1: { ...headingBase, fontSize: '1.5em' },
    h2: { ...headingBase, fontSize: '1.3em' },
    h3: { ...headingBase, fontSize: '1.2em' },
    h4: { ...headingBase, fontSize: '1.1em' },
    h5: { ...headingBase, fontSize: '1em' },
    h6: { ...headingBase, fontSize: '1em' },
    p: { marginBottom: '16px', marginTop: 0, width: '100%', marginLeft: 0, marginRight: 0, padding: 0, boxSizing: 'border-box' as const, minWidth: 0 },
    ul: { marginBottom: '1em', paddingLeft: '1.5em' },
    ol: { marginBottom: '1em', paddingLeft: '1.5em' },
    li: { marginBottom: '0.25em' },
    blockquote: {
      borderLeft: `4px solid ${colors.border.primary}`,
      paddingLeft: '1em',
      margin: '1em 0',
      fontStyle: 'italic',
      color: colors.text.secondary,
      backgroundColor: colors.app.secondary,
      padding: '0.75em 1em',
      borderRadius: '0 4px 4px 0',
    },
    code: {
      backgroundColor: colors.app.secondary,
      padding: '0.2em 0.4em',
      borderRadius: '3px',
      fontSize: '0.9em',
      fontFamily: fonts.body,
      color: colors.text.primary,
      border: `1px solid ${colors.border.primary}`,
    },
    pre: {
      backgroundColor: colors.app.secondary,
      padding: '1em',
      borderRadius: '6px',
      overflow: 'auto',
      margin: '1em 0',
      border: `1px solid ${colors.border.primary}`,
    },
    a: { color: colors.brand.main, textDecoration: 'none' },
    strong: { fontWeight: 600 },
    em: { fontStyle: 'italic' },
    hr: { border: 'none', borderTop: `1px solid ${colors.border.primary}`, margin: '2em 0' },
    table: { borderCollapse: 'collapse' as const, width: '100%', margin: '1em 0' },
    th: {
      border: `1px solid ${colors.border.primary}`,
      padding: '0.5em',
      textAlign: 'left' as const,
      backgroundColor: colors.app.secondary,
      fontWeight: 600,
    },
    td: {
      border: `1px solid ${colors.border.primary}`,
      padding: '0.5em',
      textAlign: 'left' as const,
    },
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={s.root}>
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          components={{
            // @ts-ignore
            action: ({ children }: { children: React.ReactNode }) => <ActionBox>{children}</ActionBox>,
            // @ts-ignore
            status: ({ children, ...props }: any) => (
              <StatusBox type={props.type || props['data-type']}>{children}</StatusBox>
            ),
            span: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
              <span className={className}>{children}</span>
            ),
            h1: ({ children }) => <h1 style={s.h1}>{children}</h1>,
            h2: ({ children }) => <h2 style={s.h2}>{children}</h2>,
            h3: ({ children }) => <h3 style={s.h3}>{children}</h3>,
            h4: ({ children }) => <h4 style={s.h4}>{children}</h4>,
            h5: ({ children }) => <h5 style={s.h5}>{children}</h5>,
            h6: ({ children }) => <h6 style={s.h6}>{children}</h6>,
            p: ({ children }) => <p style={s.p}>{children}</p>,
            ul: ({ children }) => <ul style={s.ul}>{children}</ul>,
            ol: ({ children }) => <ol style={s.ol}>{children}</ol>,
            li: ({ children }) => <li style={s.li}>{children}</li>,
            blockquote: ({ children }) => <blockquote style={s.blockquote}>{children}</blockquote>,
            code: ({ children }) => <span>{children}</span>,
            pre: ({ children }) => <pre style={s.pre}>{children}</pre>,
            a: ({ children, href }) => (
              <a 
                href={href} 
                style={s.a}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {children}
              </a>
            ),
            strong: ({ children }) => <strong style={s.strong}>{children}</strong>,
            em: ({ children }) => <em style={s.em}>{children}</em>,
            hr: () => <hr style={s.hr} />,
            table: ({ children }) => <table style={s.table}>{children}</table>,
            th: ({ children }) => <th style={s.th}>{children}</th>,
            td: ({ children }) => <td style={s.td}>{children}</td>,
            input: () => null,
            textarea: () => null,
            select: () => null,
            form: () => null,
            button: () => null,
          }}
        >
          {cleanContent}
        </ReactMarkdown>
      </div>
    </>
  );
};

export default MarkdownRenderer;