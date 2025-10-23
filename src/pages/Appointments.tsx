import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppointments } from "@/integrations/supabase/appointments";
import { Loader2, CalendarCheck } from "lucide-react";
import { showError } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AddAppointmentSheet from "@/components/AddAppointmentSheet";

const Appointments = () => {
  const { data: appointments, isLoading, isError, error } = useAppointments();

  if (isError && error) {
    showError("Erro ao carregar agendamentos: " + error.message);
  }

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
                    <TableHead>Data e Hora</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">{appointment.cliente_nome}</TableCell>
                      <TableCell>
                        {format(new Date(appointment.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{appointment.responsavel?.nome_completo || "N/A"}</TableCell>
                      <TableCell>
                        <span className={`capitalize px-2 py-1 rounded-full text-xs font-semibold ${
                          appointment.status === 'confirmado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          appointment.status === 'cancelado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {appointment.status}
                        </span>
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
    </DashboardLayout>
  );
};

export default Appointments;