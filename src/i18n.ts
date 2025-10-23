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
      "daily_revenue_overview": "Pedidos entregues hoje",
      "weekly_revenue": "Faturamento Semanal",
      "weekly_revenue_overview": "Pedidos entregues esta semana",
      "total_products": "Total de Produtos",
      "total_products_overview": "Produtos cadastrados na empresa",
      "latest_products_title": "Últimos Produtos Cadastrados", // NOVO
      "top_selling_items_title": "Top 10 Produtos Mais Vendidos (Unidades)", // NOVO
      "top_selling_services_title": "Top 10 Serviços Mais Realizados", // NOVO
      "total_sold": "Total Vendido", // NOVO
      "total_realized": "Total Realizado", // NOVO
      
      // Páginas
      "page_title_analytics": "Analytics",
      "page_subtitle_analytics": "Relatórios detalhados e visualizações de dados.",
      "chart_title_appointment_status": "Status dos Agendamentos (Hoje)", // ALTERADO
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
      "create_order": "Criar Pedido", // NOVO
      "update_order_button": "Atualizar Pedido", // NOVO
      
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
      
      // Senha (Password) - NOVO
      "change_password": "Mudar Senha",
      "new_password": "Nova Senha",
      "confirm_new_password": "Confirmar Nova Senha",
      "update_password_button": "Atualizar Senha",
      
      // Gráfico de Serviços por Hora (NOVO)
      "chart_title_daily_services": "Serviços Concluídos por Hora (Hoje)",
      "chart_no_data_today": "Nenhum serviço concluído hoje para exibir.",
      "services_completed": "Serviços Concluídos",
      
      // Gráfico de Pedidos por Hora (NOVO)
      "chart_title_daily_orders": "Pedidos Entregues por Hora (Hoje)",
      "chart_no_data_today_orders": "Nenhum pedido entregue hoje para exibir.",
      "orders_delivered": "Pedidos Entregues",
      "chart_title_order_status": "Status dos Pedidos (Hoje)",
      "select_company_for_metrics": "Selecione uma empresa para visualizar métricas detalhadas.",
      
      "count": "Contagem",
      
      // Agendamento (Appointment) - NOVO
      "responsible": "Responsável",
      "select_responsible": "Selecione o responsável",
      "select_date": "Selecione uma data",
      "time": "Hora",
      "service_product": "Serviço/Produto",
      "add_item": "Adicionar Item",
      "select_item": "Selecione o item",
      "loading_items": "Carregando itens...",
      "quantity": "Quantidade",
      "unit_price": "Preço Unitário",
      "schedule": "Agendar",
      "unknown_item": "Item Desconhecido",
      "add_services_or_products": "Adicione serviços ou produtos ao agendamento.",
      "item_editing_not_allowed": "A edição de itens não é permitida após a criação do agendamento.",
      "select_client": "Selecione o cliente",
      "loading_clients": "Carregando clientes...",
      "search_client": "Buscar cliente...",
      "item": "Item",
      "select_company_to_load_data": "Selecione uma empresa para carregar clientes, usuários e itens.",
      "add_new_appointment": "Novo Agendamento", // NOVO
      
      // Chave que faltava
      "page_title_appointments": "Gestão de Agendamentos",
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR', // Idioma padrão
    fallbackLng: 'pt-BR', // Fallback para pt-BR
    interpolation: {
      escapeValue: false, // React já protege contra XSS
    },
  });

export default i18n;