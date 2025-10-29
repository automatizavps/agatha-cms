-- Habilita a extensão uuid-ossp para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilita a extensão pgcrypto para criptografia (usada em algumas funções de auth)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================================================
-- 1. TABELAS
-- =====================================================================================================================

-- Tabela: planos
CREATE TABLE public.planos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome text NOT NULL UNIQUE,
    limite_usuarios integer NOT NULL DEFAULT 1,
    preco numeric(10, 2) NOT NULL DEFAULT 0.00,
    data_inicio timestamp with time zone,
    data_fim timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: empresas
CREATE TABLE public.empresas (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome text NOT NULL,
    cnpj text UNIQUE,
    dono_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    telefone text,
    endereco_completo text,
    email text,
    is_active boolean DEFAULT TRUE NOT NULL,
    plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: modulos
CREATE TABLE public.modulos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome text NOT NULL UNIQUE,
    descricao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Inserir módulos padrão
INSERT INTO public.modulos (nome, descricao) VALUES
('users', 'Gerenciamento de usuários e seus perfis de acesso.'),
('clients', 'Gerenciamento de clientes e seus dados.'),
('products', 'Gerenciamento de produtos físicos e seus estoques.'),
('services', 'Gerenciamento de serviços e seus tempos de duração.'),
('orders', 'Gerenciamento de pedidos de produtos.'),
('appointments', 'Gerenciamento de agendamentos de serviços.'),
('teams', 'Gerenciamento de equipes e suas metas.'),
('analytics', 'Visualização de relatórios e métricas de desempenho.'),
('companies', 'Gerenciamento de empresas (apenas para Super Admin).'),
('notifications', 'Visualização e gerenciamento de notificações.'),
('custom_profiles', 'Criação e gerenciamento de perfis de acesso customizados.'),
('categories', 'Gerenciamento de categorias para produtos e serviços.'),
('promotions', 'Gerenciamento de promoções e regras de desconto.'),
('commissions', 'Gerenciamento de regras e pagamentos de comissionamento.');


-- Tabela: perfis_customizados
CREATE TABLE public.perfis_customizados (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (empresa_id, nome)
);

-- Tabela: permissao_modulos (para perfis customizados)
CREATE TABLE public.permissao_modulos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    perfil_customizado_id uuid REFERENCES public.perfis_customizados(id) ON DELETE CASCADE NOT NULL,
    modulo_id uuid REFERENCES public.modulos(id) ON DELETE CASCADE NOT NULL,
    acesso text NOT NULL CHECK (acesso IN ('leitura', 'escrita', 'sem_acesso')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (perfil_customizado_id, modulo_id)
);

-- Tabela: plano_modulos (para planos)
CREATE TABLE public.plano_modulos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    plano_id uuid REFERENCES public.planos(id) ON DELETE CASCADE NOT NULL,
    modulo_id uuid REFERENCES public.modulos(id) ON DELETE CASCADE NOT NULL,
    acesso text NOT NULL CHECK (acesso IN ('leitura', 'escrita', 'sem_acesso')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (plano_id, modulo_id)
);

-- Tabela: usuarios
CREATE TABLE public.usuarios (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nome_completo text NOT NULL,
    avatar_url text,
    telefone text,
    endereco_completo text,
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
    perfil_customizado_id uuid REFERENCES public.perfis_customizados(id) ON DELETE SET NULL,
    is_active boolean DEFAULT TRUE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: clientes
CREATE TABLE public.clientes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome text NOT NULL,
    email text,
    telefone text,
    endereco_completo text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: categorias
CREATE TABLE public.categorias (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (empresa_id, nome)
);

-- Tabela: produtos (inclui produtos e serviços)
CREATE TABLE public.produtos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome text NOT NULL,
    preco numeric(10, 2) NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('produto', 'servico')),
    tempo_servico integer, -- Em minutos, para serviços
    estoque_total integer, -- Para produtos
    fotos text[], -- Array de URLs de fotos
    marca text,
    categoria uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (empresa_id, nome)
);

-- Tabela: equipes
CREATE TABLE public.equipes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome text NOT NULL,
    meta_mensal_valor numeric(10, 2) NOT NULL DEFAULT 0.00,
    meta_mensal_quantidade integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (empresa_id, nome)
);

-- Tabela: equipe_membros
CREATE TABLE public.equipe_membros (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipe_id uuid REFERENCES public.equipes(id) ON DELETE CASCADE NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (equipe_id, usuario_id)
);

-- Tabela: promocoes
CREATE TABLE public.promocoes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome text NOT NULL,
    data_inicio timestamp with time zone NOT NULL,
    data_fim timestamp with time zone NOT NULL,
    desconto_percentual numeric(5, 2) NOT NULL CHECK (desconto_percentual > 0 AND desconto_percentual <= 100),
    is_active boolean DEFAULT TRUE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: promocao_regras
CREATE TABLE public.promocao_regras (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    promocao_id uuid REFERENCES public.promocoes(id) ON DELETE CASCADE NOT NULL,
    tipo_regra text NOT NULL CHECK (tipo_regra IN ('categoria', 'produto', 'servico')),
    entidade_id uuid NOT NULL, -- ID da categoria, produto ou serviço
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (promocao_id, tipo_regra, entidade_id)
);

