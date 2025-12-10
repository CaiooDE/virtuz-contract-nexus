import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, addMonths, startOfMonth, endOfMonth, format } from 'date-fns';

export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  expiredContracts: number;
}

export interface MonthlyChartData {
  month: string;
  value: number;
}

export interface ExpiringContract {
  id: string;
  client_name: string;
  total_value: number;
  end_date: string;
}

export function useDashboardStats() {
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);
  const sixtyDaysFromNow = addDays(today, 60);

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Total contracts
      const { count: totalContracts } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true });

      // Active contracts
      const { count: activeContracts } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Expiring contracts (30-60 days)
      const { count: expiringContracts } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('end_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .lte('end_date', sixtyDaysFromNow.toISOString().split('T')[0]);

      // Expired contracts
      const { count: expiredContracts } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'expired');

      return {
        totalContracts: totalContracts ?? 0,
        activeContracts: activeContracts ?? 0,
        expiringContracts: expiringContracts ?? 0,
        expiredContracts: expiredContracts ?? 0,
      } as DashboardStats;
    },
  });

  const chartDataQuery = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: async () => {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('monthly_value, start_date, end_date')
        .eq('status', 'active');

      // Generate last 6 months data
      const months: MonthlyChartData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = addMonths(today, -i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        // Sum monthly values for contracts active in this month
        let totalValue = 0;
        contracts?.forEach((contract) => {
          const contractStart = new Date(contract.start_date);
          const contractEnd = new Date(contract.end_date);

          if (contractStart <= monthEnd && contractEnd >= monthStart) {
            totalValue += Number(contract.monthly_value) || 0;
          }
        });

        months.push({
          month: format(monthDate, 'MMM'),
          value: totalValue,
        });
      }

      return months;
    },
  });

  const expiringContractsQuery = useQuery({
    queryKey: ['expiring-contracts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, client_name, total_value, end_date')
        .eq('status', 'active')
        .gte('end_date', today.toISOString().split('T')[0])
        .lte('end_date', sixtyDaysFromNow.toISOString().split('T')[0])
        .order('end_date', { ascending: true })
        .limit(10);

      return (data ?? []) as ExpiringContract[];
    },
  });

  return {
    stats: statsQuery.data,
    chartData: chartDataQuery.data ?? [],
    expiringContracts: expiringContractsQuery.data ?? [],
    isLoading: statsQuery.isLoading || chartDataQuery.isLoading || expiringContractsQuery.isLoading,
  };
}
