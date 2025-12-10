import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContracts } from '@/hooks/useContracts';
import { usePlans } from '@/hooks/usePlans';
import { Loader2 } from 'lucide-react';

export default function NewContract() {
  const navigate = useNavigate();
  const { createContract } = useContracts();
  const { plans, isLoading: plansLoading } = usePlans();

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    plan_id: '',
    start_date: '',
    end_date: '',
    monthly_value: '',
    total_value: '',
    custom_data: {} as Record<string, string>,
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
      setFormData((prev) => ({ ...prev, custom_data: initialCustomData }));
    }
  }, [formData.plan_id, selectedPlan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    });

    navigate('/contracts');
  };

  const handleCustomDataChange = (variableName: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      custom_data: { ...prev.custom_data, [variableName]: value },
    }));
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Novo Contrato</h1>
          <p className="text-muted-foreground">
            Preencha os dados para criar um novo contrato
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
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

          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="end_date">Data de Término *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="monthly_value">Valor Mensal</Label>
                <Input
                  id="monthly_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_value}
                  onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="total_value">Valor Total *</Label>
                <Input
                  id="total_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_value}
                  onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {planVariables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campos Personalizados ({selectedPlan?.name})</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planVariables.map((variable) => (
                  <div key={variable.id}>
                    <Label htmlFor={variable.variable_name}>
                      {variable.label}
                      {variable.required && ' *'}
                    </Label>
                    <Input
                      id={variable.variable_name}
                      value={formData.custom_data[variable.variable_name] ?? ''}
                      onChange={(e) => handleCustomDataChange(variable.variable_name, e.target.value)}
                      required={variable.required}
                    />
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
            <Button type="submit" disabled={createContract.isPending}>
              {createContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Contrato
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
