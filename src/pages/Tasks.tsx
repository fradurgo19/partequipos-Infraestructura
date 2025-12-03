import { useEffect, useState } from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { Badge } from '../atoms/Badge';
import { Modal } from '../molecules/Modal';
import { StatusIndicator } from '../molecules/StatusIndicator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Task, TaskStatus, Site, User } from '../types';

export const Tasks = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: '',
    requesting_area: '',
    site_id: '',
    assignee_id: '',
    budget_amount: '',
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);

    const [tasksResult, sitesResult, usersResult] = await Promise.all([
      supabase
        .from('tasks')
        .select(`
          *,
          requester:profiles!tasks_requester_id_fkey(id, full_name, role),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, role),
          site:sites(id, name, location)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
      supabase.from('profiles').select('*').order('full_name'),
    ]);

    if (!tasksResult.error && tasksResult.data) {
      setTasks(tasksResult.data);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    if (!usersResult.error && usersResult.data) {
      setUsers(usersResult.data);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const taskData = {
      title: formData.title,
      description: formData.description,
      task_type: formData.task_type,
      requesting_area: formData.requesting_area,
      site_id: formData.site_id || null,
      assignee_id: formData.assignee_id || null,
      budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
      requester_id: profile.id,
      status: 'pending' as TaskStatus,
    };

    const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();

    if (!error && data) {
      await supabase.from('task_timeline').insert([
        {
          task_id: data.id,
          event_type: 'created',
          description: `Task created by ${profile.full_name}`,
          user_id: profile.id,
        },
      ]);

      if (data.budget_amount && data.budget_amount > 10000000) {
        await supabase.from('notifications').insert([
          {
            user_id: profile.id,
            title: 'High Budget Task Created',
            message: `Task "${data.title}" has a budget over $10M and requires Don Pedro's approval`,
            type: 'task',
            reference_id: data.id,
          },
        ]);
      }

      setShowModal(false);
      resetForm();
      loadData();
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!profile) return;

    const updateData: any = { status: newStatus };

    if (newStatus === 'in_progress' && !tasks.find(t => t.id === taskId)?.started_at) {
      updateData.started_at = new Date().toISOString();
    }

    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);

    if (!error) {
      await supabase.from('task_timeline').insert([
        {
          task_id: taskId,
          event_type: newStatus === 'completed' ? 'completed' : 'updated',
          description: `Status changed to ${newStatus}`,
          user_id: profile.id,
        },
      ]);

      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: '',
      requesting_area: '',
      site_id: '',
      assignee_id: '',
      budget_amount: '',
    });
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
          <h1 className="text-3xl font-bold text-[#50504f]">Tasks</h1>
          <p className="text-gray-600 mt-1">Track maintenance tasks and workflows</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Create Task
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cf1b22]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Filter className="text-gray-400 w-5 h-5 my-auto" />
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">
                      {task.title}
                    </h3>
                    <Badge variant={task.status}>{task.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{task.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Type</p>
                      <p className="font-medium text-[#50504f]">{task.task_type}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Requesting Area</p>
                      <p className="font-medium text-[#50504f]">{task.requesting_area}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Requester</p>
                      <p className="font-medium text-[#50504f]">
                        {(task as any).requester?.full_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Assignee</p>
                      <p className="font-medium text-[#50504f]">
                        {(task as any).assignee?.full_name || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  {task.budget_amount && (
                    <div className="mt-3 inline-block bg-green-50 px-3 py-1 rounded-full">
                      <span className="text-sm font-semibold text-green-700">
                        Budget: ${task.budget_amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {(profile?.role === 'infrastructure' ||
                  profile?.role === 'supervision' ||
                  profile?.role === 'admin' ||
                  task.assignee_id === profile?.id) && (
                  <div className="flex gap-2">
                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(task.id, 'in_progress')}
                      >
                        Start
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatusChange(task.id, 'completed')}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                <StatusIndicator status={task.status} showLabel={false} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No tasks found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Create New Task"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="Enter task title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />

          <Textarea
            label="Description"
            placeholder="Describe the task in detail"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Task Type"
              placeholder="e.g. Repair, Maintenance"
              value={formData.task_type}
              onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
              fullWidth
              required
            />
            <Input
              label="Requesting Area"
              placeholder="e.g. Operations, IT"
              value={formData.requesting_area}
              onChange={(e) =>
                setFormData({ ...formData, requesting_area: e.target.value })
              }
              fullWidth
              required
            />
          </div>

          <Select
            label="Site (Optional)"
            value={formData.site_id}
            onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
            options={[
              { value: '', label: 'Select a site' },
              ...sites.map((site) => ({ value: site.id, label: site.name })),
            ]}
            fullWidth
          />

          <Select
            label="Assign To (Optional)"
            value={formData.assignee_id}
            onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
            options={[
              { value: '', label: 'Unassigned' },
              ...users
                .filter(
                  (u) =>
                    u.role === 'infrastructure' ||
                    u.role === 'contractor' ||
                    u.role === 'supervision'
                )
                .map((user) => ({ value: user.id, label: user.full_name })),
            ]}
            fullWidth
          />

          <Input
            label="Budget Amount (Optional)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.budget_amount}
            onChange={(e) =>
              setFormData({ ...formData, budget_amount: e.target.value })
            }
            fullWidth
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" fullWidth>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
