import React, { useState, useEffect } from 'react';
import { UserPlus, Users as UsersIcon, Trash2, Shield, User as UserIcon, Edit2 } from 'lucide-react';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { UserProfile, UserRole } from '../types';
import { PAGOS_API } from '../config';

interface NewUserForm {
  email: string;
  password: string;
  fullName: string;
  location: string;
  department: string;
  role: UserRole;
}

const initialForm: NewUserForm = {
  email: '',
  password: '',
  fullName: '',
  location: '',
  department: '',
  role: 'basic_user'
};

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NewUserForm>(initialForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const isEditing = editingUserId !== null;

  const locationOptions = [
    { value: 'ITAGUI CL 30 NRO. 41-30', label: 'ITAGUI CL 30 NRO. 41-30' },
    { value: 'MEDELLIN ALMACEN PALACE. CRA 50 NRO.35-32', label: 'MEDELLIN ALMACEN PALACE. CRA 50 NRO.35-32' },
    { value: 'SEDE LUBRICANTES CL 29 NRO 41-65', label: 'SEDE LUBRICANTES CL 29 NRO 41-65' },
    { value: 'CALI CALLE 15 NRO. 38-21 LOCAL 1 y 2 yumbo', label: 'CALI CALLE 15 NRO. 38-21 LOCAL 1 y 2 yumbo' },
    { value: 'BARRANQUILLA CL 110 NRO.10-427 BODEGA NRO. 8', label: 'BARRANQUILLA CL 110 NRO.10-427 BODEGA NRO. 8' },
    { value: 'BARRANQUILLA CALLE 110 NRO. 10-427 BODEGA NRO. 7', label: 'BARRANQUILLA CALLE 110 NRO. 10-427 BODEGA NRO. 7' },
    { value: 'BOGOTA SEDE NUEVA CRA68D Nro.17A - 84', label: 'BOGOTA SEDE NUEVA CRA68D Nro.17A - 84' },
    { value: 'SEXTA CALLE 6 NRO. 26 -7 3 BOGOTA', label: 'SEXTA CALLE 6 NRO. 26 -7 3 BOGOTA' },
    { value: 'BUCARAMANGA KM 7 VIA GIRON NRO. 4-80', label: 'BUCARAMANGA KM 7 VIA GIRON NRO. 4-80' },
    { value: 'MQ BOGOTA DG 16 NRO. 96G- 85', label: 'MQ BOGOTA DG 16 NRO. 96G- 85' },
    { value: 'MAQUINARIA GUARNE KM26+800 MTS AUT. MED. B', label: 'MAQUINARIA GUARNE KM26+800 MTS AUT. MED. B' },
    { value: 'CAUCASIA CRA 20 2-170 LC 101 MALL LAS PALMAS', label: 'CAUCASIA CRA 20 2-170 LC 101 MALL LAS PALMAS' },
    { value: 'CAUCASIA CRA 20 NRO.3 A - 29', label: 'CAUCASIA CRA 20 NRO.3 A - 29' },
    { value: 'MONTERIA CRA 17 NRO. 76-94 BOSQUES DE SEVILLA', label: 'MONTERIA CRA 17 NRO. 76-94 BOSQUES DE SEVILLA' },
    { value: 'EL PORTAL. CALLE 35ASUR NRO. 45B -66', label: 'EL PORTAL. CALLE 35ASUR NRO. 45B -66' },
    { value: 'EL PORTAL. CALLE 35ASUR NRO. 45B -52', label: 'EL PORTAL. CALLE 35ASUR NRO. 45B -52' },
    { value: 'ISTMINA BOMBA ZEUZ LA 70 ALM ERA EN MVTO', label: 'ISTMINA BOMBA ZEUZ LA 70 ALM ERA EN MVTO' },
    { value: 'IBAGUE', label: 'IBAGUE' },
    { value: 'CALLE 70 SUR NRO. 43A - 15 INT 2404 CANTO LUNA', label: 'CALLE 70 SUR NRO. 43A - 15 INT 2404 CANTO LUNA' },
    { value: 'BOGOTA APTO LA RIVIERA CL 23 NRO.72-91 APT 701', label: 'BOGOTA APTO LA RIVIERA CL 23 NRO.72-91 APT 701' }
  ];

  const roleOptions = [
    { value: 'basic_user', label: 'Usuario Básico' },
    { value: 'area_coordinator', label: 'Coordinador de Área' }
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pagos_auth_token');
      const response = await fetch(`${PAGOS_API}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('👥 Usuarios cargados:', data);
        setUsers(data);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof NewUserForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError('');
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setFormData({
      email: user.email,
      password: '', // No mostramos la contraseña actual
      fullName: user.fullName,
      location: user.location || '',
      department: user.department || '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setFormData(initialForm);
    setShowForm(false);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validaciones
    if (!formData.fullName || !formData.location) {
      setFormError('Por favor completa todos los campos obligatorios');
      return;
    }

    if (!isEditing && !formData.email) {
      setFormError('El email es obligatorio');
      return;
    }

    if (!isEditing && formData.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (isEditing && formData.password && formData.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setFormLoading(true);
    try {
      const token = localStorage.getItem('pagos_auth_token');
      
      if (isEditing) {
        // Actualizar usuario
        const updateData: Partial<NewUserForm> = {
          fullName: formData.fullName,
          location: formData.location,
          department: formData.department,
          role: formData.role
        };
        
        // Solo incluir contraseña si se proporcionó una nueva
        if (formData.password) {
          updateData.password = formData.password;
        }

        const response = await fetch(`${PAGOS_API}/users/${editingUserId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          handleCancelEdit();
          loadUsers();
        } else {
          const error = await response.json();
          setFormError(error.error || 'Error al actualizar usuario');
        }
      } else {
        // Crear nuevo usuario
        const response = await fetch(`${PAGOS_API}/users/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            location: formData.location,
            department: formData.department,
            role: formData.role
          })
        });

        if (response.ok) {
          setFormData(initialForm);
          setShowForm(false);
          loadUsers();
        } else {
          const error = await response.json();
          setFormError(error.error || 'Error al crear usuario');
        }
      }
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      setFormError(isEditing ? 'Error al actualizar usuario' : 'Error al crear usuario');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario ${userEmail}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('pagos_auth_token');
      const response = await fetch(`${PAGOS_API}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        loadUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario');
    }
  };

  const getRoleBadge = (role: UserRole | undefined | null) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1';
    const neutralBadge = `${baseClasses} bg-[#f1f1f1] text-[#50504f]`;
    const highlightBadge = `${baseClasses} bg-[#fdebec] text-[#cf1b22]`;

    if (!role) {
      return (
        <span className={neutralBadge}>
          <UserIcon className="w-3 h-3 inline" />
          Sin rol
        </span>
      );
    }
    
    return role === 'area_coordinator' ? (
      <span className={highlightBadge}>
        <Shield className="w-3 h-3 inline" />
        Coordinador
      </span>
    ) : (
      <span className={neutralBadge}>
        <UserIcon className="w-3 h-3 inline" />
        Usuario
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Elegante */}
      <div className="bg-gradient-to-r from-[#cf1b22] via-[#a11217] to-[#50504f] rounded-2xl shadow-2xl p-8 border border-[#cf1b22]/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Gestión de Usuarios</h1>
            <p className="text-white/80 text-lg">Administración y control de usuarios del sistema</p>
          </div>
          <button 
            onClick={() => showForm ? handleCancelEdit() : setShowForm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#cf1b22] to-[#a11217] hover:from-[#b2181d] hover:to-[#7f0c12] text-white rounded-xl transition-all shadow-lg font-medium"
          >
            <UserPlus className="w-5 h-5" />
            <span>{showForm ? 'Cancelar' : 'Nuevo Usuario'}</span>
          </button>
        </div>
      </div>

      {/* Estadística */}
      <Card>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-[#fdebec] rounded-lg">
            <UsersIcon className="w-6 h-6 text-[#cf1b22]" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total de Usuarios</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
        </div>
      </Card>

      {/* Formulario de nuevo/editar usuario */}
      {showForm && (
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h2>
          
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Correo Electrónico *"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="usuario@ejemplo.com"
                required={!isEditing}
                disabled={isEditing}
              />

              <Input
                label={isEditing ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={isEditing ? 'Dejar vacío para mantener actual' : 'Mínimo 6 caracteres'}
                required={!isEditing}
              />

              <Input
                label="Nombre Completo *"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Juan Pérez"
                required
              />

              <Select
                label="Ubicación *"
                value={formData.location}
                options={locationOptions}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Seleccione una ubicación"
                required
              />

              <Input
                label="Departamento"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="Contabilidad, TI, etc."
              />

              <Select
                label="Rol *"
                value={formData.role}
                options={roleOptions}
                onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={formLoading}>
                {isEditing ? (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Actualizar Usuario
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Crear Usuario
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de usuarios */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-[#cf1b22] hover:text-[#7f0c12]"
                          aria-label="Editar usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          className="text-red-600 hover:text-red-900"
                          aria-label="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