-- Tabela: pedidos
CREATE TABLE public.pedidos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
    responsavel_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    valor_total numeric(10, 2) NOT NULL,
    status text NOT NULL CHECK (status IN ('pendente_entrega', 'entregue', 'cancelado')),
    promocao_id uuid REFERENCES public.promocoes(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: pedido_itens
CREATE TABLE public.pedido_itens (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
    produto_id uuid REFERENCES public.produtos(id) ON DELETE RESTRICT NOT NULL, -- RESTRICT para não deletar produto com item de pedido
    quantidade integer NOT NULL CHECK (quantidade > 0),
    preco_unitario numeric(10, 2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (pedido_id, produto_id)
);

-- Tabela: agendamentos
CREATE TABLE public.agendamentos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
    responsavel_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    data_hora timestamp with time zone NOT NULL,
    status text NOT NULL CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
    created_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    promocao_id uuid REFERENCES public.promocoes(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: agendamento_itens
CREATE TABLE public.agendamento_itens (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE CASCADE NOT NULL,
    produto_id uuid REFERENCES public.produtos(id) ON DELETE RESTRICT NOT NULL, -- RESTRICT para não deletar serviço com item de agendamento
    quantidade integer NOT NULL CHECK (quantidade > 0),
    preco_unitario numeric(10, 2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (agendamento_id, produto_id)
);

-- Tabela: notificacoes
CREATE TABLE public.notificacoes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE, -- Pode ser nulo para notificações globais
    titulo text NOT NULL,
    mensagem text,
    link text,
    lida boolean DEFAULT FALSE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: comissionamento_regras
CREATE TABLE public.comissionamento_regras (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    tipo_entidade text NOT NULL CHECK (tipo_entidade IN ('produto', 'servico', 'categoria')),
    tipo_valor text NOT NULL CHECK (tipo_valor IN ('fixo', 'percentual')),
    valor numeric(10, 2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela: comissionamento_regras_entidades (NOVA)
CREATE TABLE public.comissionamento_regras_entidades (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    regra_id uuid REFERENCES public.comissionamento_regras(id) ON DELETE CASCADE NOT NULL,
    entidade_id uuid NOT NULL, -- ID da categoria, produto ou serviço
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (regra_id, entidade_id)
);

-- Tabela: comissionamento_regras_usuarios (NOVA)
CREATE TABLE public.comissionamento_regras_usuarios (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    regra_id uuid REFERENCES public.comissionamento_regras(id) ON DELETE CASCADE NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (regra_id, usuario_id)
);

-- Tabela: comissionamentos (registros de comissões calculadas)
CREATE TABLE public.comissionamentos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    referencia_id uuid NOT NULL, -- ID do pedido ou agendamento
    tipo_referencia text NOT NULL CHECK (tipo_referencia IN ('pedido', 'agendamento')),
    item_id uuid, -- ID do item do pedido/agendamento que gerou a comissão
    valor_comissao numeric(10, 2) NOT NULL,
    status text NOT NULL CHECK (status IN ('pendente', 'pago', 'cancelado')) DEFAULT 'pendente',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- =====================================================================================================================
-- 2. FUNÇÕES E TRIGGERS
-- =====================================================================================================================

-- Função para criar um perfil de usuário na tabela 'public.usuarios' após o registro em 'auth.users'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome_completo, avatar_url, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para 'handle_new_user'
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar o perfil de usuário na tabela 'public.usuarios' após atualização em 'auth.users'
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.usuarios
  SET
    nome_completo = NEW.raw_user_meta_data->>'full_name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    telefone = NEW.raw_user_meta_data->>'telefone',
    endereco_completo = NEW.raw_user_meta_data->>'endereco_completo'
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para 'handle_user_update'
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Função para criar um usuário administrador para a empresa recém-criada
CREATE OR REPLACE FUNCTION public.on_empresa_created()
RETURNS TRIGGER AS $$
DECLARE
    admin_user_id uuid;
    admin_profile_id uuid;
BEGIN
    -- Verifica se o dono_id existe e é um usuário válido
    IF NEW.dono_id IS NOT NULL THEN
        -- Atualiza o usuário dono para ser o administrador da nova empresa
        UPDATE public.usuarios
        SET empresa_id = NEW.id, perfil_customizado_id = NULL -- Define como Admin de Empresa
        WHERE id = NEW.dono_id
        RETURNING id INTO admin_user_id;

        IF admin_user_id IS NOT NULL THEN
            -- Opcional: Criar um perfil customizado "Admin" para a empresa se desejar
            -- INSERT INTO public.perfis_customizados (empresa_id, nome) VALUES (NEW.id, 'Administrador') RETURNING id INTO admin_profile_id;
            -- UPDATE public.usuarios SET perfil_customizado_id = admin_profile_id WHERE id = admin_user_id;

            -- Notificação para o dono da empresa
            INSERT INTO public.notificacoes (user_id, empresa_id, titulo, mensagem, link)
            VALUES (
                NEW.dono_id,
                NEW.id,
                'Empresa Criada com Sucesso!',
                'Sua empresa "' || NEW.nome || '" foi criada e você é o administrador.',
                '/settings'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para 'on_empresa_created'
DROP TRIGGER IF EXISTS on_empresa_created_trigger ON public.empresas;
CREATE TRIGGER on_empresa_created_trigger
AFTER INSERT ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.on_empresa_created();

-- Função para atualizar o estoque de produtos após a inserção de um item de pedido
CREATE OR REPLACE FUNCTION public.update_product_stock_on_order_item_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.produtos
    SET estoque_total = estoque_total - NEW.quantidade
    WHERE id = NEW.produto_id AND tipo = 'produto';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para 'update_product_stock_on_order_item_insert'
DROP TRIGGER IF EXISTS trg_update_product_stock_on_order_item_insert ON public.pedido_itens;
CREATE TRIGGER trg_update_product_stock_on_order_item_insert
AFTER INSERT ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_on_order_item_insert();

-- Função para restaurar o estoque de produtos após a exclusão de um item de pedido
CREATE OR REPLACE FUNCTION public.restore_product_stock_on_order_item_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.produtos
    SET estoque_total = estoque_total + OLD.quantidade
    WHERE id = OLD.produto_id AND tipo = 'produto';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para 'restore_product_stock_on_order_item_delete'
DROP TRIGGER IF EXISTS trg_restore_product_stock_on_order_item_delete ON public.pedido_itens;
CREATE TRIGGER trg_restore_product_stock_on_order_item_delete
AFTER DELETE ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.restore_product_stock_on_order_item_delete();

-- Função para calcular comissões após a inserção de um item de pedido ou agendamento
CREATE OR REPLACE FUNCTION public.calculate_commissions_on_item_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_empresa_id uuid;
    v_responsavel_id uuid;
    v_item_id uuid;
    v_produto_id uuid;
    v_quantidade integer;
    v_preco_unitario numeric(10, 2);
    v_tipo_referencia text;
    v_referencia_id uuid;
    v_comissao_valor numeric(10, 2);
    r_regra public.comissionamento_regras;
    r_entidade public.comissionamento_regras_entidades;
    r_produto public.produtos;
    r_categoria public.categorias;
    v_applicable_users uuid[];
    v_user_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'pedido_itens' THEN
        SELECT empresa_id, responsavel_id INTO v_empresa_id, v_responsavel_id FROM public.pedidos WHERE id = NEW.pedido_id;
        v_tipo_referencia := 'pedido';
        v_referencia_id := NEW.pedido_id;
        v_item_id := NEW.id;
        v_produto_id := NEW.produto_id;
        v_quantidade := NEW.quantidade;
        v_preco_unitario := NEW.preco_unitario;
    ELSIF TG_TABLE_NAME = 'agendamento_itens' THEN
        SELECT empresa_id, responsavel_id INTO v_empresa_id, v_responsavel_id FROM public.agendamentos WHERE id = NEW.agendamento_id;
        v_tipo_referencia := 'agendamento';
        v_referencia_id := NEW.agendamento_id;
        v_item_id := NEW.id;
        v_produto_id := NEW.produto_id;
        v_quantidade := NEW.quantidade;
        v_preco_unitario := NEW.preco_unitario;
    ELSE
        RETURN NEW; -- Não deveria acontecer
    END IF;

    -- Se não houver responsável, não há comissão
    IF v_responsavel_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Obter detalhes do produto/serviço
    SELECT * INTO r_produto FROM public.produtos WHERE id = v_produto_id;
    IF r_produto IS NULL THEN
        RETURN NEW;
    END IF;

    -- Buscar regras de comissionamento aplicáveis
    FOR r_regra IN
        SELECT cr.*
        FROM public.comissionamento_regras cr
        WHERE cr.empresa_id = v_empresa_id
          AND (
            -- Regras gerais (sem usuários específicos)
            NOT EXISTS (SELECT 1 FROM public.comissionamento_regras_usuarios cru WHERE cru.regra_id = cr.id)
            OR
            -- Regras para usuários específicos
            EXISTS (SELECT 1 FROM public.comissionamento_regras_usuarios cru WHERE cru.regra_id = cr.id AND cru.usuario_id = v_responsavel_id)
          )
    LOOP
        -- Verificar se a regra se aplica à entidade (produto, serviço ou categoria)
        IF r_regra.tipo_entidade = 'produto' AND r_produto.tipo = 'produto' THEN
            IF EXISTS (SELECT 1 FROM public.comissionamento_regras_entidades cre WHERE cre.regra_id = r_regra.id AND cre.entidade_id = r_produto.id) THEN
                -- Regra de produto específica
                v_comissao_valor := CASE
                    WHEN r_regra.tipo_valor = 'fixo' THEN r_regra.valor * v_quantidade
                    WHEN r_regra.tipo_valor = 'percentual' THEN (v_preco_unitario * v_quantidade) * (r_regra.valor / 100)
                    ELSE 0
                END;

                INSERT INTO public.comissionamentos (empresa_id, usuario_id, referencia_id, tipo_referencia, item_id, valor_comissao)
                VALUES (v_empresa_id, v_responsavel_id, v_referencia_id, v_tipo_referencia, v_item_id, v_comissao_valor);
                RETURN NEW; -- Uma regra por item é suficiente
            END IF;
        ELSIF r_regra.tipo_entidade = 'servico' AND r_produto.tipo = 'servico' THEN
            IF EXISTS (SELECT 1 FROM public.comissionamento_regras_entidades cre WHERE cre.regra_id = r_regra.id AND cre.entidade_id = r_produto.id) THEN
                -- Regra de serviço específica
                v_comissao_valor := CASE
                    WHEN r_regra.tipo_valor = 'fixo' THEN r_regra.valor * v_quantidade
                    WHEN r_regra.tipo_valor = 'percentual' THEN (v_preco_unitario * v_quantidade) * (r_regra.valor / 100)
                    ELSE 0
                END;

                INSERT INTO public.comissionamentos (empresa_id, usuario_id, referencia_id, tipo_referencia, item_id, valor_comissao)
                VALUES (v_empresa_id, v_responsavel_id, v_referencia_id, v_tipo_referencia, v_item_id, v_comissao_valor);
                RETURN NEW; -- Uma regra por item é suficiente
            END IF;
        ELSIF r_regra.tipo_entidade = 'categoria' AND r_produto.categoria IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM public.comissionamento_regras_entidades cre WHERE cre.regra_id = r_regra.id AND cre.entidade_id = r_produto.categoria) THEN
                -- Regra de categoria
                v_comissao_valor := CASE
                    WHEN r_regra.tipo_valor = 'fixo' THEN r_regra.valor * v_quantidade
                    WHEN r_regra.tipo_valor = 'percentual' THEN (v_preco_unitario * v_quantidade) * (r_regra.valor / 100)
                    ELSE 0
                END;

                INSERT INTO public.comissionamentos (empresa_id, usuario_id, referencia_id, tipo_referencia, item_id, valor_comissao)
                VALUES (v_empresa_id, v_responsavel_id, v_referencia_id, v_tipo_referencia, v_item_id, v_comissao_valor);
                RETURN NEW; -- Uma regra por item é suficiente
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para 'calculate_commissions_on_item_insert' em pedido_itens
DROP TRIGGER IF EXISTS trg_calculate_commissions_on_pedido_item_insert ON public.pedido_itens;
CREATE TRIGGER trg_calculate_commissions_on_pedido_item_insert
AFTER INSERT ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.calculate_commissions_on_item_insert();

-- Trigger para 'calculate_commissions_on_item_insert' em agendamento_itens
DROP TRIGGER IF EXISTS trg_calculate_commissions_on_agendamento_item_insert ON public.agendamento_itens;
CREATE TRIGGER trg_calculate_commissions_on_agendamento_item_insert
AFTER INSERT ON public.agendamento_itens
FOR EACH ROW EXECUTE FUNCTION public.calculate_commissions_on_item_insert();

-- Função para deletar comissões quando um item de pedido/agendamento é deletado
CREATE OR REPLACE FUNCTION public.delete_commissions_on_item_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.comissionamentos WHERE item_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para 'delete_commissions_on_item_delete' em pedido_itens
DROP TRIGGER IF EXISTS trg_delete_commissions_on_pedido_item_delete ON public.pedido_itens;
CREATE TRIGGER trg_delete_commissions_on_pedido_item_delete
AFTER DELETE ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.delete_commissions_on_item_delete();

-- Trigger para 'delete_commissions_on_item_delete' em agendamento_itens
DROP TRIGGER IF EXISTS trg_delete_commissions_on_agendamento_item_delete ON public.agendamento_itens;
CREATE TRIGGER trg_delete_commissions_on_agendamento_item_delete
AFTER DELETE ON public.agendamento_itens
FOR EACH ROW EXECUTE FUNCTION public.delete_commissions_on_item_delete();

-- Função para inativar empresas com planos expirados
CREATE OR REPLACE FUNCTION public.inactivate_expired_companies()
RETURNS TABLE (company_id uuid, company_name text, plan_name text) AS $$
BEGIN
    RETURN QUERY
    UPDATE public.empresas e
    SET is_active = FALSE
    FROM public.planos p
    WHERE e.plano_id = p.id
      AND p.data_fim IS NOT NULL
      AND p.data_fim < now()
      AND e.is_active = TRUE
    RETURNING e.id, e.nome, p.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar o limite de usuários do plano
CREATE OR REPLACE FUNCTION public.check_user_limit(company_id_input uuid)
RETURNS boolean AS $$
DECLARE
    current_users integer;
    max_users integer;
BEGIN
    SELECT COUNT(u.id)
    INTO current_users
    FROM public.usuarios u
    WHERE u.empresa_id = company_id_input;

    SELECT p.limite_usuarios
    INTO max_users
    FROM public.empresas e
    JOIN public.planos p ON e.plano_id = p.id
    WHERE e.id = company_id_input;

    IF max_users IS NULL OR current_users < max_users THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o ID da empresa do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
DECLARE
    user_company_id uuid;
BEGIN
    SELECT empresa_id
    INTO user_company_id
    FROM public.usuarios
    WHERE id = auth.uid();

    RETURN user_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário logado é Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
    is_sa boolean;
BEGIN
    SELECT (u.empresa_id IS NULL AND u.perfil_customizado_id IS NULL)
    INTO is_sa
    FROM public.usuarios u
    WHERE u.id = auth.uid();

    RETURN COALESCE(is_sa, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar o acesso a um módulo
CREATE OR REPLACE FUNCTION public.check_access(module_name text, required_access text)
RETURNS boolean AS $$
DECLARE
    user_id uuid := auth.uid();
    user_empresa_id uuid;
    user_perfil_customizado_id uuid;
    module_id_val uuid;
    plan_id_val uuid;
    plan_access text;
    profile_access text;
    is_sa boolean;
    is_company_active boolean;
BEGIN
    -- 1. Obter informações básicas do usuário
    SELECT u.empresa_id, u.perfil_customizado_id, u.is_active, e.is_active, e.plano_id
    INTO user_empresa_id, user_perfil_customizado_id, is_company_active, is_company_active, plan_id_val
    FROM public.usuarios u
    LEFT JOIN public.empresas e ON u.empresa_id = e.id
    WHERE u.id = user_id;

    -- Se o usuário não estiver ativo, nega acesso
    IF NOT COALESCE(is_company_active, TRUE) THEN -- Se não tem empresa, assume TRUE
        RETURN FALSE;
    END IF;

    -- 2. Verificar se é Super Admin
    SELECT public.is_super_admin() INTO is_sa;
    IF is_sa THEN
        RETURN TRUE; -- Super Admin tem acesso total
    END IF;

    -- 3. Obter o ID do módulo
    SELECT id INTO module_id_val FROM public.modulos WHERE nome = module_name;
    IF module_id_val IS NULL THEN
        RETURN FALSE; -- Módulo não encontrado
    END IF;

    -- 4. Verificar acesso via perfil customizado (se existir)
    IF user_perfil_customizado_id IS NOT NULL THEN
        SELECT acesso
        INTO profile_access
        FROM public.permissao_modulos
        WHERE perfil_customizado_id = user_perfil_customizado_id AND modulo_id = module_id_val;

        IF profile_access IS NOT NULL THEN
            IF required_access = 'leitura' AND (profile_access = 'leitura' OR profile_access = 'escrita') THEN
                RETURN TRUE;
            ELSIF required_access = 'escrita' AND profile_access = 'escrita' THEN
                RETURN TRUE;
            END IF;
        END IF;
    END IF;

    -- 5. Verificar acesso via plano (se existir e não tiver perfil customizado)
    IF user_perfil_customizado_id IS NULL AND plan_id_val IS NOT NULL THEN
        SELECT acesso
        INTO plan_access
        FROM public.plano_modulos
        WHERE plano_id = plan_id_val AND modulo_id = module_id_val;

        IF plan_access IS NOT NULL THEN
            IF required_access = 'leitura' AND (plan_access = 'leitura' OR plan_access = 'escrita') THEN
                RETURN TRUE;
            ELSIF required_access = 'escrita' AND plan_access = 'escrita' THEN
                RETURN TRUE;
            END IF;
        END IF;
    END IF;

    RETURN FALSE; -- Nenhuma regra de acesso permitiu
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o faturamento diário, semanal e mensal
CREATE OR REPLACE FUNCTION public.get_total_revenue_metrics(company_id_input uuid DEFAULT NULL)
RETURNS TABLE (daily_revenue numeric, weekly_revenue numeric, monthly_revenue numeric) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN p.created_at::date = CURRENT_DATE THEN p.valor_total ELSE 0 END), 0) AS daily_revenue,
        COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('week', CURRENT_DATE) AND p.created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week' THEN p.valor_total ELSE 0 END), 0) AS weekly_revenue,
        COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('month', CURRENT_DATE) AND p.created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' THEN p.valor_total ELSE 0 END), 0) AS monthly_revenue
    FROM public.pedidos p
    WHERE p.status = 'entregue'
      AND (company_id_input IS NULL OR p.empresa_id = company_id_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o faturamento diário, semanal e mensal (para Super Admin - todas as empresas)
CREATE OR REPLACE FUNCTION public.get_total_revenue_metrics_all()
RETURNS TABLE (daily_revenue numeric, weekly_revenue numeric, monthly_revenue numeric) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN p.created_at::date = CURRENT_DATE THEN p.valor_total ELSE 0 END), 0) AS daily_revenue,
        COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('week', CURRENT_DATE) AND p.created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week' THEN p.valor_total ELSE 0 END), 0) AS weekly_revenue,
        COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('month', CURRENT_DATE) AND p.created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' THEN p.valor_total ELSE 0 END), 0) AS monthly_revenue
    FROM public.pedidos p
    WHERE p.status = 'entregue';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter a contagem diária de pedidos entregues por hora
CREATE OR REPLACE FUNCTION public.get_daily_order_count_by_hour(company_id_input uuid, target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (hour integer, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(HOUR FROM p.created_at)::integer AS hour,
        COUNT(p.id) AS count
    FROM public.pedidos p
    WHERE p.empresa_id = company_id_input
      AND p.status = 'entregue'
      AND p.created_at::date = target_date
    GROUP BY EXTRACT(HOUR FROM p.created_at)
    ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter a contagem diária de pedidos entregues por hora (para Super Admin - todas as empresas)
CREATE OR REPLACE FUNCTION public.get_daily_order_count_by_hour_all(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (hour integer, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(HOUR FROM p.created_at)::integer AS hour,
        COUNT(p.id) AS count
    FROM public.pedidos p
    WHERE p.status = 'entregue'
      AND p.created_at::date = target_date
    GROUP BY EXTRACT(HOUR FROM p.created_at)
    ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter a contagem diária de serviços concluídos por hora
CREATE OR REPLACE FUNCTION public.get_daily_service_count_by_hour(company_id_input uuid, target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (hour integer, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(HOUR FROM a.data_hora)::integer AS hour,
        COUNT(a.id) AS count
    FROM public.agendamentos a
    WHERE a.empresa_id = company_id_input
      AND a.status = 'concluido'
      AND a.data_hora::date = target_date
    GROUP BY EXTRACT(HOUR FROM a.data_hora)
    ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter a contagem diária de serviços concluídos por hora (para Super Admin - todas as empresas)
CREATE OR REPLACE FUNCTION public.get_daily_service_count_by_hour_all(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (hour integer, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(HOUR FROM a.data_hora)::integer AS hour,
        COUNT(a.id) AS count
    FROM public.agendamentos a
    WHERE a.status = 'concluido'
      AND a.data_hora::date = target_date
    GROUP BY EXTRACT(HOUR FROM a.data_hora)
    ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter os top 10 produtos mais vendidos (por quantidade)
CREATE OR REPLACE FUNCTION public.get_top_selling_products(company_id_input uuid DEFAULT NULL)
RETURNS TABLE (produto_id uuid, nome_produto text, tipo_produto text, total_vendido bigint, fotos text[]) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS produto_id,
        p.nome AS nome_produto,
        p.tipo AS tipo_produto,
        SUM(pi.quantidade)::bigint AS total_vendido,
        p.fotos
    FROM public.produtos p
    JOIN public.pedido_itens pi ON p.id = pi.produto_id
    JOIN public.pedidos ped ON pi.pedido_id = ped.id
    WHERE p.tipo = 'produto'
      AND ped.status = 'entregue'
      AND (company_id_input IS NULL OR p.empresa_id = company_id_input)
    GROUP BY p.id, p.nome, p.tipo, p.fotos
    ORDER BY total_vendido DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter os top 10 produtos mais vendidos (por quantidade) - ALL
CREATE OR REPLACE FUNCTION public.get_top_selling_products_all()
RETURNS TABLE (produto_id uuid, nome_produto text, tipo_produto text, total_vendido bigint, fotos text[]) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS produto_id,
        p.nome AS nome_produto,
        p.tipo AS tipo_produto,
        SUM(pi.quantidade)::bigint AS total_vendido,
        p.fotos
    FROM public.produtos p
    JOIN public.pedido_itens pi ON p.id = pi.produto_id
    JOIN public.pedidos ped ON pi.pedido_id = ped.id
    WHERE p.tipo = 'produto'
      AND ped.status = 'entregue'
    GROUP BY p.id, p.nome, p.tipo, p.fotos
    ORDER BY total_vendido DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter os top 10 serviços mais realizados (por quantidade)
CREATE OR REPLACE FUNCTION public.get_top_selling_services(company_id_input uuid DEFAULT NULL)
RETURNS TABLE (produto_id uuid, nome_produto text, tipo_produto text, total_vendido bigint, fotos text[]) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS produto_id,
        p.nome AS nome_produto,
        p.tipo AS tipo_produto,
        SUM(ai.quantidade)::bigint AS total_vendido,
        p.fotos
    FROM public.produtos p
    JOIN public.agendamento_itens ai ON p.id = ai.produto_id
    JOIN public.agendamentos a ON ai.agendamento_id = a.id
    WHERE p.tipo = 'servico'
      AND a.status = 'concluido'
      AND (company_id_input IS NULL OR p.empresa_id = company_id_input)
    GROUP BY p.id, p.nome, p.tipo, p.fotos
    ORDER BY total_vendido DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter os top 10 serviços mais realizados (por quantidade) - ALL
CREATE OR REPLACE FUNCTION public.get_top_selling_services_all()
RETURNS TABLE (produto_id uuid, nome_produto text, tipo_produto text, total_vendido bigint, fotos text[]) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS produto_id,
        p.nome AS nome_produto,
        p.tipo AS tipo_produto,
        SUM(ai.quantidade)::bigint AS total_vendido,
        p.fotos
    FROM public.produtos p
    JOIN public.agendamento_itens ai ON p.id = ai.produto_id
    JOIN public.agendamentos a ON ai.agendamento_id = a.id
    WHERE p.tipo = 'servico'
      AND a.status = 'concluido'
    GROUP BY p.id, p.nome, p.tipo, p.fotos
    ORDER BY total_vendido DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o histórico de vendas de um produto/serviço
CREATE OR REPLACE FUNCTION public.get_product_sales_history(product_id_input uuid)
RETURNS TABLE (
    data_venda timestamp with time zone,
    tipo_venda text,
    quantidade integer,
    preco_unitario numeric,
    valor_total numeric,
    cliente_nome text,
    cliente_email text,
    cliente_telefone text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.created_at AS data_venda,
        'Pedido' AS tipo_venda,
        pi.quantidade,
        pi.preco_unitario,
        (pi.quantidade * pi.preco_unitario) AS valor_total,
        c.nome AS cliente_nome,
        c.email AS cliente_email,
        c.telefone AS cliente_telefone
    FROM public.pedidos p
    JOIN public.pedido_itens pi ON p.id = pi.pedido_id
    LEFT JOIN public.clientes c ON p.cliente_id = c.id
    WHERE pi.produto_id = product_id_input
      AND p.status = 'entregue'

    UNION ALL

    SELECT
        a.data_hora AS data_venda,
        'Agendamento' AS tipo_venda,
        ai.quantidade,
        ai.preco_unitario,
        (ai.quantidade * ai.preco_unitario) AS valor_total,
        c.nome AS cliente_nome,
        c.email AS cliente_email,
        c.telefone AS cliente_telefone
    FROM public.agendamentos a
    JOIN public.agendamento_itens ai ON a.id = ai.agendamento_id
    LEFT JOIN public.clientes c ON a.cliente_id = c.id
    WHERE ai.produto_id = product_id_input
      AND a.status = 'concluido'
    ORDER BY data_venda DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter a contagem de vendas semanais de um produto/serviço
CREATE OR REPLACE FUNCTION public.get_product_weekly_sales_count(product_id_input uuid)
RETURNS TABLE (date_day date, total_count bigint) AS $$
BEGIN
    RETURN QUERY
    WITH sales_data AS (
        SELECT
            p.created_at::date AS sale_date,
            pi.quantidade AS quantity
        FROM public.pedidos p
        JOIN public.pedido_itens pi ON p.id = pi.pedido_id
        WHERE pi.produto_id = product_id_input
          AND p.status = 'entregue'
          AND p.created_at >= (CURRENT_DATE - INTERVAL '7 days')

        UNION ALL

        SELECT
            a.data_hora::date AS sale_date,
            ai.quantidade AS quantity
        FROM public.agendamentos a
        JOIN public.agendamento_itens ai ON a.id = ai.agendamento_id
        WHERE ai.produto_id = product_id_input
          AND a.status = 'concluido'
          AND a.data_hora >= (CURRENT_DATE - INTERVAL '7 days')
    )
    SELECT
        gs.day::date AS date_day,
        COALESCE(SUM(sd.quantity), 0)::bigint AS total_count
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) AS gs(day)
    LEFT JOIN sales_data sd ON gs.day = sd.sale_date
    GROUP BY gs.day
    ORDER BY gs.day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o progresso mensal de uma equipe
CREATE OR REPLACE FUNCTION public.get_team_monthly_progress(team_id_input uuid)
RETURNS TABLE (total_valor numeric, total_quantidade bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN p.status = 'entregue' THEN p.valor_total ELSE 0 END), 0) AS total_valor,
        COALESCE(SUM(CASE WHEN p.status = 'entregue' THEN (SELECT SUM(pi.quantidade) FROM public.pedido_itens pi WHERE pi.pedido_id = p.id) ELSE 0 END), 0)::bigint AS total_quantidade
    FROM public.pedidos p
    JOIN public.equipe_membros em ON p.responsavel_id = em.usuario_id
    WHERE em.equipe_id = team_id_input
      AND p.created_at >= date_trunc('month', CURRENT_DATE)
      AND p.created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter os top 10 clientes por valor de pedidos
CREATE OR REPLACE FUNCTION public.get_top_10_clients_by_orders(company_id_input uuid DEFAULT NULL)
RETURNS TABLE (cliente_id uuid, nome_cliente text, avatar_url text, total_valor numeric, total_pedidos bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS cliente_id,
        c.nome AS nome_cliente,
        c.avatar_url,
        SUM(p.valor_total) AS total_valor,
        COUNT(p.id)::bigint AS total_pedidos
    FROM public.clientes c
    JOIN public.pedidos p ON c.id = p.cliente_id
    WHERE p.status = 'entregue'
      AND (company_id_input IS NULL OR c.empresa_id = company_id_input)
    GROUP BY c.id, c.nome, c.avatar_url
    ORDER BY SUM(p.valor_total) DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter os top 10 clientes por número de agendamentos concluídos
CREATE OR REPLACE FUNCTION public.get_top_10_clients_by_appointments(company_id_input uuid DEFAULT NULL)
RETURNS TABLE (cliente_id uuid, nome_cliente text, avatar_url text, total_agendamentos bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS cliente_id,
        c.nome AS nome_cliente,
        c.avatar_url,
        COUNT(a.id)::bigint AS total_agendamentos
    FROM public.clientes c
    JOIN public.agendamentos a ON c.id = a.cliente_id
    WHERE a.status = 'concluido'
      AND (company_id_input IS NULL OR c.empresa_id = company_id_input)
    GROUP BY c.id, c.nome, c.avatar_url
    ORDER BY COUNT(a.id) DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter todas as transações de um cliente (pedidos e agendamentos)
CREATE OR REPLACE FUNCTION public.get_client_transactions(
    client_id_input uuid,
    tipo_transacao_input text DEFAULT NULL, -- 'Pedido', 'Agendamento' ou NULL para ambos
    start_date_input date DEFAULT NULL,
    end_date_input date DEFAULT NULL,
    responsavel_id_input uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    data_transacao timestamp with time zone,
    tipo_transacao text,
    valor_total numeric,
    status text,
    empresa_id uuid,
    responsavel_nome text,
    empresas jsonb,
    itens jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.created_at AS data_transacao,
        'Pedido' AS tipo_transacao,
        p.valor_total,
        p.status,
        p.empresa_id,
        u.nome_completo AS responsavel_nome,
        to_jsonb(e.*) - 'dono_id' - 'plano_id' AS empresas,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'nome', pr.nome,
                'quantidade', pi.quantidade,
                'preco_unitario', pi.preco_unitario
            ))
            FROM public.pedido_itens pi
            JOIN public.produtos pr ON pi.produto_id = pr.id
            WHERE pi.pedido_id = p.id
        ) AS itens
    FROM public.pedidos p
    LEFT JOIN public.usuarios u ON p.responsavel_id = u.id
    LEFT JOIN public.empresas e ON p.empresa_id = e.id
    WHERE p.cliente_id = client_id_input
      AND (tipo_transacao_input IS NULL OR tipo_transacao_input = 'Pedido')
      AND (start_date_input IS NULL OR p.created_at::date >= start_date_input)
      AND (end_date_input IS NULL OR p.created_at::date <= end_date_input)
      AND (responsavel_id_input IS NULL OR p.responsavel_id = responsavel_id_input)

    UNION ALL

    SELECT
        a.id,
        a.data_hora AS data_transacao,
        'Agendamento' AS tipo_transacao,
        (SELECT SUM(ai.quantidade * ai.preco_unitario) FROM public.agendamento_itens ai WHERE ai.agendamento_id = a.id) AS valor_total,
        a.status,
        a.empresa_id,
        u.nome_completo AS responsavel_nome,
        to_jsonb(e.*) - 'dono_id' - 'plano_id' AS empresas,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'nome', pr.nome,
                'quantidade', ai.quantidade,
                'preco_unitario', ai.preco_unitario
            ))
            FROM public.agendamento_itens ai
            JOIN public.produtos pr ON ai.produto_id = pr.id
            WHERE ai.agendamento_id = a.id
        ) AS itens
    FROM public.agendamentos a
    LEFT JOIN public.usuarios u ON a.responsavel_id = u.id
    LEFT JOIN public.empresas e ON a.empresa_id = e.id
    WHERE a.cliente_id = client_id_input
      AND (tipo_transacao_input IS NULL OR tipo_transacao_input = 'Agendamento')
      AND (start_date_input IS NULL OR a.data_hora::date >= start_date_input)
      AND (end_date_input IS NULL OR a.data_hora::date <= end_date_input)
      AND (responsavel_id_input IS NULL OR a.responsavel_id = responsavel_id_input)
    ORDER BY data_transacao DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================================================================
-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- =====================================================================================================================

-- Habilita RLS para todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_customizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissao_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocao_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissionamento_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissionamento_regras_entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissionamento_regras_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissionamentos ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela 'empresas'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as empresas" ON public.empresas;
CREATE POLICY "Super Admin pode gerenciar todas as empresas" ON public.empresas
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin de empresa pode ver e editar sua própria empresa" ON public.empresas;
CREATE POLICY "Admin de empresa pode ver e editar sua própria empresa" ON public.empresas
FOR SELECT TO authenticated USING (auth.uid() IN (SELECT u.id FROM public.usuarios u WHERE u.empresa_id = empresas.id AND u.perfil_customizado_id IS NULL));
CREATE POLICY "Admin de empresa pode editar sua própria empresa" ON public.empresas
FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT u.id FROM public.usuarios u WHERE u.empresa_id = empresas.id AND u.perfil_customizado_id IS NULL));

-- Políticas para a tabela 'usuarios'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os usuários" ON public.usuarios;
CREATE POLICY "Super Admin pode gerenciar todos os usuários" ON public.usuarios
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuário pode ver e editar seu próprio perfil" ON public.usuarios;
CREATE POLICY "Usuário pode ver e editar seu próprio perfil" ON public.usuarios
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin de empresa pode gerenciar usuários da sua empresa" ON public.usuarios;
CREATE POLICY "Admin de empresa pode gerenciar usuários da sua empresa" ON public.usuarios
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u_admin
        WHERE u_admin.id = auth.uid()
          AND u_admin.empresa_id = usuarios.empresa_id
          AND u_admin.perfil_customizado_id IS NULL -- É um admin de empresa
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u_admin
        WHERE u_admin.id = auth.uid()
          AND u_admin.empresa_id = usuarios.empresa_id
          AND u_admin.perfil_customizado_id IS NULL
    )
);

-- Políticas para a tabela 'clientes'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os clientes" ON public.clientes;
CREATE POLICY "Super Admin pode gerenciar todos os clientes" ON public.clientes
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar clientes da sua empresa" ON public.clientes;
CREATE POLICY "Usuários da empresa podem gerenciar clientes da sua empresa" ON public.clientes
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = clientes.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = clientes.empresa_id
    )
);

-- Políticas para a tabela 'categorias'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as categorias" ON public.categorias;
CREATE POLICY "Super Admin pode gerenciar todas as categorias" ON public.categorias
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar categorias da sua empresa" ON public.categorias;
CREATE POLICY "Usuários da empresa podem gerenciar categorias da sua empresa" ON public.categorias
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = categorias.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = categorias.empresa_id
    )
);

