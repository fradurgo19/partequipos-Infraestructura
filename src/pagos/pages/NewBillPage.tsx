import React from 'react';
import { BillForm } from '../organisms/BillForm';

export const NewBillPage: React.FC = () => {
  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-r from-[#cf1b22] via-[#a11217] to-[#50504f] rounded-2xl shadow-2xl p-8 mb-6 border border-[#cf1b22]/40">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Registrar Nueva Factura</h1>
        <p className="text-white/80 text-lg">Complete el formulario para registrar una nueva factura de servicios</p>
      </div>
      <BillForm />
    </div>
  );
};
