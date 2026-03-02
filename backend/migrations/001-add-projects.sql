-- Migration : ajouter projets et liaison speeches
-- Exécuter manuellement si nécessaire (Sequelize sync peut aussi créer)

create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id integer not null references users(id) on delete cascade,
  name varchar(255) not null,
  saas_prompt text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table speeches add column if not exists project_id uuid references projects(id) on delete cascade;
