import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '../atoms/Card';
import { InternalRequestForm } from '../organisms/InternalRequestForm';
import {
  createEmptyInternalRequestForm,
  InternalRequestFormData,
} from '../types/internalRequestForm';
import {
  fetchPublicInternalRequestSites,
  PublicSiteOption,
  submitPublicInternalRequest,
} from '../services/publicInternalRequestApi';

const PARTEQUIPOS_LOGO_URL =
  'https://res.cloudinary.com/dbufrzoda/image/upload/v1750457354/Captura_de_pantalla_2025-06-20_170819_wzmyli.png';

export const PublicInternalRequest = () => {
  const [sites, setSites] = useState<PublicSiteOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<InternalRequestFormData>(createEmptyInternalRequestForm());

  useEffect(() => {
    let active = true;

    const loadSites = async () => {
      setLoadingSites(true);
      try {
        const data = await fetchPublicInternalRequestSites();
        if (active) {
          setSites(data);
        }
      } catch {
        if (active) {
          setError('No se pudieron cargar las sedes. Intente nuevamente más tarde.');
        }
      } finally {
        if (active) {
          setLoadingSites(false);
        }
      }
    };

    loadSites();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (loadingSites) {
      setError('Espere a que se carguen las sedes');
      return;
    }

    if (!formData.requester_name.trim()) {
      setError('Ingrese el nombre de quien solicita');
      return;
    }

    setSubmitting(true);
    try {
      await submitPublicInternalRequest(formData);
      setSubmitted(true);
      setFormData(createEmptyInternalRequestForm());
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Error al enviar la solicitud';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <img src={PARTEQUIPOS_LOGO_URL} alt="Logo oficial Partequipos" className="h-10 w-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f]">Solicitud Interna</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Complete el formulario para enviar su solicitud al equipo de infraestructura. No requiere inicio de sesión.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {submitted ? (
          <Card className="text-center py-10">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#50504f] mb-2">Solicitud enviada correctamente</h2>
            <p className="text-gray-600 mb-6">
              Su solicitud fue registrada y el equipo de infraestructura fue notificado.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-[#cf1b22] font-medium hover:underline"
            >
              Enviar otra solicitud
            </button>
          </Card>
        ) : (
          <Card>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600" role="alert">
                {error}
              </div>
            )}
            <InternalRequestForm
              sites={sites}
              formData={formData}
              onChange={setFormData}
              onSubmit={handleSubmit}
              submitting={submitting}
              sitesLoading={loadingSites}
              uploadMode="public"
              submitLabel="Enviar Solicitud"
            />
          </Card>
        )}
      </main>
    </div>
  );
};
