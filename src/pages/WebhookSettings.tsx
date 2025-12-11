import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Check, Webhook, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  description: string | null;
  is_active: boolean;
  secret_key: string | null;
  created_at: string;
}

export default function WebhookSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    description: '',
  });

  const webhooksQuery = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WebhookEndpoint[];
    },
  });

  const createWebhook = useMutation({
    mutationFn: async (data: { name: string; url: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from('webhook_endpoints')
        .insert({
          name: data.name,
          url: data.url,
          description: data.description || null,
          secret_key: crypto.randomUUID(),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Webhook criado',
        description: 'O endpoint foi criado com sucesso.',
      });
      setIsDialogOpen(false);
      setNewWebhook({ name: '', url: '', description: '' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar webhook',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleWebhook = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('webhook_endpoints')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Webhook excluído',
        description: 'O endpoint foi excluído com sucesso.',
      });
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome e a URL do webhook',
        variant: 'destructive',
      });
      return;
    }
    createWebhook.mutate(newWebhook);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Integrações</h1>
            <p className="text-muted-foreground">
              Configure webhooks para automação com ferramentas externas
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Webhook</DialogTitle>
                <DialogDescription>
                  Adicione um endpoint para receber dados de plataformas externas como Make, Zapier ou Clickup
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="webhook-name">Nome</Label>
                  <Input
                    id="webhook-name"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    placeholder="Ex: Clickup - Novos Contratos"
                  />
                </div>
                <div>
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <Input
                    id="webhook-url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    placeholder="https://hook.make.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="webhook-description">Descrição (opcional)</Label>
                  <Input
                    id="webhook-description"
                    value={newWebhook.description}
                    onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
                    placeholder="Descrição do propósito deste webhook"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateWebhook} disabled={createWebhook.isPending}>
                  {createWebhook.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Webhook
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Webhook className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Como usar webhooks</p>
                <p className="text-sm text-muted-foreground">
                  Configure webhooks para criar contratos automaticamente a partir de plataformas como 
                  <strong> Make</strong>, <strong>Zapier</strong> ou <strong>Clickup</strong>. 
                  Quando um evento ocorrer nessas plataformas, os dados serão enviados para cá e um novo contrato 
                  será criado automaticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhooks List */}
        <div className="space-y-4">
          {webhooksQuery.isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </CardContent>
            </Card>
          ) : webhooksQuery.data?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum webhook configurado. Crie o primeiro para começar a automatizar.
              </CardContent>
            </Card>
          ) : (
            webhooksQuery.data?.map((webhook) => (
              <Card key={webhook.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{webhook.name}</CardTitle>
                        <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                          {webhook.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      {webhook.description && (
                        <CardDescription>{webhook.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={(checked) => 
                          toggleWebhook.mutate({ id: webhook.id, is_active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteWebhook.mutate(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">URL do Endpoint</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-muted rounded text-sm truncate">
                        {webhook.url}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(webhook.url, `url-${webhook.id}`)}
                      >
                        {copiedId === `url-${webhook.id}` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <a href={webhook.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                  {webhook.secret_key && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Chave Secreta</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                          {webhook.secret_key}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(webhook.secret_key!, `secret-${webhook.id}`)}
                        >
                          {copiedId === `secret-${webhook.id}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
