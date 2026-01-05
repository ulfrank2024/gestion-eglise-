import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo_eden.jpg';
import { MdDomain, MdLeaderboard, MdExpandMore, MdExpandLess } from 'react-icons/md';

function SuperAdminLayout() {
  const { t, i18n } = useTranslation();
  const [openSections, setOpenSections] = useState({
    platformManagement: true,
    reportsAndStats: false,
  });

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const [hoveredItem, setHoveredItem] = useState(null);

  const getLinkStyle = ({ isActive, itemName, isParent = false }) => {
    const isHovered = hoveredItem === itemName;
    const baseStyle = {
      textDecoration: 'none',
      padding: '8px 10px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      transition: 'background-color 0.2s, color 0.2s',
      color: '#333',
    };

    if (isParent) {
      return {
        ...baseStyle,
        backgroundColor: '#e0e0e0',
        fontWeight: 'bold',
        marginBottom: '5px',
        color: '#000',
      };
    }

    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#007bff',
        color: '#fff',
      };
    }
    if (isHovered) {
      return {
        ...baseStyle,
        backgroundColor: '#e9ecef',
      };
    }
    return {
      ...baseStyle,
      backgroundColor: 'transparent',
    };
  };

  const iconStyle = { marginRight: '10px' };
  const toggleIconStyle = { marginLeft: 'auto', fontSize: '1.2em', color: '#333' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '250px', background: '#f4f4f4', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <img 
            src={logo} 
            alt="Logo" 
            style={{ maxWidth: '150px', height: 'auto', display: 'block', borderRadius: '100px', objectFit: 'contain' }}
          />
          <h3>{t('super_admin_menu')}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {/* Section Gestion de la Plateforme */}
            <li style={{ marginBottom: '10px' }}>
              <div
                onClick={() => toggleSection('platformManagement')}
                style={{ ...getLinkStyle({ itemName: 'platformManagement', isParent: true }), cursor: 'pointer' }}
              >
                <MdDomain style={iconStyle} />
                {t('platform_management')}
                {openSections.platformManagement ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.platformManagement && (
                <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/super-admin/dashboard"
                      onMouseEnter={() => setHoveredItem('dashboard')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'dashboard' })}
                    >
                      {t('all_churches')}
                    </NavLink>
                  </li>
                  {/* Ajouter d'autres liens spécifiques au Super-Admin ici */}
                </ul>
              )}
            </li>

            {/* Section Rapports et Statistiques */}
            <li style={{ marginBottom: '10px' }}>
              <div
                onClick={() => toggleSection('reportsAndStats')}
                style={{ ...getLinkStyle({ itemName: 'reportsAndStats', isParent: true }), cursor: 'pointer' }}
              >
                <MdLeaderboard style={iconStyle} />
                {t('reports_and_stats')}
                {openSections.reportsAndStats ? (
                  <MdExpandLess style={toggleIconStyle} />
                ) : (
                  <MdExpandMore style={toggleIconStyle} />
                )}
              </div>
              {openSections.reportsAndStats && (
                <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                  <li style={{ marginBottom: '5px' }}>
                    <NavLink
                      to="/super-admin/statistics"
                      onMouseEnter={() => setHoveredItem('statistics')}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={({ isActive }) => getLinkStyle({ isActive, itemName: 'statistics' })}
                    >
                      {t('platform_statistics')}
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #ddd', marginBottom: '15px' }}>
          <p style={{ marginBottom: '10px' }}>{t('language_switcher')}:</p>
          <button onClick={() => handleLanguageChange('fr')} style={{ marginRight: '5px', padding: '8px 12px', cursor: 'pointer', fontWeight: i18n.language === 'fr' ? 'bold' : 'normal' }}>FR</button>
          <button onClick={() => handleLanguageChange('en')} style={{ padding: '8px 12px', cursor: 'pointer', fontWeight: i18n.language === 'en' ? 'bold' : 'normal' }}>EN</button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default SuperAdminLayout;
