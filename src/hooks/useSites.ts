import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Site } from '../types';

// Query keys
export const siteKeys = {
  all: ['sites'] as const,
  lists: () => [...siteKeys.all, 'list'] as const,
  list: (filters: string) => [...siteKeys.lists(), { filters }] as const,
  details: () => [...siteKeys.all, 'detail'] as const,
  detail: (id: string) => [...siteKeys.details(), id] as const,
};

// Fetch all sites
export const useSites = () => {
  return useQuery({
    queryKey: siteKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*, created_by:profiles!sites_created_by_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Site[];
    },
  });
};

// Fetch single site
export const useSite = (id: string) => {
  return useQuery({
    queryKey: siteKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*, created_by:profiles!sites_created_by_fkey(full_name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Site;
    },
    enabled: !!id,
  });
};

// Create site mutation
export const useCreateSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (siteData: Omit<Site, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('sites').insert([siteData]).select().single();
      if (error) throw error;
      return data as Site;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
    },
  });
};

// Update site mutation
export const useUpdateSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...siteData }: Partial<Site> & { id: string }) => {
      const { data, error } = await supabase
        .from('sites')
        .update(siteData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Site;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(data.id) });
    },
  });
};

// Delete site mutation
export const useDeleteSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sites').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
    },
  });
};

