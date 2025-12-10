import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ContractStatus = 'draft' | 'sent_to_client' | 'awaiting_signature' | 'active' | 'expired' | 'cancelled';

interface ContractStatusBadgeProps {
  status: ContractStatus;
}

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  draft: {
    label: 'Rascunho',
    className: 'bg-muted text-muted-foreground',
  },
  sent_to_client: {
    label: 'Enviado para Cliente',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  awaiting_signature: {
    label: 'Aguardando Assinatura',
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  },
  active: {
    label: 'Ativo',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  },
  expired: {
    label: 'Vencido',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-muted text-muted-foreground line-through',
  },
};

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
