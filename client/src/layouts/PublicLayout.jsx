import React from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';

// Routes réservées qui ne sont pas des churchId
const RESERVED_ROUTES = ['admin', 'super-admin', 'church-register', 'login', 'register'];

function PublicLayout() {
  const { churchId } = useParams();

  // Si le churchId est une route réservée, ne pas charger les événements publics
  // Cela évite les erreurs "invalid input syntax for type uuid: 'admin'"
  if (churchId && RESERVED_ROUTES.includes(churchId.toLowerCase())) {
    console.warn(`PublicLayout: "${churchId}" is a reserved route, redirecting to 404`);
    return <Navigate to="/not-found" replace />;
  }

  return (
    <>
      <Outlet />
    </>
  );
}

export default PublicLayout;
