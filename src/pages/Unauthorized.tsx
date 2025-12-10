import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Unauthorized() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar este sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            O sistema é restrito a colaboradores com e-mail @virtuzmidia.com.br
          </p>
          {user && (
            <p className="text-sm text-center">
              E-mail utilizado: <span className="font-medium">{user.email}</span>
            </p>
          )}
          <Button
            className="w-full"
            variant="outline"
            onClick={handleSignOut}
          >
            Voltar para Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
