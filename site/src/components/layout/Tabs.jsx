import { useState } from "react";
import "./Tabs.css";

export default function Tabs({ tabs, defaultTab = 0 }) {
  const [active, setActive] = useState(defaultTab);

  return (
    <div className="tabs-container">
      <div className="tabs-nav">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            className={`tab-btn ${active === i ? "active" : ""}`}
            onClick={() => setActive(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">{tabs[active]?.content}</div>
    </div>
  );
}
