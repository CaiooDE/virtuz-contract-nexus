import { useState } from 'react';
import { Plus, Trash2, Upload, GripVertical, X } from 'lucide-react';
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
import { usePlans } from '@/hooks/usePlans';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AVAILABLE_VARIABLES = [
  { name: 'client_name', label: 'Nome do Cliente' },
  { name: 'client_email', label: 'E-mail do Cliente' },
  { name: 'client_phone', label: 'Telefone do Cliente' },
  { name: 'contract_value', label: 'Valor do Contrato' },
  { name: 'start_date', label: 'Data de Início' },
  { name: 'end_date', label: 'Data de Término' },
  { name: 'company_name', label: 'Razão Social' },
  { name: 'cnpj', label: 'CNPJ' },
  { name: 'address', label: 'Endereço' },
  { name: 'custom_field', label: 'Campo Personalizado' },
];

export default function PlansSettings() {
  const { plans, isLoading, createPlan, deletePlan, createVariable, deleteVariable } = usePlans();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', base_value: '' });
  const [uploading, setUploading] = useState<string | null>(null);
  const [draggedVariable, setDraggedVariable] = useState<string | null>(null);

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

      await supabase
        .from('plans')
        .update({ template_url: publicUrl })
        .eq('id', planId);

      toast({
        title: 'Template enviado',
        description: 'O arquivo foi associado ao plano com sucesso.',
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

  const handleDragStart = (variableName: string) => {
    setDraggedVariable(variableName);
  };

  const handleDragEnd = () => {
    setDraggedVariable(null);
  };

  const handleDrop = async (planId: string) => {
    if (!draggedVariable) return;

    const variable = AVAILABLE_VARIABLES.find((v) => v.name === draggedVariable);
    if (!variable) return;

    // Check if variable already exists for this plan
    const plan = plans.find((p) => p.id === planId);
    const exists = plan?.plan_variables?.some((v) => v.variable_name === variable.name);

    if (exists) {
      toast({
        title: 'Variável já existe',
        description: 'Esta variável já foi adicionada a este plano.',
        variant: 'destructive',
      });
      return;
    }

    await createVariable.mutateAsync({
      plan_id: planId,
      variable_name: variable.name,
      label: variable.label,
    });

    setDraggedVariable(null);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Variables Palette */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Variáveis Disponíveis</CardTitle>
              <CardDescription>
                Arraste e solte nos planos para adicionar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {AVAILABLE_VARIABLES.map((variable) => (
                <div
                  key={variable.name}
                  draggable
                  onDragStart={() => handleDragStart(variable.name)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-2 p-2 border rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <code className="text-xs bg-muted px-1 rounded">{`{{${variable.name}}}`}</code>
                  <span className="text-sm">{variable.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Plans List */}
          <div className="lg:col-span-2 space-y-4">
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
              plans.map((plan) => (
                <Card
                  key={plan.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(plan.id)}
                  className={draggedVariable ? 'ring-2 ring-primary ring-dashed' : ''}
                >
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
                      <div className="flex gap-2 mt-1">
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
                          {plan.template_url ? 'Substituir Template' : 'Enviar Template'}
                        </Button>
                        {plan.template_url && (
                          <Badge variant="secondary" className="h-8 px-2">
                            Template vinculado
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Variables */}
                    <div>
                      <Label>Variáveis do Plano</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {plan.plan_variables?.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Arraste variáveis aqui para adicionar
                          </p>
                        ) : (
                          plan.plan_variables?.map((variable) => (
                            <Badge key={variable.id} variant="outline" className="gap-1">
                              {`{{${variable.variable_name}}}`}
                              <button
                                onClick={() => deleteVariable.mutate(variable.id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
