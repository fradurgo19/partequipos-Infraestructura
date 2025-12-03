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
  const content = `
SERVICE ORDER: ${orderData.order_number}

Site: ${orderData.site?.name || 'N/A'}
Location: ${orderData.site?.location || 'N/A'}

Contractor: ${orderData.contractor?.company_name || 'N/A'}
Contact: ${orderData.contractor?.contact_name || 'N/A'}

Activity Type: ${orderData.activity_type}
Description: ${orderData.description}

Request Date: ${new Date(orderData.request_date).toLocaleDateString()}
Start Date: ${orderData.start_date ? new Date(orderData.start_date).toLocaleDateString() : 'Not started'}
End Date: ${orderData.end_date ? new Date(orderData.end_date).toLocaleDateString() : 'In progress'}

Budget Amount: $${orderData.budget_amount.toLocaleString()}
Status: ${orderData.status}

Created by: ${orderData.created_by_user?.full_name || 'N/A'}
Created on: ${new Date(orderData.created_at).toLocaleDateString()}
`;

  generatePDF({
    title: `Service Order ${orderData.order_number}`,
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

export const generateQuotationComparisonPDF = (quotationData: any): void => {
  const content = `
QUOTATION COMPARISON: ${quotationData.title}

Description: ${quotationData.description}

COMPARISON TABLE:

Quotation 1:
  Provider: ${quotationData.quotation_1_provider || 'N/A'}
  Amount: ${quotationData.quotation_1_amount ? `$${quotationData.quotation_1_amount.toLocaleString()}` : 'N/A'}

Quotation 2:
  Provider: ${quotationData.quotation_2_provider || 'N/A'}
  Amount: ${quotationData.quotation_2_amount ? `$${quotationData.quotation_2_amount.toLocaleString()}` : 'N/A'}

Quotation 3:
  Provider: ${quotationData.quotation_3_provider || 'N/A'}
  Amount: ${quotationData.quotation_3_amount ? `$${quotationData.quotation_3_amount.toLocaleString()}` : 'N/A'}

STATUS: ${quotationData.status}
${quotationData.reviewed_by ? `Reviewed by: ${quotationData.reviewed_by} on ${new Date(quotationData.reviewed_at).toLocaleDateString()}` : 'Pending review'}

Created by: ${quotationData.created_by || 'N/A'}
Created on: ${new Date(quotationData.created_at).toLocaleDateString()}
`;

  generatePDF({
    title: `Quotation Comparison - ${quotationData.title}`,
    content,
  });
};

