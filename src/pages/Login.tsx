import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pagosAuthService } from '../pagos/services/authService';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Send, ShieldCheck } from 'lucide-react';

const LOGIN_BACKGROUND_URL =
  'https://res.cloudinary.com/dbufrzoda/image/upload/v1782573746/Gemini_Generated_Image_7wjtkl7wjtkl7wjt_zmezmj.png';
const PARTEQUIPOS_LOGO_URL =
  'https://res.cloudinary.com/dbufrzoda/image/upload/v1750457354/Captura_de_pantalla_2025-06-20_170819_wzmyli.png';

const PartequiposLogo = ({ className = 'h-10 w-auto' }: { className?: string }) => (
  <img
    src={PARTEQUIPOS_LOGO_URL}
    alt="Logo oficial Partequipos"
    className={`object-contain ${className}`}
  />
);

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
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('${LOGIN_BACKGROUND_URL}')` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#50504f]/95 via-[#50504f]/82 to-[#cf1b22]/70"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section className="hidden lg:flex lg:w-[52%] flex-col justify-between p-10 xl:p-14 text-white">
          <div className="inline-flex rounded-xl bg-white px-5 py-3 shadow-lg">
            <PartequiposLogo className="h-11 w-auto max-w-[220px]" />
          </div>

          <div className="max-w-lg space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 text-[#ffb4b7]" />
              Plataforma corporativa
            </span>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Gestión de Mantenimiento e Infraestructura
            </h1>
            <p className="text-lg text-white/85 leading-relaxed">
              Administra sedes, tareas, contratos y solicitudes internas desde un solo lugar.
            </p>
            <div className="h-1 w-20 rounded-full bg-[#cf1b22]" />
          </div>

          <p className="text-sm text-white/60">© Partequipos · Acceso seguro para colaboradores</p>
        </section>

        <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/95 p-7 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-8 text-center lg:text-left">
              <PartequiposLogo className="mx-auto lg:mx-0 h-12 w-auto max-w-[240px] mb-5" />
              <h2 className="text-2xl font-bold text-[#50504f]">Bienvenido</h2>
              <p className="mt-1 text-gray-600">Inicia sesión en tu cuenta</p>
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
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#cf1b22]"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth disabled={loading} className="shadow-lg shadow-[#cf1b22]/25">
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>

            <div className="mt-5 border-t border-gray-200 pt-5">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="inline-flex items-center justify-center"
                onClick={() => navigate('/solicitud-interna')}
              >
                <Send className="w-4 h-4 mr-2" />
                Solicitud interna (sin inicio de sesión)
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              Contacta al administrador para acceso a la cuenta
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
