# 🎓 ExtenTrack

Sistema de gerenciamento de projetos de extensão universitária para digitalização do registro de horas complementares de estudantes.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Modelo de Dados](#-modelo-de-dados)
- [Edge Functions](#-edge-functions)
- [Segurança](#-segurança)
- [Estrutura do Projeto](#-estrutura-do-projeto)

## 🎯 Sobre o Projeto

O **ExtenTrack** é uma aplicação web desenvolvida para gerenciar projetos de extensão universitária, permitindo:

- Registro e controle de horas complementares de estudantes
- Gestão de múltiplos projetos de extensão
- Geração de relatórios de participação
- Controle de presença e atividades

### Tipos de Usuários

| Tipo | Descrição | Permissões |
|------|-----------|------------|
| **Administrador** | Gerencia o sistema e coordenadores | Cadastro de coordenadores, visualização geral |
| **Coordenador** | Gerencia projetos e estudantes | CRUD de projetos, estudantes e presenças |
| **Estudante** | Consulta relatórios | Download de relatório via matrícula |

## ✨ Funcionalidades

### Para Administradores
- ✅ Cadastro e gerenciamento de coordenadores
- ✅ Visualização de todos os projetos do sistema
- ✅ Exclusão de coordenadores e seus projetos

### Para Coordenadores
- ✅ Criação e edição de projetos de extensão
- ✅ Cadastro de estudantes (individual ou em lote via CSV)
- ✅ Registro de presença com múltiplas datas simultâneas
- ✅ Vinculação de estudantes a projetos
- ✅ Geração de relatórios individuais e em lote
- ✅ Exportação de relatórios em formato texto

### Para Estudantes
- ✅ Consulta de relatório de horas via matrícula
- ✅ Visualização de todos os projetos participados
- ✅ Download do comprovante de horas complementares

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React     │  │  React      │  │   TanStack Query    │  │
│  │   Router    │  │  Context    │  │   (Cache/State)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              shadcn/ui + Tailwind CSS               │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Auth     │  │  Database   │  │   Edge Functions    │  │
│  │  (JWT/RLS)  │  │ (PostgreSQL)│  │     (Deno)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Row Level Security (RLS)                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🛠 Stack Tecnológico

### Frontend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.3 | Framework UI |
| TypeScript | 5.x | Tipagem estática |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.4 | Estilização |
| shadcn/ui | - | Componentes UI |
| TanStack Query | 5.x | Gerenciamento de estado servidor |
| React Router | 6.x | Roteamento SPA |
| React Hook Form | 7.x | Gerenciamento de formulários |
| Zod | 3.x | Validação de schemas |
| Recharts | 2.x | Gráficos e visualizações |
| Lucide React | - | Ícones |

### Backend (Supabase)
| Tecnologia | Propósito |
|------------|-----------|
| PostgreSQL | Banco de dados relacional |
| Supabase Auth | Autenticação JWT |
| Row Level Security | Controle de acesso granular |
| Supabase Client | SDK JavaScript |

## 📊 Modelo de Dados

### Diagrama Entidade-Relacionamento

```
┌─────────────────┐       ┌─────────────────┐
│     perfis      │       │    projetos     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │◄──────│ coordinator_id  │
│ email           │       │ name            │
│ name            │       │ description     │
│ role            │       │ status          │
│ department      │       │ created_at      │
│ created_at      │       │ updated_at      │
│ updated_at      │       └────────┬────────┘
└─────────────────┘                │
                                   │
┌─────────────────┐       ┌────────▼────────┐
│   estudantes    │       │ participacoes_  │
├─────────────────┤       │    projeto      │
│ id (PK)         │◄──────┼─────────────────┤
│ matricula (UK)  │       │ id (PK)         │
│ name            │       │ student_id (FK) │
│ email           │       │ project_id (FK) │
│ course          │       │ start_date      │
│ ano_ingresso    │       │ end_date        │
│ created_at      │       │ status          │
│ updated_at      │       │ total_hours     │
└─────────────────┘       │ created_at      │
                          │ updated_at      │
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │   registros_    │
                          │    presenca     │
                          ├─────────────────┤
                          │ id (PK)         │
                          │ participation_id│
                          │ date            │
                          │ hours           │
                          │ activity_desc   │
                          │ created_by (FK) │
                          │ created_at      │
                          └─────────────────┘

┌─────────────────┐
│   relatorios    │
├─────────────────┤
│ id (PK)         │
│ type            │
│ title           │
│ content         │
│ student_id (FK) │
│ project_id (FK) │
│ generated_by    │
│ created_at      │
└─────────────────┘
```

### Descrição das Tabelas

| Tabela | Descrição |
|--------|-----------|
| `perfis` | Perfis de usuários (admin/coordenador) |
| `estudantes` | Cadastro de estudantes |
| `projetos` | Projetos de extensão |
| `participacoes_projeto` | Vínculo estudante-projeto |
| `registros_presenca` | Registros de presença/horas |
| `relatorios` | Relatórios gerados |

## ⚡ Edge Functions

### `create-coordinator`
Cria um novo coordenador no sistema.

- **Autenticação:** Requer JWT de administrador
- **Método:** POST
- **Payload:**
```json
{
  "email": "coordenador@email.com",
  "password": "senha123",
  "name": "Nome do Coordenador",
  "department": "Departamento"
}
```

### `delete-coordinator`
Remove um coordenador e seus dados associados.

- **Autenticação:** Requer JWT de administrador
- **Método:** POST
- **Payload:**
```json
{
  "userId": "uuid-do-coordenador"
}
```

### `get-student-report`
Retorna o relatório de horas de um estudante.

- **Autenticação:** Pública (via matrícula)
- **Método:** POST
- **Payload:**
```json
{
  "matricula": "2021001234"
}
```
- **Retorno:** Dados do estudante, projetos e total de horas

## 🔒 Segurança

### Modelo de Autenticação

```
┌─────────────────────────────────────────────────────────┐
│                  FLUXO DE AUTENTICAÇÃO                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Administrador                                           │
│       │                                                  │
│       ▼                                                  │
│  ┌─────────────┐    cria    ┌─────────────┐             │
│  │   Admin     │ ─────────► │ Coordenador │             │
│  │  (pré-      │            │  (senha     │             │
│  │  criado)    │            │  inicial)   │             │
│  └─────────────┘            └─────────────┘             │
│                                    │                     │
│                                    ▼                     │
│                             ┌─────────────┐             │
│                             │  Estudante  │             │
│                             │ (sem login, │             │
│                             │  matrícula) │             │
│                             └─────────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado com políticas específicas:

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `perfis` | Próprio + Admin | Admin | Próprio + Admin | - |
| `estudantes` | Coord/Admin | Coord/Admin | Coord/Admin | Coord/Admin |
| `projetos` | Próprio + Admin | Coordenador | Próprio | Próprio + Admin |
| `participacoes_projeto` | Próprio + Admin | Próprio + Admin | Próprio + Admin | - |
| `registros_presenca` | Próprio + Admin | Coordenador | - | - |
| `relatorios` | Próprio + Admin | Autenticado | - | - |

### Boas Práticas Implementadas

- ✅ Autenticação via JWT (Supabase Auth)
- ✅ Row Level Security em todas as tabelas
- ✅ Validação de roles nas Edge Functions
- ✅ Senhas gerenciadas pelo Supabase Auth
- ✅ Tokens de sessão com expiração automática

## 📁 Estrutura do Projeto

```
extentrack/
├── public/                    # Arquivos estáticos
├── src/
│   ├── assets/               # Imagens e recursos
│   ├── components/
│   │   └── ui/               # Componentes shadcn/ui
│   ├── contexts/
│   │   └── AuthContext.tsx   # Contexto de autenticação
│   ├── hooks/                # Custom hooks
│   ├── integrations/
│   │   └── supabase/         # Cliente e tipos Supabase
│   ├── lib/                  # Utilitários
│   ├── pages/
│   │   ├── AdminDashboard.tsx
│   │   ├── CoordinatorDashboard.tsx
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   └── SelectProfile.tsx
│   ├── App.tsx               # Componente raiz
│   ├── main.tsx              # Entry point
│   └── index.css             # Estilos globais e tokens
├── supabase/
│   ├── functions/            # Edge Functions
│   │   ├── create-coordinator/
│   │   ├── delete-coordinator/
│   │   └── get-student-report/
│   └── config.toml           # Configuração Supabase
├── tailwind.config.ts        # Configuração Tailwind
├── vite.config.ts            # Configuração Vite
└── package.json
```

## 📝 Licença

Este projeto foi desenvolvido como trabalho acadêmico.

---