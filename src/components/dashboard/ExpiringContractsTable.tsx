import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExpiringContract {
  id: string;
  client_name: string;
  total_value: number;
  end_date: string;
}

interface ExpiringContractsTableProps {
  contracts: ExpiringContract[];
}

function getDaysRemaining(endDate: string) {
  const days = differenceInDays(new Date(endDate), new Date());
  return days;
}

function getTimeRemainingBadge(days: number) {
  if (days <= 0) {
    return <Badge variant="destructive">Vencido</Badge>;
  }
  if (days <= 30) {
    return <Badge variant="destructive">{days} dias</Badge>;
  }
  if (days <= 60) {
    return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">{days} dias</Badge>;
  }
  return <Badge variant="secondary">{days} dias</Badge>;
}

export function ExpiringContractsTable({ contracts }: ExpiringContractsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contratos Próximos ao Vencimento</CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum contrato próximo ao vencimento
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Data de Término</TableHead>
                <TableHead>Tempo Restante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => {
                const days = getDaysRemaining(contract.end_date);
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.client_name}</TableCell>
                    <TableCell>
                      R$ {contract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getTimeRemainingBadge(days)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
