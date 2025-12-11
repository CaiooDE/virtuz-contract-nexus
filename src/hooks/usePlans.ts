import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlanVariable {
  id: string;
  plan_id: string;
  variable_name: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[] | null;
  description: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  base_value: number;
  template_url: string | null;
  created_at: string;
  updated_at: string;
  plan_variables?: PlanVariable[];
}

export interface CreatePlanData {
  name: string;
  base_value: number;
  template_url?: string;
}

export interface CreateVariableData {
  plan_id: string;
  variable_name: string;
  label: string;
  field_type?: string;
  required?: boolean;
  options?: string[];
  description?: string;
}

export interface UpdateVariableData {
  id: string;
  variable_name?: string;
  label?: string;
  field_type?: string;
  required?: boolean;
  options?: string[];
  description?: string;
}

export function usePlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*, plan_variables(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Plan[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (planData: CreatePlanData) => {
      const { data, error } = await supabase
        .from('plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Plano criado',
        description: 'O plano foi criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Plan> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('plans')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Plano atualizado',
        description: 'O plano foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Plano excluído',
        description: 'O plano foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createVariable = useMutation({
    mutationFn: async (data: CreateVariableData) => {
      const { data: result, error } = await supabase
        .from('plan_variables')
        .insert({
          plan_id: data.plan_id,
          variable_name: data.variable_name,
          label: data.label,
          field_type: data.field_type || 'text',
          required: data.required || false,
          options: data.options || null,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Variável criada',
        description: 'A variável foi adicionada ao plano.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar variável',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateVariable = useMutation({
    mutationFn: async ({ id, ...data }: UpdateVariableData) => {
      const { data: result, error } = await supabase
        .from('plan_variables')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Variável atualizada',
        description: 'A variável foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar variável',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteVariable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plan_variables')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Variável excluída',
        description: 'A variável foi removida do plano.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir variável',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    plans: plansQuery.data ?? [],
    isLoading: plansQuery.isLoading,
    error: plansQuery.error,
    refetch: plansQuery.refetch,
    createPlan,
    updatePlan,
    deletePlan,
    createVariable,
    updateVariable,
    deleteVariable,
  };
}