-- Políticas para a tabela 'produtos'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os produtos" ON public.produtos;
CREATE POLICY "Super Admin pode gerenciar todos os produtos" ON public.produtos
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar produtos da sua empresa" ON public.produtos;
CREATE POLICY "Usuários da empresa podem gerenciar produtos da sua empresa" ON public.produtos
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = produtos.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = produtos.empresa_id
    )
);

-- Políticas para a tabela 'equipes'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as equipes" ON public.equipes;
CREATE POLICY "Super Admin pode gerenciar todas as equipes" ON public.equipes
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar equipes da sua empresa" ON public.equipes;
CREATE POLICY "Usuários da empresa podem gerenciar equipes da sua empresa" ON public.equipes
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = equipes.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = equipes.empresa_id
    )
);

-- Políticas para a tabela 'equipe_membros'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os membros de equipe" ON public.equipe_membros;
CREATE POLICY "Super Admin pode gerenciar todos os membros de equipe" ON public.equipe_membros
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar membros de equipe da sua empresa" ON public.equipe_membros;
CREATE POLICY "Usuários da empresa podem gerenciar membros de equipe da sua empresa" ON public.equipe_membros
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.equipes WHERE id = equipe_membros.equipe_id)
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.equipes WHERE id = equipe_membros.equipe_id)
    )
);

