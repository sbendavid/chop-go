import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, refreshTokenStorage, tokenStorage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

export type AppRole = 'buyer' | 'chef' | 'rider' | 'admin';

interface RegisterApiRequest {
  fullName: string
  password: string
  email: string;
  phoneNumber: string;
  role: AppRole;
}
 
interface LoginApiResponse {
  message: string;
  data: {
    user: AppUser;
    token: string;
    refreshToken: string;
  };
}
 
export interface AppUser {
  _id: string;
  email: string;
  phoneNumber?: string;
  role: AppRole;
  fullName: string;
}
 
export interface Profile {
  id: string;
  user_id: string;
  phoneNumber: string;
  fullName: string | null;
  avatar_url: string | null;
  nin_verified: boolean;
  bvn_verified: boolean;
  verification_status: string;
}
 
interface AuthResponse {
  message: string;
  data: {
    user: AppUser;
    token: string;
    refreshToken: string;
  };
}
 
interface MeResponse {
  user: AppUser;
  profile: Profile | null;
  roles: AppRole[];
}

interface AuthContextType {
  user: AppUser | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  resendVerifyOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (token: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, phoneNumber: string, fullName: string, role: AppRole,) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}
 
function rolesFromToken(token: string): AppRole[] {
  const p = decodeJwt(token);
  if (!p) return [];
  if (typeof p.role === 'string')   return [p.role as AppRole];
  if (Array.isArray(p.roles))       return p.roles as AppRole[];
  return [];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  console.log("User", user)

  function applyLogin(apiUser: AppUser, token: string, refreshToken: string) {
    tokenStorage.set(token);
    refreshTokenStorage.set(refreshToken);

    const derivedRoles = rolesFromToken(token);

    setUser({
      ...apiUser,
      role: derivedRoles[0] ?? apiUser.role,
    });

    setRoles(derivedRoles);
    setProfile(null);
  }
 
  function clearSession() {
    tokenStorage.clear();
    setUser(null);
    setProfile(null);
    setRoles([]);
  }
 
  // Restore session on page reload 
 
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) { setLoading(false); return; }
 
    const payload = decodeJwt(token);
 
    // Check token hasn't expired
    if (payload?.exp && (payload.exp as number) * 1000 < Date.now()) {
      clearSession();
      setLoading(false);
      return;
    }
 
    if (payload && typeof payload.userId === 'string') {
      setUser({
        _id:      payload.userId as string,
        email:    (payload.email    as string) ?? '',
        fullName: (payload.fullName as string) ?? '',
        role:     (payload.role     as AppRole) ?? undefined,
      });
      setRoles(rolesFromToken(token));
    } else {
      clearSession();
    }
 
    setLoading(false);
  }, []);


  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    phoneNumber: string
  ): Promise<{ error: Error | null }> => {
    try {
      const res = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
        fullName,
        role,
        phoneNumber
      });
      setUser(res.data.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);
 
  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });

      applyLogin(
        res.data.user,
        res.data.token,
        res.data.refreshToken
      );
      setUser(res.data.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);
 
  const resendVerifyOtp = useCallback(async (email: string): Promise<{ error: Error | null }> => {
    try {
      await api.post('/auth/resend-verification-email', { email });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);
 
  const verifyOtp = useCallback(async (
    token: string
  ): Promise<{ error: Error | null }> => {
    try {
      const res = await api.get<AuthResponse>(`/auth/verify-email/${token}`);
      setUser(res.data.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);
 
  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/signout');
    } catch {
      // best-effort
    } finally {
      tokenStorage.clear();
      setUser(null);
      setProfile(null);
      setRoles([]);
    }
  }, []);
 
  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        loading,
        resendVerifyOtp,
        verifyOtp,
        signUp,
        signIn,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
 
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
