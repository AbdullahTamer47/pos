import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@smartpos/types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role as UserRole;

  if (userRole === UserRole.SUPER_ADMIN) {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(userRole)) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          error: 'You do not have permission to access this page.',
        }}
      />
    );
  }

  return <>{children}</>;
}