-- Políticas para a tabela 'pedidos'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os pedidos" ON public.pedidos;
CREATE POLICY "Super Admin pode gerenciar todos os pedidos" ON public.pedidos
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar pedidos da sua empresa" ON public.pedidos;
CREATE POLICY "Usuários da empresa podem gerenciar pedidos da sua empresa" ON public.pedidos
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = pedidos.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = pedidos.empresa_id
    )
);

-- Políticas para a tabela 'pedido_itens'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os itens de pedido" ON public.pedido_itens;
CREATE POLICY "Super Admin pode gerenciar todos os itens de pedido" ON public.pedido_itens
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar itens de pedido da sua empresa" ON public.pedido_itens;
CREATE POLICY "Usuários da empresa podem gerenciar itens de pedido da sua empresa" ON public.pedido_itens
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.pedidos WHERE id = pedido_itens.pedido_id)
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.pedidos WHERE id = pedido_itens.pedido_id)
    )
);

-- Políticas para a tabela 'agendamentos'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os agendamentos" ON public.agendamentos;
CREATE POLICY "Super Admin pode gerenciar todos os agendamentos" ON public.agendamentos
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar agendamentos da sua empresa" ON public.agendamentos;
CREATE POLICY "Usuários da empresa podem gerenciar agendamentos da sua empresa" ON public.agendamentos
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = agendamentos.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = agendamentos.empresa_id
    )
);

