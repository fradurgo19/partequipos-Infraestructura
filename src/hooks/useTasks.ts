import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Task, TaskStatus } from '../types';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: { status?: string; search?: string }) =>
    [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Fetch all tasks
export const useTasks = (filters?: { status?: string; search?: string }) => {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(
          `*,
          requester:profiles!tasks_requester_id_fkey(id, full_name, role),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, role),
          site:sites(id, name, location)`
        )
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
  });
};

// Fetch single task
export const useTask = (id: string) => {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `*,
          requester:profiles!tasks_requester_id_fkey(id, full_name, role),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, role),
          site:sites(id, name, location)`
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Task;
    },
    enabled: !!id,
  });
};

// Create task mutation
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();
      if (error) throw error;

      // Create timeline entry
      await supabase.from('task_timeline').insert([
        {
          task_id: data.id,
          event_type: 'created',
          description: `Task created`,
          user_id: taskData.requester_id,
        },
      ]);

      // Create notification for high budget tasks
      if (taskData.budget_amount && taskData.budget_amount > 10000000) {
        await supabase.from('notifications').insert([
          {
            user_id: taskData.requester_id,
            title: 'High Budget Task Created',
            message: `Task "${taskData.title}" has a budget over $10M and requires Don Pedro's approval`,
            type: 'task',
            reference_id: data.id,
          },
        ]);
      }

      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
};

// Update task status mutation
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      userId,
    }: {
      id: string;
      status: TaskStatus;
      userId: string;
    }) => {
      const updateData: any = { status };

      if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create timeline entry
      await supabase.from('task_timeline').insert([
        {
          task_id: id,
          event_type: status === 'completed' ? 'completed' : 'updated',
          description: `Status changed to ${status}`,
          user_id: userId,
        },
      ]);

      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) });
    },
  });
};

// Delete task mutation
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
};

