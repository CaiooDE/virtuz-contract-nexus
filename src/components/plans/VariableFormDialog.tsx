import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'select', label: 'Seleção (Dropdown)' },
];

interface VariableFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    variable_name: string;
    label: string;
    field_type: string;
    required: boolean;
    options?: string[];
    description?: string;
  }) => Promise<void>;
  initialData?: {
    variable_name: string;
    label: string;
    field_type: string;
    required: boolean;
    options?: string[] | null;
    description?: string | null;
  };
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function VariableFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
  mode,
}: VariableFormDialogProps) {
  const [formData, setFormData] = useState({
    variable_name: '',
    label: '',
    field_type: 'text',
    required: false,
    options: '',
    description: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        variable_name: initialData.variable_name,
        label: initialData.label,
        field_type: initialData.field_type,
        required: initialData.required,
        options: initialData.options?.join(', ') || '',
        description: initialData.description || '',
      });
    } else {
      setFormData({
        variable_name: '',
        label: '',
        field_type: 'text',
        required: false,
        options: '',
        description: '',
      });
    }
  }, [initialData, open]);

  const handleSubmit = async () => {
    const options = formData.field_type === 'select' && formData.options
      ? formData.options.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;

    await onSubmit({
      variable_name: formData.variable_name,
      label: formData.label,
      field_type: formData.field_type,
      required: formData.required,
      options,
      description: formData.description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Variável' : 'Editar Variável'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Crie uma nova variável personalizada para o plano'
              : 'Edite os dados da variável'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="variable_name">Nome da Variável</Label>
            <Input
              id="variable_name"
              value={formData.variable_name}
              onChange={(e) => setFormData({ ...formData, variable_name: e.target.value.replace(/\s/g, '_').toLowerCase() })}
              placeholder="ex: razao_social"
              disabled={mode === 'edit'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use no template como: {`{{${formData.variable_name || 'nome_variavel'}}}`}
            </p>
          </div>
          <div>
            <Label htmlFor="label">Rótulo (exibido no formulário)</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="ex: Razão Social"
            />
          </div>
          <div>
            <Label htmlFor="field_type">Tipo do Campo</Label>
            <Select
              value={formData.field_type}
              onValueChange={(value) => setFormData({ ...formData, field_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formData.field_type === 'select' && (
            <div>
              <Label htmlFor="options">Opções (separadas por vírgula)</Label>
              <Input
                id="options"
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                placeholder="ex: Opção 1, Opção 2, Opção 3"
              />
            </div>
          )}
          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição de ajuda para o campo"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={formData.required}
              onCheckedChange={(checked) => setFormData({ ...formData, required: checked === true })}
            />
            <Label htmlFor="required" className="cursor-pointer">
              Campo obrigatório
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.variable_name || !formData.label}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Criar Variável' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
