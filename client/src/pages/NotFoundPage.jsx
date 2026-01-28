import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdHome, MdArrowBack, MdSearchOff } from 'react-icons/md';

function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%)',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
        padding: '40px',
        backgroundColor: '#1f2937',
        borderRadius: '16px',
        border: '1px solid #374151',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Icon */}
        <div style={{
          width: '100px',
          height: '100px',
          margin: '0 auto 24px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <MdSearchOff style={{ fontSize: '48px', color: 'white' }} />
        </div>

        {/* 404 Text */}
        <h1 style={{
          fontSize: '72px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 16px 0'
        }}>
          404
        </h1>

        {/* Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#f3f4f6',
          margin: '0 0 12px 0'
        }}>
          {t('page_not_found') || 'Page non trouvée'}
        </h2>

        {/* Description */}
        <p style={{
          fontSize: '16px',
          color: '#9ca3af',
          margin: '0 0 32px 0',
          lineHeight: '1.6'
        }}>
          {t('page_not_found_description') || 'La page que vous recherchez n\'existe pas ou a été déplacée.'}
        </p>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#d1d5db',
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#4b5563';
              e.target.style.color = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#374151';
              e.target.style.color = '#d1d5db';
            }}
          >
            <MdArrowBack style={{ fontSize: '18px' }} />
            {t('go_back') || 'Retour'}
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.4)'
            }}
            onMouseOver={(e) => {
              e.target.style.opacity = '0.9';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <MdHome style={{ fontSize: '18px' }} />
            {t('go_home') || 'Accueil'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
