-- Migration : auth production (vérification email + OAuth)
-- Exécuter manuellement si nécessaire avant de passer PRODUCTION=true

-- Étendre users pour auth avancée
alter table users add column if not exists username varchar(255);
alter table users add column if not exists email_verified boolean default false;
alter table users add column if not exists auth_provider varchar(32) default 'local';
alter table users add column if not exists google_id varchar(255) unique;
alter table users add column if not exists refresh_token text;
alter table users alter column password drop not null;

-- Table inscriptions en attente (vérification email)
create table if not exists pending_registrations (
  id serial primary key,
  email varchar(255) not null unique,
  password varchar(255) not null,
  username varchar(255),
  verification_token varchar(255) not null unique,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_pending_registrations_token on pending_registrations(verification_token);
create index if not exists idx_pending_registrations_expires on pending_registrations(expires_at);
