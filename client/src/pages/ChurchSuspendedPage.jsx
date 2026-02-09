import { useTranslation } from 'react-i18next';
import { MdBlock, MdEmail, MdLogout } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo_eden.png';

/**
 * Page affichée quand une église est suspendue
 * L'admin et les membres ne peuvent pas accéder au dashboard
 */
const ChurchSuspendedPage = ({ reason }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('supabase.auth.token');
      navigate('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          border: '1px solid #dc2626',
          overflow: 'hidden',
        }}
      >
        {/* Header rouge */}
        <div
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            padding: '30px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <MdBlock size={48} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: '24px', fontWeight: '600' }}>
            {t('suspended.title', 'Compte Suspendu')}
          </h1>
        </div>

        {/* Corps */}
        <div style={{ padding: '30px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={logo} alt="MY EDEN X" style={{ width: '60px', height: '60px' }} />
            <p style={{ color: '#9ca3af', margin: '8px 0 0', fontSize: '14px', fontWeight: '600' }}>MY EDEN X</p>
          </div>

          {/* Message principal */}
          <div
            style={{
              backgroundColor: '#7f1d1d',
              border: '1px solid #dc2626',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <p style={{ color: '#fef2f2', margin: 0, fontSize: '15px', lineHeight: '1.6' }}>
              {t('suspended.message', 'L\'accès à votre tableau de bord a été temporairement suspendu. Vous ne pouvez pas accéder aux fonctionnalités de l\'application pendant cette période.')}
            </p>
          </div>

          {/* Raison si disponible */}
          {reason && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 8px' }}>
                {t('suspended.reason', 'Raison de la suspension')} :
              </p>
              <div
                style={{
                  backgroundColor: '#374151',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  borderLeft: '4px solid #fbbf24',
                }}
              >
                <p style={{ color: '#fbbf24', margin: 0, fontSize: '14px', fontWeight: '500' }}>
                  {reason}
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: '#d1d5db', fontSize: '14px', margin: '0 0 12px' }}>
              {t('suspended.instructions', 'Pour résoudre cette situation, veuillez contacter l\'administrateur de la plateforme :')}
            </p>
            <a
              href="mailto:support@myedenx.com"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#60a5fa',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              <MdEmail size={18} />
              support@myedenx.com
            </a>
          </div>

          {/* Bouton déconnexion */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              color: '#d1d5db',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
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
            <MdLogout size={18} />
            {t('suspended.logout', 'Se déconnecter')}
          </button>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: '#111827',
            padding: '16px',
            textAlign: 'center',
            borderTop: '1px solid #374151',
          }}
        >
          <p style={{ color: '#6b7280', margin: 0, fontSize: '12px' }}>
            MY EDEN X - {t('suspended.footer', 'Plateforme de Gestion d\'Église')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChurchSuspendedPage;
