import jsPDF from 'jspdf';

interface PDFOptions {
  title: string;
  content: string;
  logo?: string;
  companyName?: string;
}

export const generatePDF = ({ title, content, logo, companyName = 'Maintenance System' }: PDFOptions): void => {
  const doc = new jsPDF();

  // Colors
  const primaryColor = [207, 27, 34]; // #cf1b22
  const secondaryColor = [80, 80, 79]; // #50504f

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 30, 'F');

  if (logo) {
    // If logo provided, add it (would need to be converted to base64)
    // doc.addImage(logo, 'PNG', 10, 5, 20, 20);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 15, 20);

  // Title
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(16);
  doc.text(title, 15, 45);

  // Content
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  const lines = doc.splitTextToSize(content, 180);
  doc.text(lines, 15, 60);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save PDF
  doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

export const generateServiceOrderPDF = (orderData: any): void => {
  const activities = orderData.activities && orderData.activities.length > 0
    ? orderData.activities.join(', ')
    : orderData.activity_type || 'N/A';

  const content = `
ORDEN DE SERVICIO: ${orderData.order_number}

INFORMACIÓN GENERAL:
Sede: ${orderData.site?.name || 'N/A'}
Ubicación: ${orderData.site?.location || 'N/A'}

CONTRATISTA:
Empresa: ${orderData.contractor?.company_name || 'N/A'}
Contacto: ${orderData.contractor?.contact_name || 'N/A'}
Email: ${orderData.contractor?.email || 'N/A'}
Teléfono: ${orderData.contractor?.phone || 'N/A'}
Especialidad: ${orderData.contractor?.specialty || 'N/A'}

PERSONAL:
Solicitante: ${orderData.requester?.full_name || 'N/A'}
Ejecutor: ${orderData.executor?.full_name || 'N/A'}

ACTIVIDADES:
Tipo Principal: ${orderData.activity_type || 'N/A'}
Actividades: ${activities}

DESCRIPCIÓN:
${orderData.description || 'N/A'}

FECHAS:
Fecha de Solicitud: ${new Date(orderData.request_date).toLocaleDateString('es-CO')}
Fecha OCO: ${orderData.oco_date ? new Date(orderData.oco_date).toLocaleDateString('es-CO') : 'Pendiente'}
Fecha Inicio: ${orderData.start_date ? new Date(orderData.start_date).toLocaleDateString('es-CO') : 'No iniciada'}
Fecha Fin: ${orderData.end_date ? new Date(orderData.end_date).toLocaleDateString('es-CO') : 'En progreso'}

PRESUPUESTO:
Presupuesto: $${orderData.budget_amount?.toLocaleString('es-CO') || '0'}
${orderData.actual_amount ? `Ejecutado: $${orderData.actual_amount.toLocaleString('es-CO')}` : ''}
${orderData.actual_amount && orderData.budget_amount ? `Diferencia: $${(orderData.actual_amount - orderData.budget_amount).toLocaleString('es-CO')}` : ''}

INDICADORES:
${orderData.response_time_hours ? `Tiempo de Respuesta: ${orderData.response_time_hours} horas` : ''}
${orderData.execution_time_hours ? `Tiempo de Ejecución: ${orderData.execution_time_hours} horas` : ''}

ESTADO: ${orderData.status}

${orderData.task ? `TAREA RELACIONADA: ${orderData.task.title}` : ''}
${orderData.purchase_order ? `ORDEN DE COMPRA: ${orderData.purchase_order.order_number}` : ''}

Adjuntos: ${(orderData.attachments || orderData.attachment_urls)?.length || 0} archivo(s)

Creado por: ${orderData.created_by_user?.full_name || 'N/A'}
Creado el: ${new Date(orderData.created_at).toLocaleDateString('es-CO')}
`;

  generatePDF({
    title: `Orden de Servicio ${orderData.order_number}`,
    content,
  });
};

export const generateMeasurementPDF = (measurementData: any): void => {
  const content = `
MEASUREMENT REPORT: ${measurementData.title}

Site: ${measurementData.site?.name || 'N/A'}
Location: ${measurementData.site?.location || 'N/A'}

MEASUREMENTS:
Length: ${measurementData.length ? `${measurementData.length}m` : 'N/A'}
Height: ${measurementData.height ? `${measurementData.height}m` : 'N/A'}
Depth: ${measurementData.depth ? `${measurementData.depth}m` : 'N/A'}

CALCULATED VALUES:
Area: ${measurementData.calculated_area ? `${measurementData.calculated_area.toFixed(2)}m²` : 'N/A'}
Volume: ${measurementData.calculated_volume ? `${measurementData.calculated_volume.toFixed(2)}m³` : 'N/A'}

APPROVAL STATUS:
${measurementData.approved_by_edison ? `✓ Approved by Edison on ${new Date(measurementData.approved_at_edison).toLocaleDateString()}` : 'Pending Edison approval'}
${measurementData.approved_by_felipe ? `✓ Approved by Felipe on ${new Date(measurementData.approved_at_felipe).toLocaleDateString()}` : 'Pending Felipe approval'}
${measurementData.approved_by_claudia ? `✓ Approved by Claudia on ${new Date(measurementData.approved_at_claudia).toLocaleDateString()}` : 'Pending Claudia approval'}

Photos: ${measurementData.photo_urls?.length || 0} attached

Created by: ${measurementData.created_by || 'N/A'}
Created on: ${new Date(measurementData.created_at).toLocaleDateString()}
`;

  generatePDF({
    title: measurementData.title,
    content,
  });
};

// Generar PDF comparativo de cotizaciones mejorado
export const generateQuotationComparisonPDF = async (quotationData: any): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Colores corporativos
  const primaryColor = [207, 27, 34]; // #cf1b22
  const secondaryColor = [80, 80, 79]; // #50504f
  
  let yPos = 20;
  
  // Header con fondo rojo
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPARATIVO DE COTIZACIONES', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date(quotationData.created_at || Date.now()).toLocaleDateString('es-CO')}`, 105, 30, { align: 'center' });
  
  yPos = 50;
  
  // Información General
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN GENERAL', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  doc.text(`Título: ${quotationData.title}`, 15, yPos);
  yPos += 7;
  
  if (quotationData.tipo_cotizacion) {
    doc.text(`Tipo de Cotización: ${quotationData.tipo_cotizacion}`, 15, yPos);
    yPos += 7;
  }
  
  if (quotationData.cantidad) {
    doc.text(`Cantidad: ${quotationData.cantidad}`, 15, yPos);
    yPos += 7;
  }
  
  if (quotationData.formato_contratista) {
    doc.text(`Formato de Contratista: ${quotationData.formato_contratista}`, 15, yPos);
    yPos += 7;
  }
  
  doc.text(`Descripción: ${quotationData.description}`, 15, yPos);
  yPos += 10;
  
  // Tabla Comparativa
  yPos += 5;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('TABLA COMPARATIVA', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Encabezados de tabla
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 5, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Proveedor', 18, yPos);
  doc.text('Monto', 100, yPos);
  doc.text('Valor Unit.', 140, yPos);
  doc.text('Descripción', 170, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  
  // Cotización 1
  if (quotationData.quotation_1_provider) {
    doc.text(quotationData.quotation_1_provider.substring(0, 20), 18, yPos);
    doc.text(`$${quotationData.quotation_1_amount?.toLocaleString('es-CO') || 'N/A'}`, 100, yPos);
    const unitValue1 = quotationData.cantidad && quotationData.quotation_1_amount 
      ? (quotationData.quotation_1_amount / quotationData.cantidad).toFixed(2)
      : 'N/A';
    doc.text(`$${unitValue1}`, 140, yPos);
    doc.text(quotationData.description.substring(0, 15) || 'N/A', 170, yPos);
    yPos += 7;
  }
  
  // Cotización 2
  if (quotationData.quotation_2_provider) {
    doc.text(quotationData.quotation_2_provider.substring(0, 20), 18, yPos);
    doc.text(`$${quotationData.quotation_2_amount?.toLocaleString('es-CO') || 'N/A'}`, 100, yPos);
    const unitValue2 = quotationData.cantidad && quotationData.quotation_2_amount 
      ? (quotationData.quotation_2_amount / quotationData.cantidad).toFixed(2)
      : 'N/A';
    doc.text(`$${unitValue2}`, 140, yPos);
    doc.text(quotationData.description.substring(0, 15) || 'N/A', 170, yPos);
    yPos += 7;
  }
  
  // Cotización 3
  if (quotationData.quotation_3_provider) {
    doc.text(quotationData.quotation_3_provider.substring(0, 20), 18, yPos);
    doc.text(`$${quotationData.quotation_3_amount?.toLocaleString('es-CO') || 'N/A'}`, 100, yPos);
    const unitValue3 = quotationData.cantidad && quotationData.quotation_3_amount 
      ? (quotationData.quotation_3_amount / quotationData.cantidad).toFixed(2)
      : 'N/A';
    doc.text(`$${unitValue3}`, 140, yPos);
    doc.text(quotationData.description.substring(0, 15) || 'N/A', 170, yPos);
    yPos += 10;
  }
  
  // Comparativo por Monto
  if (quotationData.comparativo_por_monto) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('COMPARATIVO POR MONTO', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const montoData = JSON.parse(JSON.stringify(quotationData.comparativo_por_monto));
    if (Array.isArray(montoData)) {
      montoData.forEach((item: any, index: number) => {
        doc.text(`${index + 1}. ${item.provider}: $${item.amount?.toLocaleString('es-CO')}`, 15, yPos);
        yPos += 7;
      });
    }
  }
  
  // Comparativo por Valor
  if (quotationData.comparativo_por_valor) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('COMPARATIVO POR VALOR', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const valorData = JSON.parse(JSON.stringify(quotationData.comparativo_por_valor));
    if (Array.isArray(valorData)) {
      valorData.forEach((item: any, index: number) => {
        const unitValue = quotationData.cantidad && item.amount 
          ? (item.amount / quotationData.cantidad).toFixed(2)
          : 'N/A';
        doc.text(`${index + 1}. ${item.provider}: $${unitValue} por unidad`, 15, yPos);
        yPos += 7;
      });
    }
  }
  
  // Comparativo por Descripción
  if (quotationData.comparativo_por_descripcion) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('COMPARATIVO POR DESCRIPCIÓN', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const descData = JSON.parse(JSON.stringify(quotationData.comparativo_por_descripcion));
    if (Array.isArray(descData)) {
      descData.forEach((item: any, index: number) => {
        doc.text(`${index + 1}. ${item.provider}`, 15, yPos);
        yPos += 5;
        const descLines = doc.splitTextToSize(item.description || 'N/A', 180);
        doc.text(descLines, 20, yPos);
        yPos += descLines.length * 5 + 2;
      });
    }
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-CO')}`,
      105,
      290,
      { align: 'center' }
    );
  }
  
  // Convertir a Blob para subir a Supabase
  return doc.output('blob');
};

// Generar PDF de Corte con formato específico
export const generateCutPDF = async (cutData: any): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Colores corporativos
  const primaryColor = [207, 27, 34]; // #cf1b22
  const secondaryColor = [80, 80, 79]; // #50504f
  
  let yPos = 20;
  
  // Header con fondo rojo
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CORTE DE OBRA', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date(cutData.created_at || Date.now()).toLocaleDateString('es-CO')}`, 105, 30, { align: 'center' });
  
  yPos = 50;
  
  // Información General
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN GENERAL', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  doc.text(`Sede: ${cutData.site?.name || 'N/A'}`, 15, yPos);
  yPos += 7;
  doc.text(`Ubicación: ${cutData.site?.location || 'N/A'}`, 15, yPos);
  yPos += 7;
  
  if (cutData.task) {
    doc.text(`Tarea Asociada: ${cutData.task.title || 'N/A'}`, 15, yPos);
    yPos += 7;
  }
  
  // Medidas
  yPos += 5;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('MEDIDAS', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const unit = cutData.measurement_unit || 'm';
  if (cutData.length) doc.text(`Longitud: ${cutData.length} ${unit}`, 15, yPos);
  yPos += 7;
  if (cutData.height) doc.text(`Altura: ${cutData.height} ${unit}`, 15, yPos);
  yPos += 7;
  if (cutData.width) doc.text(`Ancho: ${cutData.width} ${unit}`, 15, yPos);
  yPos += 7;
  if (cutData.depth) doc.text(`Profundidad: ${cutData.depth} ${unit}`, 15, yPos);
  yPos += 7;
  
  if (cutData.calculated_area) {
    doc.text(`Área Calculada: ${cutData.calculated_area.toFixed(2)} m²`, 15, yPos);
    yPos += 7;
  }
  if (cutData.calculated_volume) {
    doc.text(`Volumen Calculado: ${cutData.calculated_volume.toFixed(2)} m³`, 15, yPos);
    yPos += 7;
  }
  
  // Actividades
  if (cutData.activities) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('ACTIVIDADES', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const activitiesLines = doc.splitTextToSize(cutData.activities, 180);
    doc.text(activitiesLines, 15, yPos);
    yPos += activitiesLines.length * 7;
  }
  
  // Globales
  if (cutData.globales) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('GLOBALES', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const globalesLines = doc.splitTextToSize(cutData.globales, 180);
    doc.text(globalesLines, 15, yPos);
    yPos += globalesLines.length * 7;
  }
  
  // Horas por Administración
  if (cutData.admin_hours) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('HORAS POR ADMINISTRACIÓN', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${cutData.admin_hours} horas`, 15, yPos);
    yPos += 7;
  }
  
  // Observaciones
  if (cutData.observations) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('OBSERVACIONES', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const observationsLines = doc.splitTextToSize(cutData.observations, 180);
    doc.text(observationsLines, 15, yPos);
    yPos += observationsLines.length * 7;
  }
  
  // Cómo se hace
  if (cutData.how_to_do) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('CÓMO SE REALIZA', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const howToDoLines = doc.splitTextToSize(cutData.how_to_do, 180);
    doc.text(howToDoLines, 15, yPos);
    yPos += howToDoLines.length * 7;
  }
  
  // Valor del Corte
  if (cutData.cut_value) {
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('VALOR DEL CORTE', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`$${cutData.cut_value.toLocaleString('es-CO')}`, 15, yPos);
    yPos += 10;
  }
  
  // Firma de Revisión
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Firma de Revisión:', 15, yPos);
  yPos += 15;
  
  if (cutData.edison_signature_url) {
    doc.text('✓ Firma de Edison registrada', 15, yPos);
    yPos += 7;
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-CO')}`,
      105,
      290,
      { align: 'center' }
    );
  }
  
  // Convertir a Blob para subir a Supabase
  return doc.output('blob');
};

