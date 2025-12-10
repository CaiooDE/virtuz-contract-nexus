import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
}

function SidebarItem({ to, icon: Icon, label, collapsed }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <NavLink
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground font-medium',
        collapsed && 'justify-center'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  const menuItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/contracts', icon: FileText, label: 'Contratos' },
    { to: '/contracts/new', icon: PlusCircle, label: 'Novo Contrato' },
    { to: '/settings/plans', icon: Settings, label: 'Configurações' },
  ];

  const initials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0].toUpperCase() || 'U';

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar-background border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <span className="font-semibold text-lg text-sidebar-foreground">
            VirtuzMídia
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <SidebarItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* User Section */}
      <div className={cn(
        'p-3 border-t border-sidebar-border',
        collapsed ? 'flex flex-col items-center gap-2' : ''
      )}>
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-lg',
          collapsed && 'justify-center'
        )}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={signOut}
          className={cn(
            'text-muted-foreground hover:text-destructive',
            collapsed ? 'w-8 h-8' : 'w-full justify-start gap-2'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
