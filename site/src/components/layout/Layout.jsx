import { Link, useLocation } from "react-router-dom";
import "./Layout.css";

export default function Layout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="layout">
      <header className="topbar">
        <Link to="/" className="logo">
          <span className="logo-mark">C</span>
          <span className="logo-text">Cortex</span>
        </Link>
        {!isHome && (
          <Link to="/" className="back-link">
            Dashboard
          </Link>
        )}
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
