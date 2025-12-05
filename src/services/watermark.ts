// Servicio para agregar marca de agua a imágenes usando el backend
export const addWatermarkToImage = async (imageFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/upload/image/watermark`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al procesar imagen con marca de agua');
    }

    const data = await response.json();
    if (data.url) {
      return data.url;
    } else {
      throw new Error('No se recibió URL de la imagen');
    }
  } catch (error) {
    console.error('Error en addWatermarkToImage:', error);
    throw error;
  }
};

