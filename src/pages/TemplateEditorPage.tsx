import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import { usePlans } from '@/hooks/usePlans';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function TemplateEditorPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { plans, isLoading, updatePlan, createPlan } = usePlans();
  const { toast } = useToast();
  
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveAsNewDialogOpen, setSaveAsNewDialogOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  
  const plan = plans.find((p) => p.id === planId);
  const variables = plan?.plan_variables ?? [];

  useEffect(() => {
    if (plan?.template_content) {
      setContent(plan.template_content);
    }
  }, [plan]);

  const handleSave = async () => {
    if (!planId) return;
    
    setSaving(true);
    try {
      await updatePlan.mutateAsync({
        id: planId,
        template_content: content,
      });
      toast({
        title: 'Template salvo',
        description: 'O conteúdo do template foi atualizado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar o template.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!newPlanName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe um nome para o novo template.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const newPlan = await createPlan.mutateAsync({
        name: newPlanName,
        base_value: plan?.base_value || 0,
        template_content: content,
      });
      
      toast({
        title: 'Novo template criado',
        description: `O template "${newPlanName}" foi criado com sucesso.`,
      });
      
      setSaveAsNewDialogOpen(false);
      setNewPlanName('');
      navigate(`/settings/plans/${newPlan.id}/template`);
    } catch (error) {
      toast({
        title: 'Erro ao criar',
        description: 'Ocorreu um erro ao criar o novo template.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!plan) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Plano não encontrado
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Editor de Template</h1>
            <p className="text-muted-foreground">
              {plan.name} - Posicione as variáveis no documento
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSaveAsNewDialogOpen(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Salvar como Novo
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Template
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conteúdo do Template</CardTitle>
            <CardDescription>
              Escreva o texto do contrato e arraste as variáveis da lista à direita para posicioná-las no documento.
              Use a sintaxe {`{{nome_variavel}}`} para inserir variáveis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateEditor
              content={content}
              onChange={setContent}
              variables={variables}
            />
          </CardContent>
        </Card>

        {variables.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>Este plano não possui variáveis cadastradas.</p>
              <Button
                variant="link"
                onClick={() => navigate('/settings')}
                className="mt-2"
              >
                Adicionar variáveis nas configurações
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save As New Dialog */}
      <Dialog open={saveAsNewDialogOpen} onOpenChange={setSaveAsNewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como Novo Template</DialogTitle>
            <DialogDescription>
              Crie um novo plano com base neste template
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-plan-name">Nome do Novo Plano</Label>
            <Input
              id="new-plan-name"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="Ex: Plano Personalizado"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsNewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAsNew} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Novo Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
