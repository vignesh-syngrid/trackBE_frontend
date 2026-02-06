'use client';

import { cn } from '@/lib/utils';
import { Badge, BadgeCheck, Loader2 } from 'lucide-react';

type JobStatus = {
  name: string;
  value: string;
  color: string;
  completed?: boolean;
};

type Props = {
  statuses: JobStatus[];
  selectedStatus: string;
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

export default function JobStatusSelector({
  statuses,
  selectedStatus,
  onChange,
  loading,
  disabled,
}: Props) {
  // Canonicalize status labels to robust keys
  const normalize = (s: string) =>
    (s || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const canonicalKey = (name: string) => {
    const n = normalize(name).replace(/\s+/g, '');
    if (n.includes('notstarted') || n === 'new' || n.includes('pending'))
      return 'not_started';
    if (n.includes('approved') || n.includes('approve')) return 'approved';
    if (
      n.includes('assignedtechnician') ||
      n.includes('assignedtech') ||
      n === 'assigned'
    )
      return 'assigned';
    if (n.includes('enroute') || n.includes('enrout')) return 'enroute';
    if (n.includes('onsite') || n.includes('onsit') || n.includes('on-site'))
      return 'onsite';
    if (
      n.includes('onhold') ||
      n.includes('hold') ||
      n.includes('paused') ||
      n.includes('pause')
    )
      return 'onhold';
    if (
      n.includes('resume') ||
      n.includes('resum') ||
      n.includes('continue') ||
      n.includes('reopen') ||
      n.includes('unhold') ||
      (n.includes('release') && n.includes('hold')) ||
      (n.includes('remove') && n.includes('hold'))
    )
      return 'resume';
    if (n.includes('completed') || n === 'done') return 'completed';
    if (
      n.includes('waitingforapproval') ||
      (n.includes('waiting') && n.includes('approval'))
    )
      return 'waiting_for_approval';
    if (n.includes('rejected') || n.includes('reject')) return 'rejected';
    if (n.includes('unresolved')) return 'unresolved';
    return n || '';
  };

  // Derive current key and apply gating as a safety net
  const selected = statuses.find(
    (s) => String(s.value) === String(selectedStatus)
  );
  const currentKey = selected ? canonicalKey(selected.name) : '';

  const allWithKeys = statuses.map((s) => ({
    ...s,
    key: canonicalKey(s.name),
  }));

  const pickByKeys = (keys: string[]) => {
    const out: typeof allWithKeys = [] as any;
    for (const k of keys) {
      let m = allWithKeys.find((st) => st.key === k);
      if (!m) {
        const rx = new RegExp(k.replace(/_/g, ' '), 'i');
        m = allWithKeys.find((st) => rx.test(st.name));
      }
      if (m && !out.some((o) => o.value === m!.value)) out.push(m);
    }
    return out;
  };

  let display = allWithKeys;
  if (currentKey === 'not_started') {
    const approved =
      allWithKeys.find((s) => s.key === 'approved') ||
      allWithKeys.find((s) => /approve/i.test(s.name));
    const assigned =
      allWithKeys.find((s) => s.key === 'assigned') ||
      allWithKeys.find((s) => /assign/i.test(s.name));
    const rejected =
      allWithKeys.find((s) => s.key === 'rejected') ||
      allWithKeys.find((s) => /reject/i.test(s.name));
    const next: typeof allWithKeys = [] as any;
    const approveOpt = approved ?? assigned;
    if (approveOpt) next.push({ ...approveOpt, name: 'Approve' });
    if (rejected) next.push({ ...rejected, name: 'Reject' });
    display = next.length > 0 ? next : display;
  } else if (
    [
      'approved',
      'assigned',
      'enroute',
      'onsite',
      'onhold',
      'resume',
      'hold',
    ].includes(currentKey)
  ) {
    const base = ['enroute', 'onsite', 'completed', 'unresolved'];
    let extra: string[] = [];
    if (
      currentKey === 'onhold' ||
      currentKey === 'hold' ||
      /hold/.test(currentKey)
    )
      extra = ['resume'];
    else if (currentKey === 'resume') extra = ['onhold'];
    else extra = ['onhold'];
    const keys = [...base, ...extra];
    const opts = pickByKeys(keys);
    const seen = new Set<string>();
    display = opts.filter((s) =>
      seen.has(s.value) ? false : (seen.add(s.value), true)
    );
  }

  // Strip helper key before rendering
  const displayStatuses = display.map(({ key, ...rest }) => rest);
  return (
    <div className="flex flex-wrap gap-3">
      {displayStatuses.map((status) => {
        const isSelected = String(selectedStatus) === String(status.value);
        const isCompleted = !!status.completed && !isSelected;

        return (
          <button
            key={status.value}
            onClick={() => !loading && !disabled && onChange(status.value)}
            disabled={!!loading || !!disabled}
            className={cn(
              'flex items-center gap-2 border-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              isSelected
                ? 'text-white'
                : `text-[${status.color}] bg-transparent`,
              isSelected ? 'shadow-md' : 'bg-white',
              loading || disabled ? 'opacity-60 cursor-not-allowed' : ''
            )}
            style={{
              borderColor: status.color,
              color: isSelected || isCompleted ? 'white' : status.color,
              backgroundColor:
                isSelected || isCompleted ? status.color : 'transparent',
            }}
            aria-busy={loading && isSelected}
          >
            {loading && isSelected ? (
              <Loader2 className={cn('w-4 h-4 animate-spin')} />
            ) : isSelected ? (
              <BadgeCheck className={cn('w-4 h-4')} />
            ) : isCompleted ? (
              <BadgeCheck className={cn('w-4 h-4')} />
            ) : (
              <Badge className={cn('w-4 h-4')} />
            )}

            {status.name}
          </button>
        );
      })}
    </div>
  );
}
