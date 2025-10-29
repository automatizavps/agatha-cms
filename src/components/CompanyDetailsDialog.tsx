import React, { useState, useMemo } from 'react';
import { Company } from '@/integrations/supabase/companies';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Building, User, Package, Clock, ShoppingCart, CalendarCheck, Tag, HandCoins, Target, ShieldCheck, Mail, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUsers } from '@/integrations/supabase/users';
import { useClients } from '@/integrations/supabase/clients';
import { useProductsOnly, useServicesOnly } from '@/integrations/supabase/products';
import { useOrders } from '@/integrations/supabase/orders';
import { useAppointments } from '@/integrations/supabase/appointments';
import { useCategories } from '@/integrations/supabase/categories';
import { useCommissionRules } from '@/integrations/supabase/commissions';
import { useTeams } from '@/integrations/supabase/teams';
import { usePromotions } from '@/integrations/supabase/promotions';
import { usePlanModules } from '@/integrations/supabase/plans';
import { cn } from '@/lib/utils';

interface CompanyDetailsDialogProps {
  company: Company | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// --- Subcomponentes de Abas (Definidos no mesmo arquivo para simplicidade) ---

const TabInfo: React.FC<{ company: Company }> = ({ company }) => {
  const { t } = useTranslation();
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  const plan = company.planos;
  const isActive = company.is_active;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building className="h-5 w-5" /> {t('company_details', { defaultValue: 'Detalhes da Empresa' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem icon={<Mail className="h-4 w-4" />} label={t('profile_email')} value={company.email || 'N/A'} />
          <DetailItem icon={<Phone className="h-4 w-4" />} label={t('user_table_header_phone')} value={company.telefone || 'N/A'} />
          <DetailItem icon={<MapPin className="h-4 w-4" />} label={t('client_table_header_address')} value={company.endereco_completo || 'N/A'} />
          <DetailItem icon={<Tag className="h-4 w-4" />} label="CNPJ" value={company.cnpj || 'N/A'} />
          <DetailItem icon={<CalendarCheck className="h-4 w-4" />} label={t('order_table_header_date')} value={format(new Date(company.created_at), 'dd/MM/yyyy', { locale: ptBR })} />
          <DetailItem 
            icon={<AlertTriangle className="h-4 w-4" />} 
            label={t('order_table_header_status')} 
            value={isActive ? t('company_status_active') : t('company_status_inactive')} 
            valueClass={isActive ? "text-green-500" : "text-destructive"}
          />
        </CardContent>
      </Card>
      
      {/* Detalhes do Plano */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5" /> {t('plan_name', { defaultValue: 'Plano de Assinatura' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem icon={<Tag className="h-4 w-4" />} label={t('plan_name')} value={plan?.nome || 'N/A'} />
          <DetailItem icon={<DollarSign className="h-4 w-4" />} label={t('plan_price')} value={plan ? formatCurrency(plan.preco) : 'N/A'} />
          <DetailItem icon={<Calendar className="h-4 w-4" />} label={t('start_date')} value={plan?.data_inicio ? format(new Date(plan.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'} />
          <DetailItem icon={<Calendar className="h-4 w-4" />} label={t('end_date')} value={plan?.data_fim ? format(new Date(plan.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'} />
        </CardContent>
      </Card>
    </div>
  );
};

const TabUsers: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  // Filtra usuários no lado do cliente, pois useUsers busca todos (para SA) ou apenas os da empresa (para Admin)
  const { data: allUsers, isLoading, isError } = useUsers();
  
  const users = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => u.empresa_id === companyId);
  }, [allUsers, companyId]);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={users.length} title={t('nav_users')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('user_table_header_name')}</TableHead>
            <TableHead>{t('profile_email')}</TableHead>
            <TableHead>{t('user_table_header_profile')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.nome_completo}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{user.email || 'N/A'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{user.perfis?.nome || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabClients: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: allClients, isLoading, isError } = useClients();
  
  const clients = useMemo(() => {
    if (!allClients) return [];
    return allClients.filter(c => c.empresa_id === companyId);
  }, [allClients, companyId]);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={clients.length} title={t('nav_clients')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('user_table_header_name')}</TableHead>
            <TableHead>{t('profile_email')}</TableHead>
            <TableHead>{t('user_table_header_phone')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map(client => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.nome}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{client.email || 'N/A'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{client.telefone || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabProducts: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: allProducts, isLoading, isError } = useProductsOnly();
  
  const products = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(p => p.empresa_id === companyId);
  }, [allProducts, companyId]);
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={products.length} title={t('nav_products')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('product_name')}</TableHead>
            <TableHead>{t('product_table_header_category')}</TableHead>
            <TableHead className="text-right">{t('product_table_header_stock')}</TableHead>
            <TableHead className="text-right">{t('product_table_header_price')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(product => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.nome}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{product.categorias?.nome || 'N/A'}</TableCell>
              <TableCell className="text-right font-semibold">{product.estoque_total !== null ? product.estoque_total : 'N/A'}</TableCell>
              <TableCell className="text-right text-primary font-semibold">{formatCurrency(product.preco)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabServices: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: allServices, isLoading, isError } = useServicesOnly();
  
  const services = useMemo(() => {
    if (!allServices) return [];
    return allServices.filter(s => s.empresa_id === companyId);
  }, [allServices, companyId]);
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={services.length} title={t('nav_services')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('service_name')}</TableHead>
            <TableHead>{t('product_table_header_category')}</TableHead>
            <TableHead className="text-right">{t('service_table_header_duration')}</TableHead>
            <TableHead className="text-right">{t('product_table_header_price')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map(service => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.nome}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{service.categorias?.nome || 'N/A'}</TableCell>
              <TableCell className="text-right font-semibold">{service.tempo_servico ? `${service.tempo_servico} min` : 'N/A'}</TableCell>
              <TableCell className="text-right text-primary font-semibold">{formatCurrency(service.preco)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabOrders: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  // Filtra pedidos no lado do cliente, pois useOrders busca todos (para SA) ou apenas os da empresa (para Admin)
  const { data: allOrders, isLoading, isError } = useOrders();
  
  const orders = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.filter(o => o.empresa_id === companyId);
  }, [allOrders, companyId]);
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={orders.length} title={t('nav_orders')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('order_table_header_id')}</TableHead>
            <TableHead>{t('order_table_header_client')}</TableHead>
            <TableHead>{t('order_table_header_date')}</TableHead>
            <TableHead className="text-right">{t('order_table_header_total')}</TableHead>
            <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(order => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
              <TableCell className="font-medium">{order.clientes?.nome || 'N/A'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
              <TableCell className="text-right text-primary font-semibold">{formatCurrency(order.valor_total)}</TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="capitalize">{t(order.status.replace('_', ' '))}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabAppointments: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: allAppointments, isLoading, isError } = useAppointments();
  
  const appointments = useMemo(() => {
    if (!allAppointments) return [];
    return allAppointments.filter(a => a.empresa_id === companyId);
  }, [allAppointments, companyId]);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={appointments.length} title={t('nav_appointments')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('order_table_header_client')}</TableHead>
            <TableHead>{t('responsible')}</TableHead>
            <TableHead>{t('order_table_header_date')}</TableHead>
            <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map(app => (
            <TableRow key={app.id}>
              <TableCell className="font-medium">{app.clientes?.nome || 'N/A'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{app.responsavel?.nome_completo || 'N/A'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(app.data_hora), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="capitalize">{t(app.status)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabCategories: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: categories, isLoading, isError } = useCategories(companyId);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={categories?.length || 0} title={t('page_title_categories')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('category_name')}</TableHead>
            <TableHead>{t('order_table_header_date')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories?.map(cat => (
            <TableRow key={cat.id}>
              <TableCell className="font-medium">{cat.nome}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(cat.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabTeams: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: teams, isLoading, isError } = useTeams(companyId);
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={teams?.length || 0} title={t('nav_teams')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('team_name')}</TableHead>
            <TableHead className="text-right">{t('team_meta_value')}</TableHead>
            <TableHead className="text-right">{t('team_meta_quantity')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams?.map(team => (
            <TableRow key={team.id}>
              <TableCell className="font-medium">{team.nome}</TableCell>
              <TableCell className="text-right text-primary font-semibold">{formatCurrency(team.meta_mensal_valor)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{team.meta_mensal_quantidade} {t('units')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabPromotions: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: promotions, isLoading, isError } = usePromotions(companyId);

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={promotions?.length || 0} title={t('page_title_promotions')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('promotion_name')}</TableHead>
            <TableHead className="text-center">{t('discount_percentage')}</TableHead>
            <TableHead>{t('start_date')}</TableHead>
            <TableHead>{t('end_date')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promotions?.map(promo => (
            <TableRow key={promo.id}>
              <TableCell className="font-medium">{promo.nome}</TableCell>
              <TableCell className="text-center font-semibold text-primary">{promo.desconto_percentual}%</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(promo.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(promo.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabCommissions: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: rules, isLoading, isError } = useCommissionRules(companyId);
  
  const formatValue = (rule: any) => {
    if (rule.tipo_valor === 'fixo') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rule.valor);
    }
    return `${rule.valor}%`;
  };

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={rules?.length || 0} title={t('commission_rules_title')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('commission_entity_type')}</TableHead>
            <TableHead>{t('commission_entity')}</TableHead>
            <TableHead className="text-right">{t('commission_value')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules?.map(rule => (
            <TableRow key={rule.id}>
              <TableCell className="font-medium capitalize">{t(rule.tipo_entidade)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {rule.entidades?.map(e => e.nome).join(', ') || 'Geral'}
              </TableCell>
              <TableCell className="text-right text-primary font-semibold">{formatValue(rule)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};

const TabPlanModules: React.FC<{ planId: string | null }> = ({ planId }) => {
  const { t } = useTranslation();
  const { data: modules, isLoading, isError } = usePlanModules(planId || '');
  
  if (!planId) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4 text-muted-foreground">
          {t('no_plan_associated', { defaultValue: 'Nenhum plano associado a esta empresa.' })}
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTabWrapper isLoading={isLoading} isError={isError} count={modules?.length || 0} title={t('module_permissions')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('module_name', { defaultValue: 'Módulo' })}</TableHead>
            <TableHead className="text-center">{t('access_level', { defaultValue: 'Nível de Acesso' })}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules?.map(mod => (
            <TableRow key={mod.modulo_id}>
              <TableCell className="font-medium">{t(mod.modulos.nome)}</TableCell>
              <TableCell className="text-center text-sm text-primary font-semibold capitalize">
                {t(mod.acesso)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTabWrapper>
  );
};


// --- Componentes Auxiliares ---

const DetailItem: React.FC<{ icon: React.ReactNode, label: string, value: string, valueClass?: string }> = ({ icon, label, value, valueClass }) => (
  <div className="flex items-center space-x-3">
    {icon}
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold", valueClass)}>{value}</p>
    </div>
  </div>
);

const DataTabWrapper: React.FC<{ children: React.ReactNode, isLoading: boolean, isError: boolean, count: number, title: string }> = ({ children, isLoading, isError, count, title }) => {
  const { t } = useTranslation();
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {title} ({count})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center p-4 text-destructive">
            {t('chart_error')}
          </div>
        ) : count > 0 ? (
          <div className="overflow-x-auto">
            {children}
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            {t('no_data_found')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


// --- Componente Principal ---

const CompanyDetailsDialog: React.FC<CompanyDetailsDialogProps> = ({ company, isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  
  if (!company) return null;
  
  const defaultTab = 'info';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building className="h-6 w-6" /> {company.nome}
          </DialogTitle>
          <CardDescription className="text-sm">
            {t('company_details_modal_subtitle', { defaultValue: 'Visão completa de todos os dados associados a esta empresa.' })}
          </CardDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full flex flex-nowrap overflow-x-auto mb-4">
              <TabsTrigger value="info" className="flex-1"><Building className="h-4 w-4 mr-2" /> {t('info', { defaultValue: 'Info' })}</TabsTrigger>
              <TabsTrigger value="users" className="flex-1"><User className="h-4 w-4 mr-2" /> {t('nav_users')}</TabsTrigger>
              <TabsTrigger value="clients" className="flex-1"><Users className="h-4 w-4 mr-2" /> {t('nav_clients')}</TabsTrigger>
              <TabsTrigger value="products" className="flex-1"><Package className="h-4 w-4 mr-2" /> {t('nav_products')}</TabsTrigger>
              <TabsTrigger value="services" className="flex-1"><Clock className="h-4 w-4 mr-2" /> {t('nav_services')}</TabsTrigger>
              <TabsTrigger value="orders" className="flex-1"><ShoppingCart className="h-4 w-4 mr-2" /> {t('nav_orders')}</TabsTrigger>
              <TabsTrigger value="appointments" className="flex-1"><CalendarCheck className="h-4 w-4 mr-2" /> {t('nav_appointments')}</TabsTrigger>
              <TabsTrigger value="categories" className="flex-1"><Tag className="h-4 w-4 mr-2" /> {t('page_title_categories')}</TabsTrigger>
              <TabsTrigger value="teams" className="flex-1"><Target className="h-4 w-4 mr-2" /> {t('nav_teams')}</TabsTrigger>
              <TabsTrigger value="promotions" className="flex-1"><DollarSign className="h-4 w-4 mr-2" /> {t('page_title_promotions')}</TabsTrigger>
              <TabsTrigger value="commissions" className="flex-1"><HandCoins className="h-4 w-4 mr-2" /> {t('page_title_commissions')}</TabsTrigger>
              <TabsTrigger value="plan_modules" className="flex-1"><ShieldCheck className="h-4 w-4 mr-2" /> {t('module_permissions')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info"><TabInfo company={company} /></TabsContent>
            <TabsContent value="users"><TabUsers companyId={company.id} /></TabsContent>
            <TabsContent value="clients"><TabClients companyId={company.id} /></TabsContent>
            <TabsContent value="products"><TabProducts companyId={company.id} /></TabsContent>
            <TabsContent value="services"><TabServices companyId={company.id} /></TabsContent>
            <TabsContent value="orders"><TabOrders companyId={company.id} /></TabsContent>
            <TabsContent value="appointments"><TabAppointments companyId={company.id} /></TabsContent>
            <TabsContent value="categories"><TabCategories companyId={company.id} /></TabsContent>
            <TabsContent value="teams"><TabTeams companyId={company.id} /></TabsContent>
            <TabsContent value="promotions"><TabPromotions companyId={company.id} /></TabsContent>
            <TabsContent value="commissions"><TabCommissions companyId={company.id} /></TabsContent>
            <TabsContent value="plan_modules"><TabPlanModules planId={company.plano_id} /></TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyDetailsDialog;