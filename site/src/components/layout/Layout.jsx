import { Link, NavLink, useLocation } from "react-router-dom";
import "./Layout.css";

export default function Layout({ children }) {
  return (
    <div className="layout">
      <header className="topbar">
        <Link to="/" className="logo">
          <span className="logo-text">CORTEX</span>
          <span className="logo-accent" />
        </Link>
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} end>
            Dashboard
          </NavLink>
          <NavLink to="/models" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Models
          </NavLink>
          <NavLink to="/vision" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Vision
          </NavLink>
          <NavLink to="/thesis" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Thesis
          </NavLink>
        </nav>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
