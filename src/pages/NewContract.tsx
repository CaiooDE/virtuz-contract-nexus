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
import { Loader2, Upload, FileText, X, Copy, CheckCircle, Eye, ArrowRight, Share2, ExternalLink, FileSignature } from 'lucide-react';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import { SignaturePlacementStep, SignaturePosition } from '@/components/contracts/SignaturePlacementStep';
import { addMonths, format } from 'date-fns';
import { numberToCurrencyWords } from '@/lib/numberToWords';

type CreatedContract = {
  id: string;
  client_token: string;
  client_name: string;
  autentique_signature_link?: string;
};

export default function NewContract() {
  const navigate = useNavigate();
  const { createContract } = useContracts();
  const { plans, isLoading: plansLoading } = usePlans();
  const { toast } = useToast();

  const [isExistingContract, setIsExistingContract] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [createdContract, setCreatedContract] = useState<CreatedContract | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sendingToAutentique, setSendingToAutentique] = useState(false);
  
  // Signature placement step
  const [showSignaturePlacement, setShowSignaturePlacement] = useState(false);
  const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);

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

  // Template content for editing (with signature markers)
  const [editedTemplateContent, setEditedTemplateContent] = useState<string>('');

  // Generate client form link based on category and plan selection
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  
  // Generate a unique token when category is selected (for link preview)
  useEffect(() => {
    if (formData.contract_category) {
      // Generate a random UUID-like token for preview purposes
      const token = crypto.randomUUID();
      setPreviewToken(token);
    }
  }, [formData.contract_category, formData.plan_id]);

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
      // Initialize template content for editing
      setEditedTemplateContent(selectedPlan.template_content || '');
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

  // Called when form is submitted - goes to signature placement if needed
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isExistingContract && !attachedFile) {
      toast({
        title: 'Erro',
        description: 'Para contratos em vigor, é necessário anexar o documento do contrato.',
        variant: 'destructive',
      });
      return;
    }

    // Validate email is required for Autentique
    if (!isExistingContract && !formData.client_email) {
      toast({
        title: 'E-mail obrigatório',
        description: 'O e-mail do cliente é necessário para enviar o contrato para assinatura.',
        variant: 'destructive',
      });
      return;
    }

    // If it's a new contract with template, show signature placement step
    if (!isExistingContract && editedTemplateContent && formData.client_email) {
      setShowSignaturePlacement(true);
      return;
    }

    // Otherwise, submit directly (for existing contracts)
    await submitContract([]);
  };

  // Called after signature placement is complete
  const handleSignaturePlacementComplete = async (positions: SignaturePosition[]) => {
    setSignaturePositions(positions);
    await submitContract(positions);
  };

  // Final contract submission
  const submitContract = async (positions: SignaturePosition[]) => {
    const result = await createContract.mutateAsync({
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

    let autentiqueLink: string | undefined;

    // Send to Autentique if not an existing contract and has template
    if (!isExistingContract && editedTemplateContent && formData.client_email) {
      setSendingToAutentique(true);
      try {
        const filledContent = getFilledTemplateContent();
        
        const response = await supabase.functions.invoke('send-to-autentique', {
          body: {
            contractId: result.id,
            documentName: `Contrato - ${formData.client_name}`,
            signerName: formData.client_name,
            signerEmail: formData.client_email,
            documentContent: filledContent,
            contractCategory: formData.contract_category,
            signaturePositions: positions.map(p => ({
              id: p.id,
              label: p.label,
              x: p.x,
              y: p.y,
              page: p.page,
            })),
          },
        });

        if (response.error) {
          console.error('Error sending to Autentique:', response.error);
          toast({
            title: 'Aviso',
            description: 'Contrato criado, mas houve um erro ao enviar para o Autentique. Verifique a configuração da API.',
            variant: 'destructive',
          });
        } else if (response.data?.success) {
          autentiqueLink = response.data.signatureLink;
          toast({
            title: 'Enviado para Autentique!',
            description: 'O contrato foi enviado para assinatura digital.',
          });
        }
      } catch (error) {
        console.error('Error calling Autentique:', error);
      } finally {
        setSendingToAutentique(false);
        setShowSignaturePlacement(false);
      }
    }

    // Show success state with link
    setCreatedContract({
      id: result.id,
      client_token: result.client_token!,
      client_name: result.client_name,
      autentique_signature_link: autentiqueLink,
    });
  };

  const handleCopyLink = async () => {
    if (!createdContract) return;
    const clientFormUrl = `${window.location.origin}/client-form/${createdContract.client_token}`;
    await navigator.clipboard.writeText(clientFormUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência.',
    });
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

  // Generate filled contract preview HTML using edited template content
  const getFilledTemplateContent = () => {
    if (!editedTemplateContent) return null;
    
    let filledContent = editedTemplateContent;
    
    // Replace custom variables with actual values
    Object.entries(formData.custom_data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      
      // Check if this variable is currency type
      const variable = planVariables.find(v => v.variable_name === key);
      if (variable?.field_type === 'currency' && value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          filledContent = filledContent.replace(regex, `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
          // Also replace extenso version
          const extensoRegex = new RegExp(`\\{\\{${key}_extenso\\}\\}`, 'g');
          filledContent = filledContent.replace(extensoRegex, numberToCurrencyWords(numValue));
        }
      } else {
        filledContent = filledContent.replace(regex, value || `{{${key}}}`);
      }
    });
    
    // Replace common contract variables
    filledContent = filledContent.replace(/\{\{client_name\}\}/g, formData.client_name || '{{client_name}}');
    filledContent = filledContent.replace(/\{\{start_date\}\}/g, formData.start_date ? format(new Date(formData.start_date), 'dd/MM/yyyy') : '{{start_date}}');
    filledContent = filledContent.replace(/\{\{end_date\}\}/g, formData.end_date ? format(new Date(formData.end_date), 'dd/MM/yyyy') : '{{end_date}}');
    
    // Monthly value with extenso
    if (formData.monthly_value) {
      const monthlyNum = parseFloat(formData.monthly_value);
      filledContent = filledContent.replace(/\{\{monthly_value\}\}/g, `R$ ${monthlyNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      filledContent = filledContent.replace(/\{\{monthly_value_extenso\}\}/g, numberToCurrencyWords(monthlyNum));
    } else {
      filledContent = filledContent.replace(/\{\{monthly_value\}\}/g, '{{monthly_value}}');
      filledContent = filledContent.replace(/\{\{monthly_value_extenso\}\}/g, '{{monthly_value_extenso}}');
    }
    
    // Total value with extenso
    if (formData.total_value) {
      const totalNum = parseFloat(formData.total_value);
      filledContent = filledContent.replace(/\{\{total_value\}\}/g, `R$ ${totalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      filledContent = filledContent.replace(/\{\{total_value_extenso\}\}/g, numberToCurrencyWords(totalNum));
    } else {
      filledContent = filledContent.replace(/\{\{total_value\}\}/g, '{{total_value}}');
      filledContent = filledContent.replace(/\{\{total_value_extenso\}\}/g, '{{total_value_extenso}}');
    }
    
    return filledContent;
  };

  // Show signature placement step
  if (showSignaturePlacement) {
    const filledContent = getFilledTemplateContent();
    
    return (
      <AppLayout>
        <div className="p-6 max-w-7xl">
          <div className="relative mb-6">
            <div className="absolute -left-6 top-0 w-1 h-full gradient-primary rounded-r" />
            <h1 className="text-3xl font-bold">Posicionar Assinaturas</h1>
            <p className="text-muted-foreground">
              Arraste as assinaturas para o local desejado no documento
            </p>
          </div>
          
          <SignaturePlacementStep
            htmlContent={filledContent || ''}
            onComplete={handleSignaturePlacementComplete}
            onCancel={() => setShowSignaturePlacement(false)}
            signers={[
              { id: 'company', label: 'Virtuz Mídia (Empresa)', name: 'Virtuz Mídia' },
              { id: 'client', label: formData.client_name || 'Cliente', name: formData.client_name },
            ]}
          />
        </div>
      </AppLayout>
    );
  }

  // Show success screen after contract creation
  if (createdContract) {
    const clientFormUrl = `${window.location.origin}/client-form/${createdContract.client_token}`;
    const filledContent = getFilledTemplateContent();
    
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl space-y-6">
          <div className="relative">
            <div className="absolute -left-6 top-0 w-1 h-full bg-green-500 rounded-r" />
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h1 className="text-3xl font-bold">Contrato Criado com Sucesso!</h1>
                <p className="text-muted-foreground">
                  {createdContract.client_name}
                </p>
              </div>
            </div>
          </div>

          {/* Autentique Signature Link Card */}
          {createdContract.autentique_signature_link && (
            <Card className="border-t-4 border-t-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-green-500" />
                  Assinatura Digital - Autentique
                </CardTitle>
                <CardDescription>
                  O contrato foi enviado para o Autentique. O cliente receberá um e-mail para assinatura.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={createdContract.autentique_signature_link} readOnly className="bg-muted font-mono text-sm" />
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(createdContract.autentique_signature_link, '_blank')}
                    className="shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Um e-mail foi enviado para <strong>{formData.client_email}</strong> com o link para assinatura.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Client Link Card */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Link para o Cliente
              </CardTitle>
              <CardDescription>
                Envie este link para o cliente preencher ou visualizar o contrato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={clientFormUrl} readOnly className="bg-muted font-mono text-sm" />
                <Button variant="outline" onClick={handleCopyLink} className="shrink-0">
                  {linkCopied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contract Preview */}
          {filledContent && (
            <Card className="border-t-4 border-t-accent-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Preview do Contrato Preenchido
                </CardTitle>
                <CardDescription>
                  Visualização do contrato com as variáveis substituídas pelos dados informados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-6 bg-card max-h-[500px] overflow-auto prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: filledContent }}
                />
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setCreatedContract(null);
                setFormData({
                  client_name: '',
                  client_email: '',
                  client_phone: '',
                  plan_id: '',
                  start_date: '',
                  duration_months: '12',
                  end_date: '',
                  monthly_value: '',
                  total_value: '',
                  custom_data: {},
                  status: 'draft',
                  contract_category: 'client',
                });
              }}
            >
              Criar Outro Contrato
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/contracts/${createdContract.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalhes
            </Button>
            <Button onClick={() => navigate('/contracts')} className="gradient-primary">
              <ArrowRight className="h-4 w-4 mr-2" />
              Ir para Lista de Contratos
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

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

        <form onSubmit={handleFormSubmit} className="space-y-6">
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

          {/* Quick Client Link Preview - Show when category is selected and not existing contract */}
          {!isExistingContract && formData.contract_category && (
            <Card className="border-l-4 border-l-green-500 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-green-500" />
                  Link para Coleta de Dados
                </CardTitle>
                <CardDescription>
                  Após criar o contrato, este link será gerado para o cliente preencher os dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}/client-form/[token-gerado-após-criar]`} 
                    readOnly 
                    className="bg-muted font-mono text-sm text-muted-foreground" 
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O link final será disponibilizado assim que o contrato for criado. Você também pode enviar o contrato para preenchimento por e-mail.
                </p>
              </CardContent>
            </Card>
          )}

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

          {/* Template Editor with Signature Markers */}
          {!isExistingContract && selectedPlan?.template_content && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle>Template do Contrato</CardTitle>
                <CardDescription>
                  Edite o template e arraste os marcadores de assinatura para definir onde as assinaturas aparecerão
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplateEditor
                  content={editedTemplateContent}
                  onChange={setEditedTemplateContent}
                  variables={planVariables}
                  includeBuiltInVariables={true}
                  includeSignatureMarkers={true}
                />
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
            <Button type="submit" disabled={createContract.isPending || sendingToAutentique} className="gradient-primary">
              {(createContract.isPending || sendingToAutentique) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {sendingToAutentique 
                ? 'Enviando para Autentique...' 
                : createContract.isPending 
                  ? 'Criando...' 
                  : isExistingContract 
                    ? 'Cadastrar Contrato em Vigor' 
                    : 'Criar e Enviar para Assinatura'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
