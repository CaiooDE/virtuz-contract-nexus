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
import { Loader2, Save, Copy, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  
  const plan = plans.find((p) => p.id === planId);
  const variables = plan?.plan_variables ?? [];

  // Load content from template_content or parse from DOCX
  useEffect(() => {
    const loadContent = async () => {
      if (!plan) return;
      
      // If we have valid template_content (not just empty <p></p>), use it
      const hasValidContent = plan.template_content && 
        plan.template_content.trim() !== '' && 
        plan.template_content.trim() !== '<p></p>' &&
        plan.template_content.trim() !== '<p>&nbsp;</p>';
        
      if (hasValidContent) {
        setContent(plan.template_content);
        return;
      }
      
      // If we have a template_url, parse the DOCX
      if (plan.template_url) {
        setLoadingDocx(true);
        setDocxError(null);
        
        try {
          console.log('Calling parse-docx for URL:', plan.template_url);
          const { data, error } = await supabase.functions.invoke('parse-docx', {
            body: { template_url: plan.template_url },
          });
          
          console.log('parse-docx response:', { data, error });
          
          if (error) throw error;
          
          if (data?.html && data.html.trim() !== '<p></p>') {
            setContent(data.html);
            // Auto-save the parsed content to template_content
            await updatePlan.mutateAsync({
              id: plan.id,
              template_content: data.html,
            });
          } else {
            throw new Error('O arquivo DOCX está vazio ou não pôde ser lido');
          }
        } catch (error) {
          console.error('Error parsing DOCX:', error);
          setDocxError(error instanceof Error ? error.message : 'Erro ao carregar o template');
        } finally {
          setLoadingDocx(false);
        }
      }
    };
    
    loadContent();
  }, [plan?.id, plan?.template_content, plan?.template_url]);

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

  // Show message if no template file is uploaded
  if (!plan.template_url && !plan.template_content) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhum template anexado</h2>
              <p className="text-muted-foreground mb-4">
                Para editar o conteúdo do template, primeiro faça o upload de um arquivo .docx nas configurações do plano.
              </p>
              <Button onClick={() => navigate('/settings')}>
                Ir para Configurações
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Show loading state while parsing DOCX
  if (loadingDocx) {
    return (
      <AppLayout>
        <div className="p-6 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Carregando conteúdo do template...</p>
        </div>
      </AppLayout>
    );
  }

  // Show error if DOCX parsing failed
  if (docxError) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="border-destructive">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Erro ao carregar template</h2>
              <p className="text-muted-foreground mb-4">{docxError}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate('/settings')}>
                  Voltar às Configurações
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              </div>
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
