import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge';
import { useContracts, ContractStatus } from '@/hooks/useContracts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ContractsList() {
  const navigate = useNavigate();
  const { contracts, isLoading } = useContracts();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = contract.client_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Contratos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os contratos
            </p>
          </div>
          <Button asChild>
            <Link to="/contracts/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="sent_to_client">Enviado para Cliente</SelectItem>
              <SelectItem value="awaiting_signature">Aguardando Assinatura</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="expired">Vencido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Término</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search || statusFilter !== 'all'
                      ? 'Nenhum contrato encontrado com os filtros aplicados'
                      : 'Nenhum contrato cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => (
                  <TableRow 
                    key={contract.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/contracts/${contract.id}`)}
                  >
                    <TableCell className="font-medium">{contract.client_name}</TableCell>
                    <TableCell>{contract.plans?.name ?? '-'}</TableCell>
                    <TableCell>
                      <ContractStatusBadge status={contract.status as ContractStatus} />
                    </TableCell>
                    <TableCell>
                      {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {Number(contract.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