-- Políticas para a tabela 'agendamento_itens'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os itens de agendamento" ON public.agendamento_itens;
CREATE POLICY "Super Admin pode gerenciar todos os itens de agendamento" ON public.agendamento_itens
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar itens de agendamento da sua empresa" ON public.agendamento_itens;
CREATE POLICY "Usuários da empresa podem gerenciar itens de agendamento da sua empresa" ON public.agendamento_itens
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.agendamentos WHERE id = agendamento_itens.agendamento_id)
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.agendamentos WHERE id = agendamento_itens.agendamento_id)
    )
);

-- Políticas para a tabela 'notificacoes'
DROP POLICY IF EXISTS "Usuário pode ver e gerenciar suas próprias notificações" ON public.notificacoes;
CREATE POLICY "Usuário pode ver e gerenciar suas próprias notificações" ON public.notificacoes
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super Admin pode ver todas as notificações" ON public.notificacoes;
CREATE POLICY "Super Admin pode ver todas as notificações" ON public.notificacoes
FOR SELECT USING (public.is_super_admin());

-- Políticas para a tabela 'perfis_customizados'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os perfis customizados" ON public.perfis_customizados;
CREATE POLICY "Super Admin pode gerenciar todos os perfis customizados" ON public.perfis_customizados
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin de empresa pode gerenciar perfis customizados da sua empresa" ON public.perfis_customizados;
CREATE POLICY "Admin de empresa pode gerenciar perfis customizados da sua empresa" ON public.perfis_customizados
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u_admin
        WHERE u_admin.id = auth.uid()
          AND u_admin.empresa_id = perfis_customizados.empresa_id
          AND u_admin.perfil_customizado_id IS NULL -- É um admin de empresa
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u_admin
        WHERE u_admin.id = auth.uid()
          AND u_admin.empresa_id = perfis_customizados.empresa_id
          AND u_admin.perfil_customizado_id IS NULL
    )
);

