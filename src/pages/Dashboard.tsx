import { FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { ContractsChart } from '@/components/dashboard/ContractsChart';
import { ExpiringContractsTable } from '@/components/dashboard/ExpiringContractsTable';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { stats, chartData, expiringContracts, isLoading } = useDashboardStats();

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral dos contratos
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <KPICard
                title="Total de Contratos"
                value={stats?.totalContracts ?? 0}
                icon={FileText}
                variant="default"
              />
              <KPICard
                title="Contratos Ativos"
                value={stats?.activeContracts ?? 0}
                icon={CheckCircle}
                variant="success"
              />
              <KPICard
                title="Vencendo em 30-60 dias"
                value={stats?.expiringContracts ?? 0}
                icon={AlertTriangle}
                variant="warning"
              />
              <KPICard
                title="Contratos Vencidos"
                value={stats?.expiredContracts ?? 0}
                icon={XCircle}
                variant="danger"
              />
            </>
          )}
        </div>

        {/* Chart and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-[400px]" />
              <Skeleton className="h-[400px]" />
            </>
          ) : (
            <>
              <ContractsChart data={chartData} />
              <ExpiringContractsTable contracts={expiringContracts} />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
