import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppointments } from "@/integrations/supabase/appointments";
import { CalendarCheck, Loader2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import { Link } from "react-router-dom";

const Appointments = () => {
  const { t } = useTranslation();
  const { data: appointments, isLoading, refetch } = useAppointments();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    if (!searchTerm) return appointments;

    const lowerCaseSearch = searchTerm.toLowerCase();
    return appointments.filter(appointment =>
      appointment.cliente_nome?.toLowerCase().includes(lowerCaseSearch) ||
      appointment.responsavel_nome?.toLowerCase().includes(lowerCaseSearch) ||
      appointment.id.toLowerCase().includes(lowerCaseSearch)
    );
  }, [appointments, searchTerm]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarCheck className="h-7 w-7" />
          {t('nav_appointments')}
        </h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">{t('appointment_list')}</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Botão de recarregar removido */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('search_appointments')}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button asChild>
                <Link to="/appointments/new">{t('schedule_new_appointment')}</Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('appointment_id')}</TableHead>
                      <TableHead>{t('client')}</TableHead>
                      <TableHead>{t('responsible')}</TableHead>
                      <TableHead>{t('date_time')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-medium">{appointment.id.substring(0, 8)}...</TableCell>
                          <TableCell>{appointment.cliente_nome || t('unknown_client')}</TableCell>
                          <TableCell>{appointment.responsavel_nome || t('unassigned')}</TableCell>
                          <TableCell>{format(new Date(appointment.data_hora), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell>
                            <AppointmentStatusBadge status={appointment.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/appointments/${appointment.id}`}>{t('view')}</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t('no_appointments_found')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Appointments;