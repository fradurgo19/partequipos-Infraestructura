import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pagosAuthService } from '../pagos/services/authService';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Card } from '../atoms/Card';
import { Building2, Send } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const INFRA_SIGN_IN_TIMEOUT_MS = 5_000;

const signInWithTimeout = (
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>,
  email: string,
  password: string
) =>
  Promise.race([
    signIn(email, password),
    new Promise<{ error: Error }>((resolve) => {
      globalThis.setTimeout(
        () => resolve({ error: new Error('Infra login timeout') }),
        INFRA_SIGN_IN_TIMEOUT_MS
      );
    }),
  ]);

const isInfraSignInSuccess = (
  result: PromiseSettledResult<{ error: Error | null }>
) => result.status === 'fulfilled' && !result.value.error;

export const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const [infraResult, pagosResult] = await Promise.allSettled([
        signInWithTimeout(signIn, email, password),
        pagosAuthService.signIn(email, password),
      ]);

      if (isInfraSignInSuccess(infraResult)) {
        navigate('/dashboard');
        return;
      }

      if (pagosResult.status === 'fulfilled') {
        navigate('/pagos/reports');
        return;
      }

      const pagosError = pagosResult.status === 'rejected' ? pagosResult.reason : null;
      const infraError =
        infraResult.status === 'fulfilled' ? infraResult.value.error : infraResult.reason;

      setError(getErrorMessage(pagosError ?? infraError, 'Credenciales inválidas'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#cf1b22] rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#50504f] mb-2">
            Gestión de Mantenimiento
          </h1>
          <p className="text-gray-600">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Correo electrónico"
            placeholder="tu.correo@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
          />

          <Input
            type="password"
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => navigate('/solicitud-interna')}
          >
            <Send className="w-4 h-4 mr-2" />
            Solicitud interna (sin inicio de sesión)
          </Button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Contacta al administrador para acceso a la cuenta</p>
        </div>
      </Card>
    </div>
  );
};
