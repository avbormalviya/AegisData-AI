import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  materialDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  IoCopyOutline,
  IoCheckmarkOutline,
  IoTerminalOutline,
} from "react-icons/io5";

export const CodeRenderer = ({
  code,
  language = "python",
}) => {
  const [copied, setCopied] = useState(false);

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
              <IoCheckmarkOutline size={14} />
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

      <SyntaxHighlighter
        language={language}
        style={materialDark}
        wrapLines
        wrapLongLines
        customStyle={{
          margin: 0,
          padding: "16px",
          fontSize: "0.85rem",
          lineHeight: "1.6",
          background: "var(--surface)"
        }}
      >
        {code?.trim()}
      </SyntaxHighlighter>
    </div>
  );
};