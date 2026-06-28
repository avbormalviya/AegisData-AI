import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { IoCopyOutline, IoCheckmarkOutline, IoTerminalOutline } from "react-icons/io5";
// import { executeCode } from "../services/api";

export const CodeRenderer = ({
  code,
  language = "python",
  theme = "light",
  onRun,
}) => {
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState(null);
  const isDark = theme === "dark";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };



  return (
    <div
      className="code-renderer-container"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        overflow: "hidden",
        marginTop: "8px",
      }}
    >
      <div
        className="code-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "var(--surface-solid)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-secondary)",
            fontSize: "0.82rem",
          }}
        >
          <IoTerminalOutline size={14} />
          <span>{language}</span>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={handleCopy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
            }}
          >
            {copied ? (
              <>
                <IoCheckmarkOutline size={14} style={{ color: "var(--success)" }} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <IoCopyOutline size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <SyntaxHighlighter
        language={language}
        style={isDark ? materialDark : oneLight}
        wrapLines
        wrapLongLines
        customStyle={{
          margin: 0,
          padding: "16px",
          fontSize: "0.85rem",
          lineHeight: "1.6",
          background: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.7)",
          textShadow: "none",
        }}
        codeTagProps={{
          style: {
            textShadow: "none",
            fontFamily: "'JetBrains Mono', monospace",
          }
        }}
      >
        {code?.trim()}
      </SyntaxHighlighter>
      {output && (
        <div
          style={{
            padding: "8px 12px",
            background: isDark ? "#1a1a1a" : "#f5f5f5",
            borderTop: "1px solid var(--border)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.8rem",
            whiteSpace: "pre-wrap",
            color: output.error ? "var(--error)" : "var(--text-primary)",
          }}
        >
          {output.error ? `Error: ${output.error}` : typeof output === 'object' ? JSON.stringify(output, null, 2) : output}
        </div>
      )}
    </div>
  );
};