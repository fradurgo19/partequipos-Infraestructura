import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { usePagosAuth } from '../context/PagosAuthContext';
import { Input } from '../../atoms/Input';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = usePagosAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/pagos/reports');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#cf1b22] via-[#a11217] to-[#50504f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#cf1b22]/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#50504f]/15 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        {/* Logo de la compañía */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-2xl">
            <img 
              src="https://res.cloudinary.com/dbufrzoda/image/upload/v1750457354/Captura_de_pantalla_2025-06-20_170819_wzmyli.png" 
              alt="Logo de la Compañía"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Sistema de Gestión
          </h1>
          <p className="text-white/80 text-lg">Control y seguimiento de facturas empresariales</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-br from-[#cf1b22] to-[#a11217] p-4 rounded-xl shadow-lg">
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Bienvenido</h2>
          <p className="text-gray-600 text-center mb-8">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm flex items-start space-x-3" role="alert">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>{error}</span>
              </div>
            )}

            <Input
              type="email"
              label="Correo Electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              required
              autoComplete="email"
            />

            <Input
              type="password"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <Button type="submit" className="w-full btn-premium text-lg py-3" isLoading={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Sistema de Gestión de Facturas © 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
