import { useState, useEffect } from 'react';
import { Ruler, Calendar, AlertTriangle, CheckCircle, Clock, FileCheck } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Measurements } from './Measurements';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Contract {
  id: string;
  contract_number: string;
  contractor: {
    company_name: string;
    contact_name: string;
  };
  description: string;
  start_date: string;
  end_date: string | null;
  status: string;
  total_amount: number;
  site: {
    name: string;
    location: string;
  } | null;
}

interface ContractTracking {
  id: string;
  contract_id: string;
  tracking_date: string;
  activity_description: string;
  compliance_status: string | null;
  contract: Contract;
}

export const ContractTracking = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'measurements' | 'deadlines'>('measurements');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tracking, setTracking] = useState<ContractTracking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [contractsResult, trackingResult] = await Promise.all([
      supabase
        .from('contracts')
        .select(
          `*,
          contractor:contractors(id, company_name, contact_name),
          site:sites(id, name, location)`
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('contract_tracking')
        .select(
          `*,
          contract:contracts!inner(
            id,
            contract_number,
            contractor:contractors(company_name, contact_name),
            description,
            start_date,
            end_date,
            status,
            total_amount,
            site:sites(name, location)
          )`
        )
        .order('tracking_date', { ascending: false }),
    ]);

    if (!contractsResult.error && contractsResult.data) {
      setContracts(contractsResult.data as any);
    }
    if (!trackingResult.error && trackingResult.data) {
      setTracking(trackingResult.data as any);
    }
    setLoading(false);
  };

  const getDaysUntilDeadline = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const today = new Date();
    const deadline = new Date(endDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getComplianceStatus = (contract: Contract): {
    status: 'on_time' | 'warning' | 'overdue' | 'completed' | 'no_deadline';
    days: number | null;
    label: string;
    color: string;
  } => {
    if (contract.status === 'completed') {
      return { status: 'completed', days: null, label: 'Completado', color: 'green' };
    }
    if (!contract.end_date) {
      return { status: 'no_deadline', days: null, label: 'Sin fecha límite', color: 'gray' };
    }

    const days = getDaysUntilDeadline(contract.end_date);
    if (days === null) return { status: 'no_deadline', days: null, label: 'Sin fecha límite', color: 'gray' };

    if (days < 0) {
      return { status: 'overdue', days: Math.abs(days), label: `Vencido hace ${Math.abs(days)} días`, color: 'red' };
    } else if (days <= 7) {
      return { status: 'warning', days, label: `Vence en ${days} días`, color: 'orange' };
    } else {
      return { status: 'on_time', days, label: `Vence en ${days} días`, color: 'green' };
    }
  };

  const getCompliancePercentage = (contractId: string): number => {
    const contractTrackings = tracking.filter((t) => t.contract_id === contractId);
    if (contractTrackings.length === 0) return 0;

    const compliant = contractTrackings.filter(
      (t) => t.compliance_status === 'compliant' || t.compliance_status === 'on_time'
    ).length;
    return Math.round((compliant / contractTrackings.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#50504f]">CONTRACT TRACKING</h1>
          <p className="text-gray-600 mt-1">Measurements and deadline compliance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('measurements')}
            className={`${
              activeTab === 'measurements'
                ? 'border-[#cf1b22] text-[#cf1b22]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Ruler className="w-5 h-5" />
            Measurements
          </button>
          <button
            onClick={() => setActiveTab('deadlines')}
            className={`${
              activeTab === 'deadlines'
                ? 'border-[#cf1b22] text-[#cf1b22]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Calendar className="w-5 h-5" />
            Deadline Compliance
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'measurements' && (
        <div>
          <Measurements />
        </div>
      )}

      {activeTab === 'deadlines' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">On Time</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {contracts.filter((c) => getComplianceStatus(c).status === 'on_time').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </Card>

            <Card className="border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Warning</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {contracts.filter((c) => getComplianceStatus(c).status === 'warning').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </Card>

            <Card className="border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {contracts.filter((c) => getComplianceStatus(c).status === 'overdue').length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </Card>

            <Card className="border-l-4 border-gray-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Contracts</p>
                  <p className="text-2xl font-bold text-gray-600 mt-1">{contracts.length}</p>
                </div>
                <FileCheck className="w-8 h-8 text-gray-500" />
              </div>
            </Card>
          </div>

          {/* Contracts List */}
          <div className="space-y-4">
            {contracts.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No contracts found</h3>
                  <p className="text-gray-500">Create contracts to track deadline compliance</p>
                </div>
              </Card>
            ) : (
              contracts.map((contract) => {
                const compliance = getComplianceStatus(contract);
                const compliancePercentage = getCompliancePercentage(contract.id);

                return (
                  <Card key={contract.id} hover>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-[#50504f]">
                              {contract.contract_number}
                            </h3>
                            <Badge variant={contract.status === 'active' ? 'in_progress' : 'completed'}>
                              {contract.status}
                            </Badge>
                            <Badge
                              variant={
                                compliance.status === 'overdue'
                                  ? 'danger'
                                  : compliance.status === 'warning'
                                  ? 'pending'
                                  : compliance.status === 'completed'
                                  ? 'success'
                                  : 'default'
                              }
                            >
                              {compliance.label}
                            </Badge>
                          </div>

                          <p className="text-gray-700 mb-3">{contract.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs">Contractor</p>
                              <p className="font-medium text-[#50504f]">
                                {contract.contractor?.company_name || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Site</p>
                              <p className="font-medium text-[#50504f]">
                                {contract.site?.name || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Start Date</p>
                              <p className="font-medium text-[#50504f]">
                                {new Date(contract.start_date).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">End Date</p>
                              <p className="font-medium text-[#50504f]">
                                {contract.end_date
                                  ? new Date(contract.end_date).toLocaleDateString('es-ES')
                                  : 'No deadline'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-gray-600">Compliance Rate</p>
                              <p className="text-xs font-bold text-[#50504f]">{compliancePercentage}%</p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  compliancePercentage >= 80
                                    ? 'bg-green-500'
                                    : compliancePercentage >= 50
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${compliancePercentage}%` }}
                              ></div>
                            </div>
                          </div>

                          {compliance.days !== null && (
                            <div className="mt-3">
                              <p
                                className={`text-sm font-medium ${
                                  compliance.status === 'overdue'
                                    ? 'text-red-600'
                                    : compliance.status === 'warning'
                                    ? 'text-orange-600'
                                    : 'text-green-600'
                                }`}
                              >
                                {compliance.status === 'overdue' && (
                                  <span className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Contract expired {compliance.days} days ago
                                  </span>
                                )}
                                {compliance.status === 'warning' && (
                                  <span className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Contract expires in {compliance.days} days
                                  </span>
                                )}
                                {compliance.status === 'on_time' && (
                                  <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Contract on track - {compliance.days} days remaining
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-semibold text-[#50504f]">
                            ${contract.total_amount.toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