// Generar PDF de Orden de Compra según formato PARTEQUIPOS
export const generatePurchaseOrderPDF = async (orderData: any): Promise<Blob> => {
  const doc = new jsPDF();
  const primaryColor = [207, 27, 34]; // #cf1b22
  const secondaryColor = [80, 80, 79]; // #50504f

  let yPos = 15;

  // Encabezado de la empresa
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('PARTEQUIPOS MAQUINARIA S.A.S', 15, yPos);
  yPos += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`NIT: ${orderData.company_nit || '830.116.807-7'}`, 15, yPos);
  yPos += 5;
  doc.text(`ERPG ${orderData.erpg_number || '542'}`, 15, yPos);
  yPos += 5;
  doc.text(`Tel: ${orderData.company_phone || '4485878 - 4926260'}`, 15, yPos);
  yPos += 8;

  // Título
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('ORDEN DE COMPRA', 15, yPos);
  yPos += 10;

  // Información principal en dos columnas
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Columna izquierda
  doc.text(`Fecha: ${new Date(orderData.order_date || Date.now()).toLocaleDateString('es-CO')}`, 15, yPos);
  doc.text(`Emitido para: ${orderData.issued_to || ''}`, 15, yPos + 5);
  doc.text(`NIT ${orderData.issued_to_nit || ''}`, 15, yPos + 10);
  doc.text(`Cod Área: ${orderData.area_code || ''}`, 15, yPos + 15);
  doc.text(`Elaboró: ${orderData.prepared_by_name || ''}`, 15, yPos + 20);
  
  // Columna derecha
  doc.text(`Autorizado por: ${orderData.authorized_by_name || ''}`, 120, yPos);
  doc.text(`No. Cotización: ${orderData.quotation_number || ''}`, 120, yPos + 5);
  doc.text(`PRECIO: $${(orderData.total || 0).toLocaleString('es-CO')}`, 120, yPos + 10);
  
  yPos += 30;

  // Comentarios (antes de la tabla)
  if (orderData.comments) {
    doc.text('Comentarios:', 15, yPos);
    yPos += 5;
    const commentsLines = doc.splitTextToSize(orderData.comments, 180);
    doc.text(commentsLines, 15, yPos);
    yPos += commentsLines.length * 5 + 5;
  }

  // Tabla de items con encabezados
  yPos += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPCIÓN', 15, yPos);
  doc.text('PROYECTO', 100, yPos);
  doc.text('CONTROL DE PRESUPUESTO', 150, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Dibujar líneas de la tabla
  const tableStartY = yPos - 2;
  const tableEndY = yPos;
  
  if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
    orderData.items.forEach((item: any, index: number) => {
      const itemPrice = parseFloat(item.price?.toString().replace(/[^0-9.-]+/g, '') || '0') * parseFloat(item.quantity || '1');
      
      // Descripción del item
      const descriptionText = item.description || orderData.activity_type || 'N/A';
      const descLines = doc.splitTextToSize(descriptionText, 80);
      doc.text(descLines, 15, yPos);
      const descHeight = descLines.length * 5;
      
      // Proyecto: prioridad project_code, luego comments, luego cost_center + activity_type
      let projectDisplay = '';
      if (orderData.project_code) {
        projectDisplay = orderData.project_code;
      } else if (orderData.comments && orderData.comments.includes('PROYECTO')) {
        projectDisplay = orderData.comments;
      } else if (orderData.cost_center && orderData.activity_type) {
        projectDisplay = `${orderData.cost_center} - ${orderData.activity_type}`;
      } else if (orderData.activity_type) {
        projectDisplay = orderData.activity_type;
      }
      const projectLines = doc.splitTextToSize(projectDisplay, 40);
      doc.text(projectLines, 100, yPos);
      
      // Control de presupuesto (precio)
      doc.text(`$${itemPrice.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos);
      
      // Ajustar yPos según la altura máxima de las columnas
      yPos += Math.max(descHeight, projectLines.length * 5, 6);
    });
  } else {
    // Si no hay items, mostrar actividad general
    const descriptionText = orderData.activity_type || 'N/A';
    const descLines = doc.splitTextToSize(descriptionText, 80);
    doc.text(descLines, 15, yPos);
    
    // Proyecto: prioridad project_code, luego comments, luego cost_center + activity_type
    let projectDisplay = '';
    if (orderData.project_code) {
      projectDisplay = orderData.project_code;
    } else if (orderData.comments && orderData.comments.includes('PROYECTO')) {
      projectDisplay = orderData.comments;
    } else if (orderData.cost_center && orderData.activity_type) {
      projectDisplay = `${orderData.cost_center} - ${orderData.activity_type}`;
    } else if (orderData.activity_type) {
      projectDisplay = orderData.activity_type;
    }
    const projectLines = doc.splitTextToSize(projectDisplay, 40);
    doc.text(projectLines, 100, yPos);
    
    const total = parseFloat(orderData.total?.toString().replace(/[^0-9.-]+/g, '') || '0') || 0;
    doc.text(`$${total.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos);
    
    yPos += Math.max(descLines.length * 5, projectLines.length * 5, 6);
  }

  yPos += 5;

  // Totales - alineados a la derecha
  const totalsX = 150;
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal', totalsX, yPos);
  const subtotal = parseFloat(orderData.subtotal?.toString().replace(/[^0-9.-]+/g, '') || '0') || 
                   (orderData.items && Array.isArray(orderData.items) 
                     ? orderData.items.reduce((sum: number, item: any) => {
                         const price = parseFloat(item.price?.toString().replace(/[^0-9.-]+/g, '') || '0');
                         const qty = parseFloat(item.quantity || '1');
                         return sum + (price * qty);
                       }, 0)
                     : 0);
  doc.text(`$${subtotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.text('Impuestos', totalsX, yPos);
  doc.text(`${orderData.tax_type || 'Impuesto ventas'}`, 160, yPos);
  yPos += 6;
  doc.text('Otros', totalsX, yPos);
  const otherTaxes = parseFloat(orderData.other_taxes?.toString().replace(/[^0-9.-]+/g, '') || '0') || 0;
  doc.text(`$${otherTaxes.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Total', totalsX, yPos);
  const total = parseFloat(orderData.total?.toString().replace(/[^0-9.-]+/g, '') || '0') || (subtotal + otherTaxes);
  doc.text(`$${total.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, yPos);
  yPos += 15;

  // Firmas
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Firma de quien elaboró', 15, yPos);
  doc.text(orderData.prepared_date ? new Date(orderData.prepared_date).toLocaleDateString('es-CO') : '', 15, yPos + 5);
  
  doc.text('Firma del empleado', 120, yPos);
  doc.text(orderData.employee_signature_date ? new Date(orderData.employee_signature_date).toLocaleDateString('es-CO') : '', 120, yPos + 5);
  
  yPos += 15;

  // Nota final
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('El número de la orden de compra debe aparecer en todas las facturas y correspondencia.', 15, yPos, { maxWidth: 180 });

  return doc.output('blob');
};

