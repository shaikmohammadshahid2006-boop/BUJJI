import { useContext } from 'react';
import { AuthContext, AuthProvider, AuthContextType } from './AuthProvider';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthProvider };
export type { AuthContextType };