-- Políticas para a tabela 'permissao_modulos'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as permissões de módulo" ON public.permissao_modulos;
CREATE POLICY "Super Admin pode gerenciar todas as permissões de módulo" ON public.permissao_modulos
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin de empresa pode gerenciar permissões de perfis da sua empresa" ON public.permissao_modulos;
CREATE POLICY "Admin de empresa pode gerenciar permissões de perfis da sua empresa" ON public.permissao_modulos
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u_admin
        WHERE u_admin.id = auth.uid()
          AND u_admin.perfil_customizado_id IS NULL -- É um admin de empresa
          AND u_admin.empresa_id = (SELECT empresa_id FROM public.perfis_customizados WHERE id = permissao_modulos.perfil_customizado_id)
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u_admin
        WHERE u_admin.id = auth.uid()
          AND u_admin.perfil_customizado_id IS NULL
          AND u_admin.empresa_id = (SELECT empresa_id FROM public.perfis_customizados WHERE id = permissao_modulos.perfil_customizado_id)
    )
);

-- Políticas para a tabela 'modulos' (apenas leitura para todos autenticados)
DROP POLICY IF EXISTS "Todos autenticados podem ler módulos" ON public.modulos;
CREATE POLICY "Todos autenticados podem ler módulos" ON public.modulos
FOR SELECT TO authenticated USING (TRUE);

