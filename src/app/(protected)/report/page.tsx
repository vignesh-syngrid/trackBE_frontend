'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';

import api from '@/utils/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Eye,
  Pencil,
  Filter as FilterIcon,
  Calendar as CalendarIcon,
  Search,
  Blocks,
  MapPin,
  LoaderCircle,
} from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { URLS } from '@/utils/urls';
import AsyncSearchSelect from '@/components/AsyncSearchSelect';

type JobRow = {
  job_id: string;
  reference_number?: string;
  scheduledDateAndTime?: string; // ISO string
  updatedAt?: string; // ISO string
  client?: { firstName?: string; lastName?: string };
  technician?: { name?: string };
  supervisor?: { name?: string };
  job_status?: {
    job_status_title?: string;
    job_status_id?: string;
    job_status_color_code?: string;
  };
};

type PaginatedJobs = {
  data: JobRow[];
  page: number;
  limit: number;
  total: number;
};

type StatusOpt = { value: string; label: string };

type AppliedFilters = {
  statusId: string;
  pickedDate?: Date;
  clientText: string;
  assigneeText: string;
  regionText: string;
};

const PAGE_SIZE = 10;

export default function JobsPage() {
  const router = useRouter();

  // theme & RBAC
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor);
  const permissions = useSelector((s: RootState) => s.permissions.list);
  const SCREEN = 'Manage Job';
  const canView = permissions.some((p) => p.screen === SCREEN && p.view);
  const canEdit = permissions.some((p) => p.screen === SCREEN && p.edit);
  const canAdd = permissions.some((p) => p.screen === SCREEN && p.add);

  // server pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---------- UI (draft) filter state ----------
  const [uiPickedDate, setUiPickedDate] = useState<Date | undefined>(undefined);
  const [uiStatusId, setUiStatusId] = useState<string>('');
  const [uiClientText, setUiClientText] = useState<string>('');
  const [uiClientId, setUiClientId] = useState<string>('');
  const [uiAssigneeText, setUiAssigneeText] = useState<string>('');
  const [uiAssigneeId, setUiAssigneeId] = useState<string>('');
  const [uiRegionText, setUiRegionText] = useState<string>('');
  const [uiRegionId, setUiRegionId] = useState<string>('');

  // ---------- Applied filter state (used for API) ----------
  const [applied, setApplied] = useState<AppliedFilters>({
    statusId: '',
    pickedDate: undefined,
    clientText: '',
    assigneeText: '',
    regionText: '',
  });
  const [appliedIds, setAppliedIds] = useState<{ client_id?: string; assignee_id?: string; region_id?: string }>({});

  // data
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // dropdown cache
  const [statusOpts, setStatusOpts] = useState<StatusOpt[]>([]);

  // Effect: load status options once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Try session cache first
        if (typeof window !== 'undefined') {
          const cached = sessionStorage.getItem('job_status_opts');
          if (cached) {
            const parsed = JSON.parse(cached) as StatusOpt[];
            setStatusOpts(parsed);
            return;
          }
        }
        const res = await api.get(URLS.GET_JOB_STATUSES);
        if (cancelled) return;
        const opts: StatusOpt[] = (res.data?.data || []).map(
          (s: { job_status_id: string; job_status_title?: string }) => ({
            value: String(s.job_status_id),
            label: String(s.job_status_title ?? ''),
          })
        );
        setStatusOpts(opts);
        if (typeof window !== 'undefined') {
          try { sessionStorage.setItem('job_status_opts', JSON.stringify(opts)); } catch {}
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // util: compute contrasting text color for a given hex bg
  const getContrastText = (hex?: string): string => {
    if (!hex) return '#111827'; // gray-900
    let c = hex.trim();
    if (c.startsWith('#')) c = c.slice(1);
    if (c.length === 3)
      c = c
        .split('')
        .map((ch) => ch + ch)
        .join('');
    const n = parseInt(c, 16);
    if (Number.isNaN(n)) return '#111827';
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    // Perceived luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#ffffff';
  };

  // Build server params using ONLY applied filters
  const buildServerParams = useCallback((): Record<string, string | number> => {
    const params: Record<string, string | number> = {
      page: currentPage,
      limit: PAGE_SIZE,
    };

    if (applied.statusId) params.job_status_id = applied.statusId;

    if (applied.pickedDate) {
      const start = new Date(applied.pickedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(applied.pickedDate);
      end.setHours(23, 59, 59, 999);
      params.from = start.toISOString();
      params.to = end.toISOString();
    }

    // Prefer exact ID filters when available; fallback to name if no id
    if (appliedIds.client_id) (params as any).client_id = appliedIds.client_id;
    else if (applied.clientText.trim())
      (params as any).client_name = applied.clientText.trim();
    if (appliedIds.assignee_id) (params as any).assignee_id = appliedIds.assignee_id;
    else if (applied.assigneeText.trim())
      (params as any).assignee_name = applied.assigneeText.trim();
    if (appliedIds.region_id) (params as any).region_id = appliedIds.region_id;
    else if (applied.regionText.trim())
      (params as any).region = applied.regionText.trim();

    return params;
  }, [currentPage, applied, appliedIds]);

  // Format date-time in 12-hour clock with a readable date
  const fmtDateTime12 = (iso?: string) => {
    if (!iso) return '-';
    const s = new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return s.replace(/\bam\b/i, 'AM').replace(/\bpm\b/i, 'PM');
  };

  // Abort previous fetch in dev double-invoke
  const abortRef = useRef<AbortController | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    // cancel previous
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedJobs>('/jobs', {
        params: buildServerParams(),
        signal: controller.signal,
      });
      setRows(res.data?.data ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch (err: unknown) {
      // Ignore aborts
      // @ts-expect-error axios-like shapes
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;

      // @ts-expect-error axios-like shapes
      if (err?.response?.status === 401) router.push('/login');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildServerParams, router]);

  // Fetch on mount, and whenever PAGE or APPLIED filters change
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Render rows directly (server handles filters)
  const filteredRows = rows;

  // Apply button: copy UI -> applied; reset to page 1
  const onApplyFilters = () => {
    setCurrentPage(1);
    setApplied({
      statusId: uiStatusId,
      pickedDate: uiPickedDate,
      clientText: uiClientText,
      assigneeText: uiAssigneeText,
      regionText: uiRegionText,
    });
    setAppliedIds({ client_id: uiClientId || undefined, assignee_id: uiAssigneeId || undefined, region_id: uiRegionId || undefined });
    // No direct fetch here; useEffect will run because `applied` changes
  };

  // Clear button: reset both UI & applied; reset to page 1
  const onClearFilters = () => {
    setUiClientText('');
    setUiClientId('');
    setUiAssigneeText('');
    setUiAssigneeId('');
    setUiRegionText('');
    setUiRegionId('');
    setUiStatusId('');
    setUiPickedDate(undefined);

    setCurrentPage(1);
    setApplied({
      statusId: '',
      pickedDate: undefined,
      clientText: '',
      assigneeText: '',
      regionText: '',
    });
    setAppliedIds({});
    // useEffect will fetch
  };

  const JobActions = (j: JobRow) => (
    <div className="flex gap-2 justify-center">
      {canView && (
        <Button
          size="icon"
          variant="outline"
          className="rounded-full button-click-effect"
          style={{ borderColor: primaryColor, color: primaryColor }}
          onClick={() => router.push(`/jobs/view/${j.job_id}`)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      )}
      {canEdit && (() => {
        const normalize = (s: string) => (s || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
        const statusKey = normalize(j.job_status?.job_status_title || '');
        const locked = ['completed', 'rejected', 'unresolved'].includes(statusKey);
        const btn = (
          <Button
            size="icon"
            variant="outline"
            className="rounded-full button-click-effect"
            style={{ borderColor: primaryColor, color: primaryColor }}
            onClick={() => router.push(`/jobs/edit/${j.job_id}`)}
            disabled={locked}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        );
        return locked ? (
          <span className="opacity-60 cursor-not-allowed" title="Editing disabled for completed/rejected/unresolved jobs">
            {btn}
          </span>
        ) : (
          btn
        );
      })()}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Job List</h1>
        {canAdd && (
          <Button
            onClick={() => router.push('/jobs/create')}
            style={{ backgroundColor: primaryColor, color: '#fff' }}
            className="rounded-3xl button-click-effect"
          >
            Create
          </Button>
        )}
      </div>

      <Card className="pt-0">
        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl">
          {/* Client async search/select */}
          <AsyncSearchSelect
            placeholder="Client"
            fetchUrl="/admin/clients"
            value={uiClientText}
            onChange={(label, opt) => { setUiClientText(label); setUiClientId(opt?.value || ''); }}
            mapResponse={(d: any) =>
              (d?.data || []).map((c: any) => ({
                value: c.client_id,
                label: [c.firstName, c.lastName].filter(Boolean).join(' '),
              }))
            }
          />

          {/* Assign to async search/select */}
          <AsyncSearchSelect
            placeholder="Assigned To"
            fetchUrl="/admin/users"
            value={uiAssigneeText}
            onChange={(label, opt) => { setUiAssigneeText(label); setUiAssigneeId(opt?.value || ''); }}
            mapResponse={(d: any) =>
              (d?.data || []).map((u: any) => ({
                value: u.user_id,
                label: u.name,
              }))
            }
          />

          {/* Region async search/select */}
          <AsyncSearchSelect
            placeholder="Region"
            fetchUrl="/masters/regions"
            value={uiRegionText}
            onChange={(label, opt) => { setUiRegionText(label); setUiRegionId(opt?.value || ''); }}
            mapResponse={(d: any) =>
              (d?.data || []).map((r: any) => ({
                value: r.region_id,
                label: r.region_name,
              }))
            }
          />

          {/* Single date filter (UI) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'h-8 w-44 rounded-full px-3 justify-start gap-2',
                  !uiPickedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon size={18} />
                {uiPickedDate ? format(uiPickedDate, 'PP') : 'Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Calendar
                mode="single"
                selected={uiPickedDate}
                onSelect={(d?: Date) => setUiPickedDate(d)}
              />
            </PopoverContent>
          </Popover>

          {/* Status dropdown (UI) */}
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <LoaderCircle size={18} />
            <select
              className="outline-none bg-transparent text-sm h-8"
              value={uiStatusId}
              onChange={(e) => setUiStatusId(e.target.value)}
            >
              <option value="">Status</option>
              {statusOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 justify-end">
            <Button
              onClick={onApplyFilters}
              className="rounded-full flex gap-2"
            >
              <FilterIcon className="w-4 h-4" />
              Filter
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={onClearFilters}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="hidden md:block w-full overflow-x-auto px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Assign to</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-6 text-gray-500"
                  >
                    No results found
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((j) => {
                const clientName =
                  [j.client?.firstName, j.client?.lastName]
                    .filter(Boolean)
                    .join(' ') || '-';
                const assignee =
                  j.technician?.name || j.supervisor?.name || '-';
                const when = fmtDateTime12(j.scheduledDateAndTime);
                const lastUpdated = fmtDateTime12(j.updatedAt ?? (j as any).updated_at);
                const status = j.job_status?.job_status_title || '-';
                const bg = j.job_status?.job_status_color_code || '#f3f4f6'; // fallback gray-100
                const fg = getContrastText(bg);
                return (
                  <TableRow key={j.job_id}>
                    <TableCell>
                      {j.reference_number || j.job_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{clientName}</TableCell>
                    <TableCell>{assignee}</TableCell>
                    <TableCell>{when}</TableCell>
                    <TableCell>{lastUpdated}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className="rounded-full px-3 py-1 text-sm"
                        style={{ backgroundColor: bg, color: fg }}
                      >
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {JobActions(j)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4 p-4">
          {!loading && filteredRows.length === 0 && (
            <div className="text-center text-gray-500 py-6">
              No results found
            </div>
          )}
          {filteredRows.map((j) => {
            const clientName =
              [j.client?.firstName, j.client?.lastName]
                .filter(Boolean)
                .join(' ') || '-';
            const assignee = j.technician?.name || j.supervisor?.name || '-';
            const when = fmtDateTime12(j.scheduledDateAndTime);
            const lastUpdated = fmtDateTime12(j.updatedAt ?? (j as any).updated_at);
            const status = j.job_status?.job_status_title || '-';
            const bg = j.job_status?.job_status_color_code || '#f3f4f6';
            const fg = getContrastText(bg);
            return (
              <div key={j.job_id} className="border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{clientName}</div>
                  <span
                    className="rounded-full px-3 py-1 text-sm"
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {status}
                  </span>
                </div>
                <div className="text-sm mt-2">
                  <div>
                    <strong>Assign To:</strong> {assignee}
                  </div>
                  <div>
                    <strong>Date:</strong> {when}
                  </div>
                  <div>
                    <strong>Last Updated:</strong> {lastUpdated}
                  </div>
                </div>
                <div className="mt-2">{JobActions(j)}</div>
              </div>
            );
          })}
        </div>

        <div className="mr-8">
          <CustomPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </Card>
    </div>
  );
}




