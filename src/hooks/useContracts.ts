import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export type ContractStatus = 'draft' | 'sent_to_client' | 'awaiting_signature' | 'active' | 'expired' | 'cancelled';

export interface Contract {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  plan_id: string | null;
  status: ContractStatus;
  start_date: string;
  end_date: string;
  monthly_value: number | null;
  total_value: number;
  custom_data: Record<string, unknown>;
  generated_document_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client_token: string | null;
  client_filled_at: string | null;
  plans?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateContractData {
  client_name: string;
  client_email?: string;
  client_phone?: string;
  plan_id?: string;
  start_date: string;
  end_date: string;
  monthly_value?: number;
  total_value: number;
  custom_data?: Record<string, unknown>;
  status?: ContractStatus;
  generated_document_url?: string;
}

export function useContracts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('contracts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contracts'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-chart'] });
          queryClient.invalidateQueries({ queryKey: ['expiring-contracts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, plans(id, name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Contract[];
    },
  });

  const createContract = useMutation({
    mutationFn: async (contractData: CreateContractData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          client_name: contractData.client_name,
          client_email: contractData.client_email,
          client_phone: contractData.client_phone,
          plan_id: contractData.plan_id,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          monthly_value: contractData.monthly_value,
          total_value: contractData.total_value,
          custom_data: contractData.custom_data as unknown as Record<string, never>,
          created_by: user?.id,
          status: contractData.status || 'draft',
          generated_document_url: contractData.generated_document_url,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-chart'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-contracts'] });
      toast({
        title: 'Contrato criado',
        description: 'O contrato foi criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; status?: ContractStatus; generated_document_url?: string }) => {
      const { data: result, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-chart'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-contracts'] });
      toast({
        title: 'Contrato atualizado',
        description: 'O contrato foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: 'Contrato excluído',
        description: 'O contrato foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    contracts: contractsQuery.data ?? [],
    isLoading: contractsQuery.isLoading,
    error: contractsQuery.error,
    createContract,
    updateContract,
    deleteContract,
  };
}
