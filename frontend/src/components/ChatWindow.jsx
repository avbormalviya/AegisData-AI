import { MessageBubble } from "./MessageBubble";
import { ThinkingBubble } from "./ThinkingBubble";
import { useRef, useEffect } from "react";
import { IoStatsChart, IoCodeSlash, IoList, IoHelpCircle, IoSparkles } from "react-icons/io5";
import logo_dark from "../../public/logo-dark.svg";
import logo_light from "../../public/logo-light.svg";
 
export const ChatWindow = ({ messages, isLoading, onSelectSuggestion, theme }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const suggestions = [
    {
      text: "Perform statistical summary on my dataset",
      icon: <IoList size={16} />,
      mode: "csv"
    },
    {
      text: "Plot a bar chart of the top performing values",
      icon: <IoStatsChart size={16} />,
      mode: "csv"
    },
    {
      text: "Check correlations between numerical variables",
      icon: <IoSparkles size={16} />,
      mode: "csv"
    },
    {
      text: "Write custom code to filter my dataset",
      icon: <IoCodeSlash size={16} />,
      mode: "code"
    }
  ];

  return (
    <div className="chat-window">
      {messages.length === 0 ? (
        <div className="chat-empty-state">
          <div className="empty-logo-wrapper">
            <img src={ theme === "light" ? logo_light : logo_dark } alt="AegisData AI" />
          </div>
          <h2 className="empty-title">AegisData AI</h2>
          <p className="empty-subtitle">
            Welcome to your autonomous data analyst assistant. Upload a CSV or Excel dataset, select your analysis mode, and ask questions to compute formulas, parse tables, and design visualizations.
          </p>

          <div className="features-grid">
            <div className="feature-badge">
              <IoList size={18} />
              <div>
                <strong>CSV & Excel Analytics</strong>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Auto-profiles data structures instantly.</p>
              </div>
            </div>
            <div className="feature-badge">
              <IoStatsChart size={18} />
              <div>
                <strong>Visualizations</strong>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Interactive bar charts and line charts.</p>
              </div>
            </div>
          </div>

          <p className="suggestions-title">Get Started Quickly</p>
          <div className="suggestion-grid">
            {suggestions.map((sug, index) => (
              <button
                key={index}
                className="suggestion-card"
                onClick={() => onSelectSuggestion && onSelectSuggestion(sug.text, sug.mode)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {sug.icon}
                  <span>{sug.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((message, idx) => (
          <MessageBubble key={idx} message={message} theme={theme} />
        ))
      )}

      {isLoading && <ThinkingBubble />}
      
      <div ref={bottomRef} />
    </div>
  );
};