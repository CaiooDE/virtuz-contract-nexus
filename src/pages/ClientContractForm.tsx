import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Contract {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  plan_id: string | null;
  custom_data: Record<string, string> | null;
  status: string;
  client_filled_at: string | null;
}

interface Plan {
  id: string;
  name: string;
  plan_variables: PlanVariable[];
}

interface PlanVariable {
  id: string;
  variable_name: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[] | null;
  description: string | null;
}

export default function ClientContractForm() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchContract = async () => {
      if (!token) {
        setError('Token inválido');
        setLoading(false);
        return;
      }

      try {
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('*')
          .eq('client_token', token)
          .maybeSingle();

        if (contractError) throw contractError;
        if (!contractData) {
          setError('Contrato não encontrado');
          setLoading(false);
          return;
        }

        setContract(contractData as Contract);
        
        if (contractData.client_filled_at) {
          setSubmitted(true);
        }

        if (contractData.plan_id) {
          const { data: planData, error: planError } = await supabase
            .from('plans')
            .select('*, plan_variables(*)')
            .eq('id', contractData.plan_id)
            .maybeSingle();

          if (!planError && planData) {
            setPlan(planData as Plan);
            
            // Initialize form data with existing custom_data or empty values
            const existingData = (contractData.custom_data as Record<string, string>) || {};
            const initialData: Record<string, string> = {};
            planData.plan_variables?.forEach((v: PlanVariable) => {
              initialData[v.variable_name] = existingData[v.variable_name] || '';
            });
            setFormData(initialData);
          }
        }
      } catch (err) {
        setError('Erro ao carregar o contrato');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  const handleInputChange = (variableName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [variableName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    // Validate required fields
    const missingRequired = plan?.plan_variables?.filter(
      (v) => v.required && !formData[v.variable_name]?.trim()
    );

    if (missingRequired && missingRequired.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Por favor, preencha: ${missingRequired.map((v) => v.label).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          custom_data: formData,
          client_filled_at: new Date().toISOString(),
          status: 'awaiting_signature',
        })
        .eq('client_token', token);

      if (updateError) throw updateError;

      setSubmitted(true);
      toast({
        title: 'Dados enviados!',
        description: 'O formulário foi preenchido com sucesso.',
      });
    } catch (err) {
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro ao enviar os dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderVariableInput = (variable: PlanVariable, value: string) => {
    const commonProps = {
      id: variable.variable_name,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleInputChange(variable.variable_name, e.target.value),
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
            onValueChange={(val) => handleInputChange(variable.variable_name, val)}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Formulário Enviado!</h2>
            <p className="text-muted-foreground">
              Os dados foram enviados com sucesso. A equipe irá revisar e entrar em contato para finalizar o contrato.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Preencher Dados do Contrato</CardTitle>
            <CardDescription>
              Olá {contract?.client_name}, preencha os campos abaixo para completar o seu contrato.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {plan?.plan_variables?.map((variable) => (
                <div key={variable.id}>
                  <Label htmlFor={variable.variable_name}>
                    {variable.label}
                    {variable.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {variable.description && (
                    <p className="text-xs text-muted-foreground mb-1">{variable.description}</p>
                  )}
                  {renderVariableInput(variable, formData[variable.variable_name] || '')}
                </div>
              ))}

              {(!plan?.plan_variables || plan.plan_variables.length === 0) && (
                <p className="text-muted-foreground text-center py-4">
                  Não há campos para preencher neste contrato.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !plan?.plan_variables?.length}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar Dados
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
