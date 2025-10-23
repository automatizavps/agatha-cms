import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppointments, Appointment, deleteAppointment } from "@/integrations/supabase/appointments";
import { Loader2, CalendarCheck, MoreHorizontal, Pencil, Trash2, Clock } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AddAppointmentSheet from "@/components/AddAppointmentSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import EditAppointmentSheet from "@/components/EditAppointmentSheet";

interface AppointmentActionsProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
}

const AppointmentActions: React.FC<AppointmentActionsProps> = ({ appointment, onEdit }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      showSuccess(`Agendamento para ${appointment.clientes?.nome || 'Cliente'} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      showError("Falha ao excluir agendamento: " + error.message);
    },
  });

  const handleDelete = () => {
    const clientName = appointment.clientes?.nome || 'este cliente';
    if (window.confirm(`Tem certeza que deseja excluir o agendamento de ${clientName} em ${format(new Date(appointment.data_hora), "dd/MM/yyyy HH:mm")}?`)) {
      deleteMutation.mutate(appointment.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(appointment)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


const Appointments = () => {
  const { data: appointments, isLoading, isError, error } = useAppointments();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  if (isError && error) {
    showError("Erro ao carregar agendamentos: " + error.message);
  }
  
  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingAppointment(null);
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const baseClasses = "capitalize px-2 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'confirmado':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'cancelado':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      case 'concluido':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case 'pendente':
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
        <AddAppointmentSheet />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> Lista de Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center text-destructive p-4 border border-destructive rounded-md">
              Não foi possível carregar os agendamentos.
            </div>
          ) : appointments && appointments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data e Hora</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">{appointment.clientes?.nome || "Cliente Removido"}</TableCell>
                      <TableCell className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {appointment.servicos?.nome || "Serviço Removido"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(appointment.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{appointment.responsavel?.nome_completo || "N/A"}</TableCell>
                      <TableCell>
                        <span className={getStatusBadge(appointment.status)}>
                          {appointment.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <AppointmentActions appointment={appointment} onEdit={handleEdit} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              Nenhum agendamento encontrado.
            </div>
          )}
        </CardContent>
      </Card>
      
      {editingAppointment && (
        <EditAppointmentSheet 
          appointment={editingAppointment} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </DashboardLayout>
  );
};

export default Appointments;