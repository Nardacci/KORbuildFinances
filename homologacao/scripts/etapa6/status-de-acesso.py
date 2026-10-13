# Etapa 6 — conferência da máquina de estados de acesso, copiada de finances.get_workspace_access_status
# (versão ao vivo em supabase/migrations/20260925000000_capture_live_function_drift.sql:62-157).
# Ordem de precedência: pagamento (payment_subscriptions) antes do trial (workspace_subscriptions).
# Uso: python3 status-de-acesso.py
from datetime import datetime, timedelta, timezone
from math import ceil
def days_remaining(until, now): return max(1, ceil((until-now).total_seconds()/86400))
def access(now, pay=None, sub=None, payment_grace_days=12):
    if pay and pay['status']=='active': return ('ACTIVE','ALLOWED',None)
    if pay and pay['status']=='past_due':
        if pay.get('past_due_since') and now < pay['past_due_since']+timedelta(days=payment_grace_days):
            return ('PAST_DUE','ALLOWED',days_remaining(pay['past_due_since']+timedelta(days=payment_grace_days),now))
        return ('PAST_DUE','BLOCKED',None)
    if pay and pay['status']=='canceled':
        if pay.get('current_period_end') and now < pay['current_period_end']: return ('CANCELED','ALLOWED',None)
        return ('CANCELED','BLOCKED',None)
    # pending / paused / sem linha → cai no fluxo de trial
    if not sub: return ('SETUP_REQUIRED','ALLOWED',None)
    if sub['status']=='ACTIVE': return ('ACTIVE','ALLOWED',None)
    if sub['status'] in ('SUSPENDED','CANCELLED'): return (sub['status'],'BLOCKED',None)
    if not sub.get('trial_enabled',True): return ('TRIAL_DISABLED','ALLOWED',None)
    if not sub.get('trial_started_at'): return ('SETUP_REQUIRED','ALLOWED',None)
    if now < sub['trial_ends_at']: return ('TRIALING','ALLOWED',days_remaining(sub['trial_ends_at'],now))
    grace_end = sub.get('grace_ends_at') or sub['trial_started_at']+timedelta(days=20)
    if now < grace_end: return ('GRACE_PERIOD','ALLOWED',days_remaining(grace_end,now))
    return ('BLOCKED','BLOCKED',0)
T0=datetime(2026,10,1,10,0,tzinfo=timezone.utc)
trial={'status':'TRIALING','trial_enabled':True,'trial_started_at':T0,'trial_ends_at':T0+timedelta(days=14),'grace_ends_at':T0+timedelta(days=20)}
print('Trial iniciado em 2026-10-01 10:00 UTC com trial_days=14 e grace_days=6 (_start_trial_clock):')
for d in [0,13,13.9,14,19,19.9,20,25]:
    now=T0+timedelta(days=d); print(f'  +{d:>4} dias ({now:%Y-%m-%d %H:%M}) → {access(now,None,trial)}')
print('\nPagamento em atraso desde 2026-10-01 10:00 com payment_grace_days=12 (padrão quando nulo):')
pd={'status':'past_due','past_due_since':T0}
for d in [0,11.5,12,13]: now=T0+timedelta(days=d); print(f'  +{d:>4} dias → {access(now,pd,trial)}')
print('\nAssinatura cancelada com período pago até 2026-10-31:')
cn={'status':'canceled','current_period_end':datetime(2026,10,31,tzinfo=timezone.utc)}
for day in [15,31]: now=datetime(2026,10,day,12,tzinfo=timezone.utc); print(f'  {now:%Y-%m-%d} → {access(now,cn,trial)}')
print('\nCasos de precedência:')
print('  pagamento active + workspace SUSPENDED →', access(T0,{'status':'active'},{'status':'SUSPENDED'}), '(pagamento vence o status administrativo)')
print('  pagamento paused + trial expirado →', access(T0+timedelta(days=30),{'status':'paused'},trial), '(paused cai no trial: bloqueado)')
print('  pagamento pending + sem assinatura de workspace →', access(T0,{'status':'pending'},None))
print('  grace_ends_at nulo (linha criada fora do fluxo) → fallback 20 dias após o início:', access(T0+timedelta(days=19),None,{**trial,'grace_ends_at':None}))