-- Políticas para a tabela 'planos'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os planos" ON public.planos;
CREATE POLICY "Super Admin pode gerenciar todos os planos" ON public.planos
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários autenticados podem ler planos" ON public.planos;
CREATE POLICY "Usuários autenticados podem ler planos" ON public.planos
FOR SELECT TO authenticated USING (TRUE);

-- Políticas para a tabela 'plano_modulos'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as regras de plano" ON public.plano_modulos;
CREATE POLICY "Super Admin pode gerenciar todas as regras de plano" ON public.plano_modulos
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários autenticados podem ler regras de plano" ON public.plano_modulos;
CREATE POLICY "Usuários autenticados podem ler regras de plano" ON public.plano_modulos
FOR SELECT TO authenticated USING (TRUE);

-- Políticas para a tabela 'promocoes'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as promocoes" ON public.promocoes;
CREATE POLICY "Super Admin pode gerenciar todas as promocoes" ON public.promocoes
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar promocoes da sua empresa" ON public.promocoes;
CREATE POLICY "Usuários da empresa podem gerenciar promocoes da sua empresa" ON public.promocoes
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = promocoes.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = promocoes.empresa_id
    )
);

-- Políticas para a tabela 'promocao_regras'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as regras de promocao" ON public.promocao_regras;
CREATE POLICY "Super Admin pode gerenciar todas as regras de promocao" ON public.promocao_regras
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar regras de promocoes da sua empresa" ON public.promocao_regras;
CREATE POLICY "Usuários da empresa podem gerenciar regras de promocoes da sua empresa" ON public.promocao_regras
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.promocoes WHERE id = promocao_regras.promocao_id)
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.promocoes WHERE id = promocao_regras.promocao_id)
    )
);

