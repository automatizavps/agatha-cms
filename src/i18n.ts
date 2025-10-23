import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Recursos de tradução
const resources = {
  'pt-BR': {
    translation: {
      // Geral
      "app_name": "AGATHA IA",
      "loading": "Carregando...",
      "actions": "Ações",
      "save_changes": "Salvar Alterações",
      "try_again": "Tentar Novamente",
      "not_found": "Página não encontrada",
      "error_loading_data": "Não foi possível carregar os dados.",
      "no_data_found": "Nenhum dado encontrado.",
      "search_placeholder": "Buscar...",
      "add_new": "Adicionar Novo",
      "edit": "Editar",
      "delete": "Excluir",
      "confirm_delete": "Tem certeza que deseja excluir?",
      "achieved": "atingido",
      "units": "unidades",
      "none": "Nenhum", // NOVO
      "minutes": "minutos", // NOVO
      
      // Navegação
      "nav_home": "Home",
      "nav_analytics": "Analytics",
      "nav_users": "Usuários",
      "nav_appointments": "Agendamentos",
      "nav_clients": "Clientes",
      "nav_products": "Produtos",
      "nav_services": "Serviços",
      "nav_orders": "Pedidos",
      "nav_teams": "Equipes",
      "nav_companies": "Empresas",
      "nav_settings": "Configurações",
      "nav_profile": "Meu Perfil",
      "nav_general": "Geral",
      "nav_operational": "Operacional",
      "nav_config": "Configurações",
      "nav_products_services": "Produtos & Serviços", // NOVO
      "nav_categories": "Categorias", // NOVO
      "nav_notifications": "Notificações", // NOVO

      // Dashboard
      "dashboard_title": "Visão Geral do Dashboard",
      "total_appointments": "Total de Agendamentos",
      "confirmed_appointments": "Confirmados",
      "pending_appointments": "Pendentes",
      "appointments_overview": "Visão geral de todos os agendamentos",
      "confirmed_status": "Agendamentos com status 'confirmado'",
      "pending_status": "Aguardando confirmação",
      "team_goals_section_title": "Metas das Equipes",
      "team_goals_progress_placeholder": "Progresso em relação à meta será exibido aqui.",
      
      // Novas Métricas do Dashboard
      "daily_revenue": "Faturamento Diário",
      "daily_revenue_overview": "Pedidos entregues nas últimas 24h",
      "weekly_revenue": "Faturamento Semanal",
      "weekly_revenue_overview": "Pedidos entregues nos últimos 7 dias",
      "total_products": "Total de Produtos",
      "total_products_overview": "Produtos cadastrados na empresa",
      "latest_products_title": "Últimos Produtos Cadastrados", // NOVO
      
      // Páginas
      "page_title_analytics": "Analytics",
      "page_subtitle_analytics": "Relatórios detalhados e visualizações de dados.",
      "chart_title_appointment_status": "Distribuição de Status de Agendamentos",
      "chart_no_data": "Nenhum dado de agendamento para exibir.",
      "chart_error": "Erro ao carregar dados do gráfico.",
      "analytics_placeholder": "Outros relatórios e métricas virão aqui.",
      
      "page_title_users": "Gestão de Usuários",
      "user_list_title": "Lista de Usuários",
      "user_search_placeholder": "Buscar por nome ou perfil...",
      "add_new_user": "Adicionar Novo Usuário",
      "no_users_found": "Nenhum usuário encontrado para esta empresa.",
      "no_users_search": "Nenhum usuário encontrado com o termo de busca.",
      "user_table_header_name": "Nome",
      "user_table_header_company": "Empresa",
      "user_table_header_phone": "Telefone",
      "user_table_header_address": "Endereço",
      "user_table_header_profile": "Perfil",
      
      "page_title_companies": "Gestão de Empresas",
      "company_list_title": "Lista de Empresas",
      "add_new_company": "Nova Empresa",
      "no_companies_found": "Nenhuma empresa cadastrada.",
      
      "page_title_clients": "Gestão de Clientes",
      "client_list_title": "Lista de Clientes",
      "add_new_client": "Novo Cliente",
      "client_search_placeholder": "Buscar por nome, email, telefone ou endereço...",
      "filter_all_companies": "Todas as Empresas",
      "no_clients_found": "Nenhum cliente encontrado com os filtros aplicados.",
      "client_table_header_address": "Endereço",
      
      "page_title_products": "Gestão de Produtos",
      "product_list_title": "Lista de Produtos",
      "add_new_product": "Novo Produto",
      "product_search_placeholder": "Buscar por nome, categoria ou marca...",
      "filter_all_categories": "Todas as Categorias",
      "filter_all_brands": "Todas as Marcas",
      "low_stock_alert_title": "Atenção: Estoque Baixo!",
      "low_stock_alert_description": "Os seguintes produtos estão com estoque abaixo de {{threshold}} unidades:",
      "product_table_header_stock": "Estoque",
      "product_table_header_price": "Preço",
      "product_table_header_brand": "Marca",
      "product_table_header_category": "Categoria",
      "no_products_found": "Nenhum produto encontrado com os filtros aplicados.",
      "product_name": "Nome do Produto", // NOVO
      "product_name_placeholder": "Nome do produto", // NOVO
      "create_product": "Cadastrar Produto", // NOVO
      "stock_quantity_placeholder": "Quantidade em estoque", // NOVO
      
      "page_title_services": "Gestão de Serviços",
      "service_list_title": "Lista de Serviços",
      "add_new_service": "Novo Serviço",
      "service_search_placeholder": "Buscar por nome ou categoria...",
      "service_table_header_duration": "Duração",
      "no_services_found": "Nenhum serviço cadastrado.",
      "service_name": "Nome do Serviço", // NOVO
      "service_name_placeholder": "Nome do serviço", // NOVO
      "create_service": "Cadastrar Serviço", // NOVO
      
      "page_title_orders": "Gestão de Pedidos",
      "order_list_title": "Lista de Pedidos",
      "add_new_order": "Novo Pedido",
      "order_search_placeholder": "Buscar por cliente, status ou ID...",
      "order_table_header_id": "Pedido #",
      "order_table_header_client": "Cliente",
      "order_table_header_date": "Data",
      "order_table_header_total": "Valor Total",
      "order_table_header_status": "Status",
      "no_orders_found": "Nenhum pedido cadastrado.",
      
      "page_title_settings": "Configurações",
      "page_subtitle_settings": "Gerencie as configurações da sua conta e da sua empresa.",
      "settings_user_title": "Configurações da Conta",
      "settings_company_title": "Detalhes da Empresa",
      
      "page_title_profile": "Meu Perfil",
      "page_subtitle_profile": "Visualize e gerencie suas informações de conta.",
      "profile_personal_info": "Informações Pessoais",
      "profile_full_name": "Nome Completo",
      "profile_email": "Email",
      "profile_role": "Perfil de Acesso",
      "profile_company_id": "ID da Empresa",
      
      "not_found_title": "404",
      "not_found_message": "Oops! Página não encontrada",
      "not_found_return": "Voltar para Home",
      
      // Equipes (Teams)
      "page_title_teams": "Gestão de Equipes",
      "team_list_title": "Lista de Equipes",
      "add_new_team": "Nova Equipe",
      "no_teams_found": "Nenhuma equipe cadastrada.",
      "team_search_placeholder": "Buscar por nome da equipe ou empresa...",
      "team_name": "Nome da Equipe",
      "team_name_placeholder": "Ex: Equipe de Vendas, Manutenção",
      "team_meta_value": "Meta Mensal (Valor)",
      "team_meta_quantity": "Meta Mensal (Quantidade)",
      "team_members": "Membros da Equipe",
      "select_members": "Selecione os membros",
      "members_selected": "{{count}} membro(s) selecionado(s)",
      "no_members": "Nenhum membro",
      "create_team": "Criar Equipe",
      "edit_team": "Editar Equipe",
      "loading_team_data": "Carregando dados da equipe...",
      "team_created_success": "Equipe {{name}} criada com sucesso!",
      "team_updated_success": "Equipe {{name}} atualizada com sucesso!",
      "team_deleted_success": "Equipe {{name}} excluída com sucesso!",
      "team_members_update_error": "Erro ao atualizar membros da equipe: ",
      "select_valid_company": "Selecione uma empresa válida.",
      "company_required_super_admin": "A empresa é obrigatória para o Super Admin.",
      "loading_companies": "Carregando empresas...",
      "select_company": "Selecione a empresa",
      "search_user": "Buscar usuário...",
      "company_not_found": "Empresa não encontrada", // NOVO
      
      // Categorias (Categories) - NOVO
      "page_title_categories": "Gestão de Categorias",
      "category_list_title": "Lista de Categorias",
      "add_new_category": "Nova Categoria",
      "no_categories_found": "Nenhuma categoria encontrada.",
      "category_search_placeholder": "Buscar por nome da categoria...",
      "category_name": "Nome da Categoria",
      "category_name_placeholder": "Ex: Shampoos, Cortes de Cabelo",
      "create_category": "Criar Categoria",
      "edit_category": "Editar Categoria",
      "category_created_success": "Categoria {{name}} criada com sucesso!",
      "category_updated_success": "Categoria {{name}} atualizada com sucesso!",
      "category_deleted_success": "Categoria {{name}} excluída com sucesso!",
      "select_category": "Selecione a categoria",
      "search_category": "Buscar categoria...",
      
      // Notificações (Notifications) - NOVO
      "notifications_marked_read": "Todas as notificações marcadas como lidas.",
      "mark_all_read": "Marcar todas como lidas",
      "no_notifications_found": "Nenhuma notificação recente.",
    },
  },
  en: {
    translation: {
      // General
      "app_name": "AGATHA AI",
      "loading": "Loading...",
      "actions": "Actions",
      "save_changes": "Save Changes",
      "try_again": "Try Again",
      "not_found": "Page not found",
      "error_loading_data": "Failed to load data.",
      "no_data_found": "No data found.",
      "search_placeholder": "Search...",
      "add_new": "Add New",
      "edit": "Edit",
      "delete": "Delete",
      "confirm_delete": "Are you sure you want to delete?",
      "achieved": "achieved",
      "units": "units",
      "none": "None", // NOVO
      "minutes": "minutes", // NOVO

      // Navigation
      "nav_home": "Home",
      "nav_analytics": "Analytics",
      "nav_users": "Users",
      "nav_appointments": "Appointments",
      "nav_clients": "Clients",
      "nav_products": "Products",
      "nav_services": "Services",
      "nav_orders": "Orders",
      "nav_teams": "Teams",
      "nav_companies": "Companies",
      "nav_settings": "Settings",
      "nav_profile": "My Profile",
      "nav_general": "General",
      "nav_operational": "Operational",
      "nav_config": "Settings",
      "nav_products_services": "Products & Services", // NOVO
      "nav_categories": "Categories", // NOVO
      "nav_notifications": "Notifications", // NOVO

      // Dashboard
      "dashboard_title": "Dashboard Overview",
      "total_appointments": "Total Appointments",
      "confirmed_appointments": "Confirmed",
      "pending_appointments": "Pending",
      "appointments_overview": "Overview of all appointments",
      "confirmed_status": "Appointments with 'confirmed' status",
      "pending_status": "Awaiting confirmation",
      "team_goals_section_title": "Team Goals",
      "team_goals_progress_placeholder": "Progress towards the goal will be displayed here.",
      
      // Novas Métricas do Dashboard
      "daily_revenue": "Daily Revenue",
      "daily_revenue_overview": "Orders delivered in the last 24h",
      "weekly_revenue": "Weekly Revenue",
      "weekly_revenue_overview": "Orders delivered in the last 7 days",
      "total_products": "Total Products",
      "total_products_overview": "Products registered in the company",
      "latest_products_title": "Latest Registered Products", // NOVO

      // Pages
      "page_title_analytics": "Analytics",
      "page_subtitle_analytics": "Detailed reports and data visualizations.",
      "chart_title_appointment_status": "Appointment Status Distribution",
      "chart_no_data": "No appointment data to display.",
      "chart_error": "Error loading chart data.",
      "analytics_placeholder": "Other reports and metrics will come here.",
      
      "page_title_users": "User Management",
      "user_list_title": "User List",
      "user_search_placeholder": "Search by name or profile...",
      "add_new_user": "Add New User",
      "no_users_found": "No users found for this company.",
      "no_users_search": "No users found matching the search term.",
      "user_table_header_name": "Name",
      "user_table_header_company": "Company",
      "user_table_header_phone": "Phone",
      "user_table_header_address": "Address",
      "user_table_header_profile": "Profile",
      
      "page_title_companies": "Company Management",
      "company_list_title": "Company List",
      "add_new_company": "New Company",
      "no_companies_found": "No companies registered.",
      
      "page_title_clients": "Client Management",
      "client_list_title": "Client List",
      "add_new_client": "New Client",
      "client_search_placeholder": "Search by name, email, phone, or address...",
      "filter_all_companies": "All Companies",
      "no_clients_found": "No clients found with the applied filters.",
      "client_table_header_address": "Address",
      
      "page_title_products": "Product Management",
      "product_list_title": "Product List",
      "add_new_product": "New Product",
      "product_search_placeholder": "Search by name, category, or brand...",
      "filter_all_categories": "All Categories",
      "filter_all_brands": "All Brands",
      "low_stock_alert_title": "Attention: Low Stock!",
      "low_stock_alert_description": "The following products are below {{threshold}} units in stock:",
      "product_table_header_stock": "Stock",
      "product_table_header_price": "Price",
      "product_table_header_brand": "Brand",
      "product_table_header_category": "Category",
      "no_products_found": "No products found with the applied filters.",
      "product_name": "Product Name", // NOVO
      "product_name_placeholder": "Product name", // NOVO
      "create_product": "Register Product", // NOVO
      "stock_quantity_placeholder": "Quantity in stock", // NOVO
      
      "page_title_services": "Service Management",
      "service_list_title": "Service List",
      "add_new_service": "New Service",
      "service_search_placeholder": "Search by name or category...",
      "service_table_header_duration": "Duration",
      "no_services_found": "No services registered.",
      "service_name": "Service Name", // NOVO
      "service_name_placeholder": "Service name", // NOVO
      "create_service": "Register Service", // NOVO
      
      "page_title_orders": "Order Management",
      "order_list_title": "Order List",
      "add_new_order": "New Order",
      "order_search_placeholder": "Search by client, status, or ID...",
      "order_table_header_id": "Order #",
      "order_table_header_client": "Client",
      "order_table_header_date": "Date",
      "order_table_header_total": "Total Value",
      "order_table_header_status": "Status",
      "no_orders_found": "No orders registered.",
      
      "page_title_settings": "Settings",
      "page_subtitle_settings": "Manage your account and company settings.",
      "settings_user_title": "Account Settings",
      "settings_company_title": "Company Details",
      
      "page_title_profile": "My Profile",
      "page_subtitle_profile": "View and manage your account information.",
      "profile_personal_info": "Personal Information",
      "profile_full_name": "Full Name",
      "profile_email": "Email",
      "profile_role": "Access Profile",
      "profile_company_id": "Company ID",
      
      "not_found_title": "404",
      "not_found_message": "Oops! Page not found",
      "not_found_return": "Return to Home",
      
      // Equipes (Teams)
      "page_title_teams": "Team Management",
      "team_list_title": "Team List",
      "add_new_team": "New Team",
      "no_teams_found": "No teams registered.",
      "team_search_placeholder": "Search by team name or company...",
      "team_name": "Team Name",
      "team_name_placeholder": "Ex: Sales Team, Maintenance",
      "team_meta_value": "Monthly Goal (Value)",
      "team_meta_quantity": "Monthly Goal (Quantity)",
      "team_members": "Team Members",
      "select_members": "Select members",
      "members_selected": "{{count}} member(s) selected",
      "no_members": "No members",
      "create_team": "Create Team",
      "edit_team": "Edit Team",
      "loading_team_data": "Loading team data...",
      "team_created_success": "Team {{name}} created successfully!",
      "team_updated_success": "Team {{name}} updated successfully!",
      "team_deleted_success": "Team {{name}} deleted successfully!",
      "team_members_update_error": "Error updating team members: ",
      "select_valid_company": "Select a valid company.",
      "company_required_super_admin": "Company is required for Super Admin.",
      "loading_companies": "Loading companies...",
      "select_company": "Select company",
      "search_user": "Search user...",
      "company_not_found": "Company not found", // NOVO
      
      // Categorias (Categories) - NOVO
      "page_title_categories": "Category Management",
      "category_list_title": "Category List",
      "add_new_category": "New Category",
      "no_categories_found": "No categories found.",
      "category_search_placeholder": "Search by category name...",
      "category_name": "Category Name",
      "category_name_placeholder": "Ex: Shampoos, Haircuts",
      "create_category": "Create Category",
      "edit_category": "Edit Category",
      "category_created_success": "Category {{name}} created successfully!",
      "category_updated_success": "Category {{name}} updated successfully!",
      "category_deleted_success": "Category {{name}} deleted successfully!",
      "select_category": "Select category",
      "search_category": "Search category...",
      
      // Notificações (Notifications) - NOVO
      "notifications_marked_read": "All notifications marked as read.",
      "mark_all_read": "Mark all as read",
      "no_notifications_found": "No recent notifications.",
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR', // Idioma padrão
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React já protege contra XSS
    },
  });

export default i18n;