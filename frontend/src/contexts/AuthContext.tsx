import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (email === 'demo@kplaner.com' && password === 'demo123') {
          const fakeUser = { id: '1', name: 'Thomas D.', email: 'demo@kplaner.com' };
          const fakeToken = 'fake-jwt-token';
          localStorage.setItem('token', fakeToken);
          localStorage.setItem('user', JSON.stringify(fakeUser));
          setToken(fakeToken);
          setUser(fakeUser);
          resolve();
        } else {
          reject(new Error('Email ou mot de passe incorrect'));
        }
        setIsLoading(false);
      }, 800);
    });
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (name && email && password) {
          const fakeUser = { id: Date.now().toString(), name, email };
          const fakeToken = 'fake-jwt-token';
          localStorage.setItem('token', fakeToken);
          localStorage.setItem('user', JSON.stringify(fakeUser));
          setToken(fakeToken);
          setUser(fakeUser);
          resolve();
        } else {
          reject(new Error('Tous les champs sont requis'));
        }
        setIsLoading(false);
      }, 800);
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
