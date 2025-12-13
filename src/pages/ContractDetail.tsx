import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useContracts } from '@/hooks/useContracts';
import { usePlans } from '@/hooks/usePlans';
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge';
import { Loader2, Edit, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

const CONTRACT_CATEGORY_LABELS: Record<string, string> = {
  client: 'Cliente',
  service_provider_pj: 'Prestador de Serviço (PJ)',
  service_provider_pf: 'Prestador de Serviço (PF)',
  vendor_service: 'Serviços Contratados',
  partnership: 'Parceria',
  other: 'Outro',
};

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contracts, isLoading, updateContract } = useContracts();
  const { plans } = usePlans();
  const contract = contracts.find((c) => c.id === id);
  const plan = plans.find((p) => p.id === contract?.plan_id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const contractCategory = (contract as any).contract_category || 'client';

  const handleStatusChange = async (newStatus: string) => {
    await updateContract.mutateAsync({
      id: contract.id,
      status: newStatus as typeof contract.status,
    });
  };

  const customData = contract.custom_data as Record<string, string> | null;

  // Generate filled template content
  const getFilledTemplateContent = () => {
    if (!plan?.template_content) return '';
    
    let filledContent = plan.template_content;
    
    // Replace custom variables
    if (customData) {
      Object.entries(customData).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        filledContent = filledContent.replace(regex, value || `{{${key}}}`);
      });
    }
    
    // Replace common contract variables
    filledContent = filledContent.replace(/\{\{client_name\}\}/g, contract.client_name || '{{client_name}}');
    filledContent = filledContent.replace(/\{\{start_date\}\}/g, contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : '{{start_date}}');
    filledContent = filledContent.replace(/\{\{end_date\}\}/g, contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : '{{end_date}}');
    filledContent = filledContent.replace(/\{\{monthly_value\}\}/g, contract.monthly_value ? `R$ ${Number(contract.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '{{monthly_value}}');
    filledContent = filledContent.replace(/\{\{total_value\}\}/g, contract.total_value ? `R$ ${Number(contract.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '{{total_value}}');
    
    return filledContent;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative">
            <div className="absolute -left-6 top-0 w-1 h-full gradient-primary rounded-r" />
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{contract.client_name}</h1>
              <ContractStatusBadge status={contract.status} />
            </div>
            <p className="text-muted-foreground">
              {plan?.name || 'Sem plano'} • {CONTRACT_CATEGORY_LABELS[contractCategory]} • Criado em {format(new Date(contract.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contract Info */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Informações do Contrato
              </CardTitle>
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
                  <p className="font-medium text-primary">
                    R$ {Number(contract.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Total</Label>
                  <p className="font-medium text-primary">
                    R$ {Number(contract.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Categoria</Label>
                <p className="font-medium">{CONTRACT_CATEGORY_LABELS[contractCategory]}</p>
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
          <Card className="border-t-4 border-t-accent-foreground">
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
                  <div key={key} className="p-3 bg-accent/30 rounded-lg">
                    <Label className="text-muted-foreground text-xs">{key}</Label>
                    <p className="font-medium">{value || '-'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}


        {plan?.template_content && (
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documento do Contrato
              </CardTitle>
              <CardDescription>
                Contrato preenchido com as variáveis substituídas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg p-6 bg-card prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: getFilledTemplateContent() }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}