-- Políticas para a tabela 'comissionamento_regras'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as regras de comissionamento" ON public.comissionamento_regras;
CREATE POLICY "Super Admin pode gerenciar todas as regras de comissionamento" ON public.comissionamento_regras
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar regras de comissionamento da sua empresa" ON public.comissionamento_regras;
CREATE POLICY "Usuários da empresa podem gerenciar regras de comissionamento da sua empresa" ON public.comissionamento_regras
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = comissionamento_regras.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = comissionamento_regras.empresa_id
    )
);

-- Políticas para a tabela 'comissionamento_regras_entidades'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todas as entidades de regras de comissionamento" ON public.comissionamento_regras_entidades;
CREATE POLICY "Super Admin pode gerenciar todas as entidades de regras de comissionamento" ON public.comissionamento_regras_entidades
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar entidades de regras de comissionamento da sua empresa" ON public.comissionamento_regras_entidades;
CREATE POLICY "Usuários da empresa podem gerenciar entidades de regras de comissionamento da sua empresa" ON public.comissionamento_regras_entidades
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.comissionamento_regras WHERE id = comissionamento_regras_entidades.regra_id)
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.comissionamento_regras WHERE id = comissionamento_regras_entidades.regra_id)
    )
);

-- Políticas para a tabela 'comissionamento_regras_usuarios'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os usuários de regras de comissionamento" ON public.comissionamento_regras_usuarios;
CREATE POLICY "Super Admin pode gerenciar todos os usuários de regras de comissionamento" ON public.comissionamento_regras_usuarios
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar usuários de regras de comissionamento da sua empresa" ON public.comissionamento_regras_usuarios;
CREATE POLICY "Usuários da empresa podem gerenciar usuários de regras de comissionamento da sua empresa" ON public.comissionamento_regras_usuarios
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.comissionamento_regras WHERE id = comissionamento_regras_usuarios.regra_id)
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = (SELECT empresa_id FROM public.comissionamento_regras WHERE id = comissionamento_regras_usuarios.regra_id)
    )
);

-- Políticas para a tabela 'comissionamentos'
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos os comissionamentos" ON public.comissionamentos;
CREATE POLICY "Super Admin pode gerenciar todos os comissionamentos" ON public.comissionamentos
FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar comissionamentos da sua empresa" ON public.comissionamentos;
CREATE POLICY "Usuários da empresa podem gerenciar comissionamentos da sua empresa" ON public.comissionamentos
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = comissionamentos.empresa_id
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id = comissionamentos.empresa_id
    )
);

-- =====================================================================================================================
-- 4. STORAGE (RLS para buckets)
-- =====================================================================================================================

-- Criar bucket 'avatars'
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket 'product_images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket 'avatars'
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
CREATE POLICY "Users can upload their own avatar." ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar." ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;
CREATE POLICY "Users can delete their own avatar." ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para o bucket 'product_images'
DROP POLICY IF EXISTS "Product images are publicly accessible." ON storage.objects;
CREATE POLICY "Product images are publicly accessible." ON storage.objects
FOR SELECT USING (bucket_id = 'product_images');

DROP POLICY IF EXISTS "Company users can upload product images to their company folder." ON storage.objects;
CREATE POLICY "Company users can upload product images to their company folder." ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'product_images' AND
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id::text = (storage.foldername(name))[1]
    )
);

DROP POLICY IF EXISTS "Company users can update product images in their company folder." ON storage.objects;
CREATE POLICY "Company users can update product images in their company folder." ON storage.objects
FOR UPDATE USING (
    bucket_id = 'product_images' AND
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id::text = (storage.foldername(name))[1]
    )
);

DROP POLICY IF EXISTS "Company users can delete product images from their company folder." ON storage.objects;
CREATE POLICY "Company users can delete product images from their company folder." ON storage.objects
FOR DELETE USING (
    bucket_id = 'product_images' AND
    EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid() AND u.empresa_id::text = (storage.foldername(name))[1]
    )
);

-- Super Admin pode gerenciar todos os arquivos em todos os buckets
DROP POLICY IF EXISTS "Super Admin can manage all storage files" ON storage.objects;
CREATE POLICY "Super Admin can manage all storage files" ON storage.objects
FOR ALL USING (public.is_super_admin());

-- =====================================================================================================================
-- 5. INSERÇÕES DE DADOS INICIAIS (OPCIONAL)
-- =====================================================================================================================

-- Inserir um plano padrão (Plano Básico)
INSERT INTO public.planos (nome, limite_usuarios, preco, data_inicio, data_fim) VALUES
('Plano Básico', 5, 49.90, '2023-01-01 00:00:00+00', '2099-12-31 23:59:59+00')
ON CONFLICT (nome) DO NOTHING;

-- Inserir um plano padrão (Plano Premium)
INSERT INTO public.planos (nome, limite_usuarios, preco, data_inicio, data_fim) VALUES
('Plano Premium', 20, 149.90, '2023-01-01 00:00:00+00', '2099-12-31 23:59:59+00')
ON CONFLICT (nome) DO NOTHING;

-- Inserir um plano padrão (Plano Enterprise)
INSERT INTO public.planos (nome, limite_usuarios, preco, data_inicio, data_fim) VALUES
('Plano Enterprise', 100, 499.90, '2023-01-01 00:00:00+00', '2099-12-31 23:59:59+00')
ON CONFLICT (nome) DO NOTHING;