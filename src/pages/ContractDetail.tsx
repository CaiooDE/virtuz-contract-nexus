import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useContracts } from '@/hooks/useContracts';
import { usePlans } from '@/hooks/usePlans';
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge';
import { Loader2, Download, Eye, Share2, Send, Edit, Copy, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'sent_to_client', label: 'Enviado para Cliente' },
  { value: 'awaiting_signature', label: 'Aguardando Assinatura' },
  { value: 'active', label: 'Ativo' },
  { value: 'expired', label: 'Vencido' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contracts, isLoading, updateContract } = useContracts();
  const { plans } = usePlans();
  const { toast } = useToast();
  
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  const contract = contracts.find((c) => c.id === id);
  const plan = plans.find((p) => p.id === contract?.plan_id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Contrato não encontrado
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const clientFormUrl = `${window.location.origin}/client-form/${contract.client_token}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(clientFormUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência.',
    });
  };

  const handleSendToClient = async () => {
    await updateContract.mutateAsync({
      id: contract.id,
      status: 'sent_to_client',
    });
    setShareDialogOpen(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateContract.mutateAsync({
      id: contract.id,
      status: newStatus as typeof contract.status,
    });
  };

  const customData = contract.custom_data as Record<string, string> | null;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{contract.client_name}</h1>
              <ContractStatusBadge status={contract.status} />
            </div>
            <p className="text-muted-foreground">
              {plan?.name || 'Sem plano'} • Criado em {format(new Date(contract.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            {contract.generated_document_url && (
              <Button variant="outline" asChild>
                <a href={contract.generated_document_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </a>
              </Button>
            )}
            <Button onClick={handleSendToClient}>
              <Send className="h-4 w-4 mr-2" />
              Enviar para Cliente
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data de Início</Label>
                  <p className="font-medium">
                    {format(new Date(contract.start_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data de Término</Label>
                  <p className="font-medium">
                    {format(new Date(contract.end_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Mensal</Label>
                  <p className="font-medium">
                    R$ {Number(contract.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Total</Label>
                  <p className="font-medium">
                    R$ {Number(contract.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Select value={contract.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{contract.client_name}</p>
              </div>
              {contract.client_email && (
                <div>
                  <Label className="text-muted-foreground">E-mail</Label>
                  <p className="font-medium">{contract.client_email}</p>
                </div>
              )}
              {contract.client_phone && (
                <div>
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{contract.client_phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Custom Fields */}
        {customData && Object.keys(customData).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Campos Personalizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(customData).map(([key, value]) => (
                  <div key={key}>
                    <Label className="text-muted-foreground">{key}</Label>
                    <p className="font-medium">{value || '-'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share Link */}
        <Card>
          <CardHeader>
            <CardTitle>Link para Preenchimento pelo Cliente</CardTitle>
            <CardDescription>
              Envie este link para que o cliente preencha os dados do contrato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={clientFormUrl} readOnly className="bg-muted" />
              <Button variant="outline" onClick={handleCopyLink}>
                {linkCopied ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {contract.client_filled_at && (
              <p className="text-sm text-muted-foreground mt-2">
                Preenchido pelo cliente em {format(new Date(contract.client_filled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Document Preview */}
        {contract.generated_document_url && (
          <Card>
            <CardHeader>
              <CardTitle>Documento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href={contract.generated_document_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={contract.generated_document_url} download>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </a>
                </Button>
                <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar com o Cliente</DialogTitle>
            <DialogDescription>
              Copie o link abaixo e envie para o cliente preencher ou visualizar o contrato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Link para preenchimento</Label>
              <div className="flex gap-2 mt-1">
                <Input value={clientFormUrl} readOnly className="bg-muted" />
                <Button variant="outline" onClick={handleCopyLink}>
                  {linkCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
