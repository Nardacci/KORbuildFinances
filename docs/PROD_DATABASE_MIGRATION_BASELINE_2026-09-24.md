# KORbuild Finances — PROD Database Migration Baseline

Date: 2026-09-24

## Purpose

Record the migration history currently registered in the production Supabase project `qasjgklmivxpisqfhngx`.

This file is an inventory/baseline record. It does not recreate or alter the production database.

## Production migration history

- 20260831232519 package_01_saas_foundation
- 20260831234917 package_01_rpc_setup
- 20260831234924 package_01_signup_trigger
- 20260901004220 package_01_admin_and_security
- 20260901005743 package_01_indexes_and_role_permissions
- 20260901125225 package_01_saas_foundation_clean_rebuild
- 20260901125241 package_01_restrict_workspace_rpc
- 20260901131655 fix_workspace_members_initial_access
- 20260901194928 workspace_setup_wizard_foundation
- 20260901215258 add_get_current_workspace_rpc
- 20260901220312 allow_workspace_setup_revisit
- 20260901222057 workspace_setup_access_functions
- 20260901222229 allow_workspace_setup_reads
- 20260902012100 create_governance_support_tables
- 20260902012259 harden_governance_workspace_admin_scope
- 20260902032355 create_professionals_crud
- 20260902032715 secure_professionals_rls
- 20260902045038 workspace_user_accounts
- 20260902053254 link_user_accounts_to_professionals
- 20260903012752 enforce_one_user_account_per_professional
- 20260903012813 complete_workspace_user_account_lifecycle
- 20260903012933 remove_obsolete_workspace_user_attach_rpc
- 20260903053022 create_access_profiles_framework
- 20260905050214 create_legal_entities_foundation
- 20260905062144 complete_legal_entity_address
- 20260905064227 complete_legal_entity_contacts_branches
- 20260922161348 reset_labmedsys_homol_for_korbuild_finances
- 20260922161909 rebuild_finances_core_tables
- 20260922161917 rebuild_finances_investments_expenses
- 20260922161925 rebuild_finances_commercial_ai_tables
- 20260922161935 rebuild_finances_payment_exchange_tables
- 20260922163023 restore_finances_foreign_keys_and_unique_keys
- 20260922163048 restore_finances_views
- 20260922164602 restore_exact_finances_views_from_dev
- 20260922164846 restore_finances_checks_and_indexes
- 20260922164913 restore_finances_triggers
- 20260922164929 restore_finances_functions_rpc
- 20260922165029 restore_finances_rls_and_policies
- 20260922170731 restore_exact_investment_positions_view
- 20260922170756 seed_finances_system_reference_data
- 20260922215749 seed_finances_commercial_pricing
- 20260923013144 enable_finances_cron_extensions
- 20260923015321 create_finances_cron_jobs
- 20260923105156 tighten_finances_function_privileges
- 20260923105217 harden_finances_function_search_paths
- 20260924001743 20260923193000_dynamic_commercial_price_brl
- 20260924003630 20260923214500_expose_finances_api_schema
- 20260924004035 20260923215000_reload_finances_postgrest_schema_cache
- 20260924010843 20260923222000_fix_planning_read_access
- 20260924014045 20260924023000_add_missing_finance_fk_indexes

## Current PROD inventory

- 27 finances tables
- 4 finances views
- 34 finances functions
- 63 finances RLS policies
- 75 finances indexes
- All checked finances tables have RLS enabled.

## Operational rule

Production is the current database baseline. Future database changes must be represented by a versioned migration in the repository before being treated as part of the controlled release history.

## Important limitation

The historical migration SQL files are not currently present in the repository. This document records the exact production migration history but does not claim that the repository can independently reconstruct the historical database from zero.

A full reproducible migration chain remains a separate engineering task if required.
