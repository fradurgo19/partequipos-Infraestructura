import { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export const Users = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('internal_client');

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadUsers();
    }
  }, [profile]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');

    if (!error && data) {
      setUsers(data as User[]);
    }
    setLoading(false);
  };

  const handleRoleUpdate = async () => {
    if (!editingUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: selectedRole })
      .eq('id', editingUser.id);

    if (!error) {
      setShowModal(false);
      setEditingUser(null);
      loadUsers();
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-purple-500',
      infrastructure: 'bg-blue-500',
      supervision: 'bg-green-500',
      contractor: 'bg-orange-500',
      internal_client: 'bg-gray-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      admin: 'Administrator',
      infrastructure: 'Infrastructure',
      supervision: 'Supervision',
      contractor: 'Contractor',
      internal_client: 'Internal Client',
    };
    return labels[role] || role;
  };

  if (profile?.role !== 'admin') {
    return (
      <Card>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Access Denied</h3>
          <p className="text-gray-500">You need administrator privileges to access this module</p>
        </div>
      </Card>
    );
  }

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
          <h1 className="text-3xl font-bold text-[#50504f]">Users & Roles</h1>
          <p className="text-gray-600 mt-1">Manage users and role assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#cf1b22] rounded-full flex items-center justify-center text-white font-semibold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-[#50504f]">{user.full_name}</h3>
                  <p className="text-gray-600 text-sm">{user.email}</p>
                  {user.department && (
                    <p className="text-gray-500 text-xs mt-1">{user.department}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getRoleBadge(user.role)}>{getRoleLabel(user.role)}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingUser(user);
                    setSelectedRole(user.role);
                    setShowModal(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Role
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
        }}
        title="Edit User Role"
      >
        <div className="space-y-4">
          {editingUser && (
            <>
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>User:</strong> {editingUser.full_name}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Email:</strong> {editingUser.email}
                </p>
              </div>

              <Select
                label="Role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                options={[
                  { value: 'admin', label: 'Administrator' },
                  { value: 'infrastructure', label: 'Infrastructure' },
                  { value: 'supervision', label: 'Supervision' },
                  { value: 'contractor', label: 'Contractor' },
                  { value: 'internal_client', label: 'Internal Client' },
                ]}
                fullWidth
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button fullWidth onClick={handleRoleUpdate}>
                  Update Role
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

