import { useState } from 'react';
import { Plus, Trash2, Upload, GripVertical, X, Edit2, FileText, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePlans, PlanVariable } from '@/hooks/usePlans';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { VariableFormDialog } from '@/components/plans/VariableFormDialog';

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  email: 'E-mail',
  phone: 'Telefone',
  currency: 'Moeda',
  textarea: 'Texto Longo',
  select: 'Seleção',
};

export default function PlansSettings() {
  const { plans, isLoading, createPlan, deletePlan, createVariable, updateVariable, deleteVariable, updatePlan, refetch } = usePlans();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', base_value: '' });
  const [uploading, setUploading] = useState<string | null>(null);
  const [draggedVariable, setDraggedVariable] = useState<string | null>(null);
  
  // Variable dialog state
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [variableDialogMode, setVariableDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [editingVariable, setEditingVariable] = useState<PlanVariable | null>(null);

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.base_value) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    await createPlan.mutateAsync({
      name: newPlan.name,
      base_value: parseFloat(newPlan.base_value),
    });

    setNewPlan({ name: '', base_value: '' });
    setIsDialogOpen(false);
  };

  const sanitizeFileName = (name: string) => {
    const [base, extension] = name.split(/\.(?=[^.]+$)/);
    const normalized = base
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_');

    return `${normalized}${extension ? `.${extension}` : ''}`;
  };

  const getFileNameFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const parts = url.split('/');
      const fileName = parts[parts.length - 1];
      // Remove timestamp prefix if exists
      const nameWithoutTimestamp = fileName.replace(/^\d+_/, '');
      return decodeURIComponent(nameWithoutTimestamp);
    } catch {
      return null;
    }
  };

  const handleFileUpload = async (planId: string, file: File) => {
    if (!file.name.endsWith('.docx')) {
      toast({
        title: 'Erro',
        description: 'Apenas arquivos .docx são permitidos',
        variant: 'destructive',
      });
      return;
    }

    setUploading(planId);

    try {
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${planId}/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('templates')
        .getPublicUrl(fileName);

      await updatePlan.mutateAsync({
        id: planId,
        template_url: publicUrl,
      });

      await refetch();

      toast({
        title: 'Template enviado',
        description: `Arquivo "${file.name}" foi associado ao plano com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Erro ao enviar arquivo',
        variant: 'destructive',
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDragStart = (planId: string) => {
    setDraggedVariable(planId);
  };

  const handleDragEnd = () => {
    setDraggedVariable(null);
  };

  const handleOpenCreateVariable = (planId: string) => {
    setSelectedPlanId(planId);
    setEditingVariable(null);
    setVariableDialogMode('create');
    setVariableDialogOpen(true);
  };

  const handleOpenEditVariable = (variable: PlanVariable) => {
    setSelectedPlanId(variable.plan_id);
    setEditingVariable(variable);
    setVariableDialogMode('edit');
    setVariableDialogOpen(true);
  };

  const handleVariableSubmit = async (data: {
    variable_name: string;
    label: string;
    field_type: string;
    required: boolean;
    options?: string[];
    description?: string;
  }) => {
    if (variableDialogMode === 'create' && selectedPlanId) {
      await createVariable.mutateAsync({
        plan_id: selectedPlanId,
        ...data,
      });
    } else if (variableDialogMode === 'edit' && editingVariable) {
      await updateVariable.mutateAsync({
        id: editingVariable.id,
        ...data,
      });
    }
    setVariableDialogOpen(false);
    setEditingVariable(null);
    setSelectedPlanId(null);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie planos, templates e variáveis
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Plano</DialogTitle>
                <DialogDescription>
                  Adicione um novo plano de contrato
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="plan-name">Nome do Plano</Label>
                  <Input
                    id="plan-name"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Ex: Plano Básico"
                  />
                </div>
                <div>
                  <Label htmlFor="plan-value">Valor Base (R$)</Label>
                  <Input
                    id="plan-value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPlan.base_value}
                    onChange={(e) => setNewPlan({ ...newPlan, base_value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePlan} disabled={createPlan.isPending}>
                  {createPlan.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Plano
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </CardContent>
            </Card>
          ) : plans.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum plano cadastrado. Crie o primeiro plano.
              </CardContent>
            </Card>
          ) : (
            plans.map((plan) => {
              const templateFileName = getFileNameFromUrl(plan.template_url);
              
              return (
                <Card key={plan.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>
                          Valor base: R$ {Number(plan.base_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deletePlan.mutate(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Template Upload */}
                    <div>
                      <Label>Template (.docx)</Label>
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex gap-2 items-center">
                          <Input
                            type="file"
                            accept=".docx"
                            className="hidden"
                            id={`template-${plan.id}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(plan.id, file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`template-${plan.id}`)?.click()}
                            disabled={uploading === plan.id}
                          >
                            {uploading === plan.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {plan.template_url ? 'Substituir' : 'Enviar'} Template
                          </Button>
                        </div>
                        {plan.template_url && templateFileName && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm flex-1 truncate">{templateFileName}</span>
                            <a
                              href={plan.template_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Variables */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Variáveis do Plano</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCreateVariable(plan.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Nova Variável
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.plan_variables?.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma variável cadastrada. Clique em "Nova Variável" para adicionar.
                          </p>
                        ) : (
                          plan.plan_variables?.map((variable) => (
                            <div
                              key={variable.id}
                              draggable
                              onDragStart={() => handleDragStart(variable.id)}
                              onDragEnd={handleDragEnd}
                              className="flex items-center gap-1 p-2 border rounded-lg bg-card cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
                            >
                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                              <code className="text-xs bg-muted px-1 rounded">{`{{${variable.variable_name}}}`}</code>
                              <Badge variant="outline" className="text-xs ml-1">
                                {FIELD_TYPE_LABELS[variable.field_type] || variable.field_type}
                              </Badge>
                              {variable.required && (
                                <Badge variant="secondary" className="text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                              <button
                                onClick={() => handleOpenEditVariable(variable)}
                                className="ml-1 p-1 hover:bg-muted rounded"
                              >
                                <Edit2 className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => deleteVariable.mutate(variable.id)}
                                className="p-1 hover:bg-destructive/10 rounded"
                              >
                                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Dica: Arraste as variáveis para o documento .docx e use a sintaxe {`{{nome_variavel}}`} no template.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Variable Form Dialog */}
      <VariableFormDialog
        open={variableDialogOpen}
        onOpenChange={setVariableDialogOpen}
        onSubmit={handleVariableSubmit}
        initialData={editingVariable ? {
          variable_name: editingVariable.variable_name,
          label: editingVariable.label,
          field_type: editingVariable.field_type,
          required: editingVariable.required,
          options: editingVariable.options,
          description: editingVariable.description,
        } : undefined}
        isLoading={createVariable.isPending || updateVariable.isPending}
        mode={variableDialogMode}
      />
    </AppLayout>
  );
}
