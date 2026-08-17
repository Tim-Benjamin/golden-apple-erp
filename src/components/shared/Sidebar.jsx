import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getVisibleNavigation } from '../../config/navigation';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const { role } = useAuth();
  const sections = getVisibleNavigation(role);

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">GA</span>
          <div>
            <div className="sidebar-brand-name">Golden Apple</div>
            <div className="sidebar-brand-sub">Guest House ERP</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div className="sidebar-section" key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                  }
                  onClick={onClose}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}