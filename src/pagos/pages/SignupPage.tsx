import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { usePagosAuth } from '../context/PagosAuthContext';
import { Input } from '../../atoms/Input';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = usePagosAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password, fullName, location);
      navigate('/pagos/reports');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdebec] to-[#f5f5f5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo de la compañía */}
        <div className="flex justify-center mb-6">
          <img 
            src="https://res.cloudinary.com/dbufrzoda/image/upload/v1750457354/Captura_de_pantalla_2025-06-20_170819_wzmyli.png" 
            alt="Logo de la Compañía"
            className="h-20 w-auto object-contain"
          />
        </div>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#cf1b22] rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Crear Cuenta</h1>
          <p className="text-gray-600 mt-2">Comienza a gestionar tus facturas de servicios</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm" role="alert">
                {error}
              </div>
            )}

            <Input
              type="text"
              label="Nombre Completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              required
              autoComplete="name"
            />

            <Input
              type="email"
              label="Correo Electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@ejemplo.com"
              required
              autoComplete="email"
            />

            <Input
              type="text"
              label="Ubicación"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Oficina Bogotá"
              required
            />

            <Input
              type="password"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              helperText="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
            />

            <Button type="submit" className="w-full" isLoading={loading}>
              Crear Cuenta
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/pagos/login" className="text-[#cf1b22] hover:text-[#7f0c12] font-medium">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
