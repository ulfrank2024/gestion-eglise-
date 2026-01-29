import React from 'react';
import { Outlet, useParams } from 'react-router-dom';

function PublicLayout() {
  const { churchId } = useParams();

  // Log pour debug - ne devrait jamais recevoir "admin" si le routing est correct
  if (churchId) {
    console.log(`PublicLayout: Loaded with churchId="${churchId}"`);
  }

  return (
    <>
      <Outlet />
    </>
  );
}

export default PublicLayout;
