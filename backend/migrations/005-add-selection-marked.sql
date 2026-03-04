-- Migration : ajouter selection_marked aux speeches (marqueur d'items traités dans l'onglet Sélection)
alter table speeches add column if not exists selection_marked boolean not null default false;

