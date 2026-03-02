-- Migration : abonnements Stripe (plans utilisateur)
-- Ajoute les champs nécessaires sur la table users pour gérer les plans et abonnements.

alter table users add column if not exists subscription_plan varchar(64) default 'starter';
alter table users add column if not exists stripe_customer_id varchar(255);
alter table users add column if not exists stripe_subscription_id varchar(255);
alter table users add column if not exists subscription_current_period_start timestamptz;
alter table users add column if not exists subscription_current_period_end timestamptz;

