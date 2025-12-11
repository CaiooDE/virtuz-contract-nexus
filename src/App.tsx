import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Unauthorized from "./pages/Unauthorized";
import Dashboard from "./pages/Dashboard";
import ContractsList from "./pages/ContractsList";
import NewContract from "./pages/NewContract";
import ContractDetail from "./pages/ContractDetail";
import PlansSettings from "./pages/PlansSettings";
import TemplateEditorPage from "./pages/TemplateEditorPage";
import WebhookSettings from "./pages/WebhookSettings";
import ClientContractForm from "./pages/ClientContractForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><ContractsList /></ProtectedRoute>} />
            <Route path="/contracts/new" element={<ProtectedRoute><NewContract /></ProtectedRoute>} />
            <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
            <Route path="/settings/plans" element={<ProtectedRoute><PlansSettings /></ProtectedRoute>} />
            <Route path="/settings/plans/:planId/template" element={<ProtectedRoute><TemplateEditorPage /></ProtectedRoute>} />
            <Route path="/settings/webhooks" element={<ProtectedRoute><WebhookSettings /></ProtectedRoute>} />
            <Route path="/client-form/:token" element={<ClientContractForm />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
