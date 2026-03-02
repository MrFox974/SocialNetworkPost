-- Migration : ajouter in_selection aux speeches (propositions marquées pour revue avant mise en ligne)
alter table speeches add column if not exists in_selection boolean not null default false;
