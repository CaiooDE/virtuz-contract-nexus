import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useContracts, ContractStatus } from '@/hooks/useContracts';
import { usePlans } from '@/hooks/usePlans';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import { addMonths, format } from 'date-fns';

export default function NewContract() {
  const navigate = useNavigate();
  const { createContract } = useContracts();
  const { plans, isLoading: plansLoading } = usePlans();
  const { toast } = useToast();

  const [isExistingContract, setIsExistingContract] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    plan_id: '',
    start_date: '',
    duration_months: '12',
    end_date: '',
    monthly_value: '',
    total_value: '',
    custom_data: {} as Record<string, string>,
    status: 'draft' as ContractStatus,
    contract_category: 'client',
  });

  const selectedPlan = plans.find((p) => p.id === formData.plan_id);
  const planVariables = selectedPlan?.plan_variables ?? [];

  useEffect(() => {
    if (selectedPlan) {
      // Initialize custom_data with plan variables
      const initialCustomData: Record<string, string> = {};
      planVariables.forEach((v) => {
        initialCustomData[v.variable_name] = '';
      });
      setFormData((prev) => ({ 
        ...prev, 
        custom_data: initialCustomData,
        monthly_value: selectedPlan.base_value.toString(),
      }));
    }
  }, [formData.plan_id, selectedPlan]);

  // Calculate end date and total value based on start date and duration
  useEffect(() => {
    if (formData.start_date && formData.duration_months) {
      const startDate = new Date(formData.start_date);
      const durationMonths = parseInt(formData.duration_months);
      const endDate = addMonths(startDate, durationMonths);
      
      setFormData((prev) => ({
        ...prev,
        end_date: format(endDate, 'yyyy-MM-dd'),
      }));
    }
  }, [formData.start_date, formData.duration_months]);

  // Calculate total value
  useEffect(() => {
    if (formData.monthly_value && formData.duration_months) {
      const monthly = parseFloat(formData.monthly_value);
      const months = parseInt(formData.duration_months);
      if (!isNaN(monthly) && !isNaN(months)) {
        setFormData((prev) => ({
          ...prev,
          total_value: (monthly * months).toFixed(2),
        }));
      }
    }
  }, [formData.monthly_value, formData.duration_months]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-zA-Z0-9_.-]+/g, '_');
      
      const fileName = `existing/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      setAttachedFile({ name: file.name, url: publicUrl });
      toast({
        title: 'Arquivo anexado',
        description: 'O contrato foi anexado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Erro ao enviar arquivo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isExistingContract && !attachedFile) {
      toast({
        title: 'Erro',
        description: 'Para contratos em vigor, é necessário anexar o documento do contrato.',
        variant: 'destructive',
      });
      return;
    }

    await createContract.mutateAsync({
      client_name: formData.client_name,
      client_email: formData.client_email || undefined,
      client_phone: formData.client_phone || undefined,
      plan_id: formData.plan_id || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date,
      monthly_value: formData.monthly_value ? parseFloat(formData.monthly_value) : undefined,
      total_value: parseFloat(formData.total_value),
      custom_data: formData.custom_data,
      status: isExistingContract ? 'active' : 'draft',
      generated_document_url: attachedFile?.url,
    });

    navigate('/contracts');
  };

  const handleCustomDataChange = (variableName: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      custom_data: { ...prev.custom_data, [variableName]: value },
    }));
  };

  const renderVariableInput = (variable: typeof planVariables[0], value: string) => {
    const commonProps = {
      id: variable.variable_name,
      value: value ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleCustomDataChange(variable.variable_name, e.target.value),
      required: variable.required,
    };

    switch (variable.field_type) {
      case 'number':
        return <Input type="number" {...commonProps} />;
      case 'date':
        return <Input type="date" {...commonProps} />;
      case 'email':
        return <Input type="email" {...commonProps} />;
      case 'phone':
        return <Input type="tel" {...commonProps} />;
      case 'currency':
        return <Input type="number" step="0.01" min="0" {...commonProps} />;
      case 'textarea':
        return <Textarea {...commonProps} />;
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleCustomDataChange(variable.variable_name, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {variable.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return <Input type="text" {...commonProps} />;
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        {/* Header with accent */}
        <div className="relative mb-6">
          <div className="absolute -left-6 top-0 w-1 h-full gradient-primary rounded-r" />
          <h1 className="text-3xl font-bold">Novo Contrato</h1>
          <p className="text-muted-foreground">
            Preencha os dados para criar um novo contrato
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Existing Contract Toggle */}
          <Card className="border-l-4 border-l-muted-foreground">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tipo de Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="existing-contract"
                  checked={isExistingContract}
                  onCheckedChange={(checked) => setIsExistingContract(checked === true)}
                />
                <Label htmlFor="existing-contract" className="cursor-pointer">
                  Este é um contrato já em vigor (anexar documento existente)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* File Upload for Existing Contracts */}
          {isExistingContract && (
            <Card>
              <CardHeader>
                <CardTitle>Anexar Contrato</CardTitle>
                <CardDescription>
                  Envie o documento do contrato já assinado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  id="contract-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                {attachedFile ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="flex-1 truncate">{attachedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('contract-file')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Anexar Documento
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="client_name">Nome do Cliente *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="client_email">E-mail</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="client_phone">Telefone</Label>
                <Input
                  id="client_phone"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle>Detalhes do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="contract_category">Categoria do Contrato *</Label>
                <Select
                  value={formData.contract_category}
                  onValueChange={(value) => setFormData({ ...formData, contract_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="service_provider_pj">Prestador de Serviço (PJ)</SelectItem>
                    <SelectItem value="service_provider_pf">Prestador de Serviço (PF)</SelectItem>
                    <SelectItem value="vendor_service">Serviços Contratados</SelectItem>
                    <SelectItem value="partnership">Parceria</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="plan_id">Plano</Label>
                <Select
                  value={formData.plan_id}
                  onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={plansLoading ? 'Carregando...' : 'Selecione um plano'} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {Number(plan.base_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start_date">Data de Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration_months">Duração (meses) *</Label>
                <Select
                  value={formData.duration_months}
                  onValueChange={(value) => setFormData({ ...formData, duration_months: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((months) => (
                      <SelectItem key={months} value={months.toString()}>
                        {months} {months === 1 ? 'mês' : 'meses'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="end_date">Data de Término</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="monthly_value">Valor Mensal *</Label>
                <Input
                  id="monthly_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_value}
                  onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="total_value">Valor Total</Label>
                <Input
                  id="total_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_value}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {planVariables.length > 0 && (
            <Card className="border-l-4 border-l-accent-foreground">
              <CardHeader>
                <CardTitle>Campos Personalizados ({selectedPlan?.name})</CardTitle>
                <CardDescription>
                  Preencha as variáveis do template do contrato
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planVariables.map((variable) => (
                  <div key={variable.id} className={variable.field_type === 'textarea' ? 'md:col-span-2' : ''}>
                    <Label htmlFor={variable.variable_name}>
                      {variable.label}
                      {variable.required && ' *'}
                    </Label>
                    {variable.description && (
                      <p className="text-xs text-muted-foreground mb-1">{variable.description}</p>
                    )}
                    {renderVariableInput(variable, formData.custom_data[variable.variable_name] ?? '')}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/contracts')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createContract.isPending} className="gradient-primary">
              {createContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isExistingContract ? 'Cadastrar Contrato em Vigor' : 'Criar Contrato'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
