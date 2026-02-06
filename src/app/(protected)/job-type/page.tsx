'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, LoaderCircle, Pencil, X } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SidePopupForm, FormField } from './components/side-popup-form';

type JobTypeRow = {
  jobtype_id: string;
  company_id: string;
  worktype_id: string;
  jobtype_name: string;
  description: string;
  estimated_duration: number;
  status: boolean;
};

type PaginatedJobTypes = {
  data: JobTypeRow[];
  page: number;
  limit: number;
  total: number;
};

type Company = { company_id: string; name: string };
type WorkType = { worktype_id: string; worktype_name: string };
type StatusOpt = { value: string; label: string };

const PAGE_SIZE = 10;

export default function WorkTypePage() {
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';
  const permissions = useSelector((s: RootState) => s.permissions.list);

  const SCREEN = 'Job Type';
  const canEdit = permissions.some((p) => p.screen === SCREEN && p.edit);
  const canAdd = permissions.some((p) => p.screen === SCREEN && p.add);


  // get user from localStorage
  const user =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || 'null')
      : null;
  const isSuperAdmin = user?.role?.slug === 'super_admin';


  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [rows, setRows] = useState<JobTypeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [statusId, setStatusId] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<JobTypeRow | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [worktypes, setWorktypes] = useState<WorkType[]>([]);
  const [statusOpts] = useState<StatusOpt[]>([
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ]);

  const abortRef = useRef<AbortController | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
const [isDeleteOpen, setIsDeleteOpen] = useState(false);


// Fetch companies (for super admin)
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get<{ data: Company[] }>(URLS.GET_COMPANIES);
        setCompanies(res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch companies', err);
      }
    };
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  // Fetch work types for lookup
  useEffect(() => {
    const fetchWorktypes = async () => {
      try {
        const res = await api.get<{ data: WorkType[] }>(URLS.GETWORKTYPE);
        setWorktypes(res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch work types', err);
        setWorktypes([]);
      }
    };
    fetchWorktypes();
  }, []);



  // Build server params
  const buildServerParams = useCallback(() => {
    const params: Record<string, string | number> = { page: currentPage, limit: PAGE_SIZE };
    if (statusId) params.status = statusId;
    if (pickedDate) {
      const start = new Date(pickedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(pickedDate);
      end.setHours(23, 59, 59, 999);
      params.from = start.toISOString();
      params.to = end.toISOString();
    }
    return params;
  }, [currentPage, statusId, pickedDate]);

  // Fetch Job Types
  const fetchJobTypesList = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedJobTypes>(URLS.GET_JOB_TYPE, {
        params: buildServerParams(),
        signal: controller.signal,
      });
      setRows(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildServerParams]);

  useEffect(() => { fetchJobTypesList(); }, [fetchJobTypesList]);

  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter(r =>
      !text || r.jobtype_name.toLowerCase().includes(text) || r.description.toLowerCase().includes(text)
    );
  }, [rows, searchText]);

  const ApiErrors = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;

    if (status === 404) {
      toast.error("Job Type not found. It may have already been deleted.");
    } else if (status === 403) {
      toast.error("You don't have permission to delete this Job Type.");
    } else if (status === 409) {
      toast.error("Job Type already exists. Please use a different name.");
    } else {
      toast.error("Failed to delete Job Type. Please try again.");
    }
  };



  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const totalMins = Math.max(0, Number(data.estimated_duration ?? 0));

    const payload = {
      jobtype_name: String(data.jobtype_name ?? ''),
      description: String(data.description ?? ''),
      status: data.status === 'active',
      company_id: isSuperAdmin ? (data.company_id as string) : user?.company_id,
      worktype_id: String(data.worktype_id ?? ''),
      estimated_duration: totalMins,
    };
    try {
      if (editData) await api.put(`${URLS.GET_JOB_TYPE}/${editData.jobtype_id}`, payload);
      else await api.post(URLS.GET_JOB_TYPE, payload);

      setIsOpen(false);
      setEditData(null);
      fetchJobTypesList();
      toast.success("Job Type saved successfully.");
    } catch (err) {
      console.error('Error saving Job type', err);
      ApiErrors(err);
    }
  };



  const JobTypeActions = (j: JobTypeRow) => (
    <div className="flex gap-2 justify-center">
      {canEdit && (
        <Button
          size="icon"
          variant="outline"
          className="rounded-full button-click-effect"
          style={{ borderColor: primaryColor, color: primaryColor }}
          onClick={() => { setEditData(j); setIsOpen(true); }}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      )}
    <Button
      size="icon"
      variant="outline"
      className="rounded-full button-click-effect"
      style={{ borderColor: 'red', color: 'red' }}
      onClick={() => {
        setDeleteId(j.jobtype_id!);
        setIsDeleteOpen(true);
      }}
    >
      <X className="w-4 h-4" />
    </Button>

    </div>
  );

  const jobTypeFields: FormField[] = (() => {
    const f: FormField[] = [];
    if (isSuperAdmin) f.push({ key: 'company_id', label: 'Company', type: 'select', required: true });
    f.push(
      { key: 'worktype_id', label: 'Work Type', type: 'select', required: true },
      { key: 'jobtype_name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Remarks', type: 'textarea' },
      { key: 'estimated_duration', label: 'Estimated Duration (minutes)', type: 'duration', required: true },
      { key: 'status', label: 'Status', type: 'toggle' }
    );
    return f;
  })();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Job Type List</h1>
        {canAdd && (
          <Button
            onClick={() => { setIsOpen(true); setEditData(null); }}
            style={{ backgroundColor: primaryColor, color: '#fff' }}
            className="rounded-3xl button-click-effect"
          >
            Create
          </Button>
        )}
      </div>

      <Card className="pt-0 gap-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search job type"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <LoaderCircle size={18} />
            <select className="outline-none bg-transparent text-sm h-8" value={statusId} onChange={(e) => setStatusId(e.target.value)}>
              <option value="">Status</option>
              {statusOpts.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div className="flex gap-4 justify-end">
            <Button onClick={() => { setCurrentPage(1); fetchJobTypesList(); }}   style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full flex gap-2">Filter</Button>
            <Button variant="outline" className="rounded-full" onClick={() => { setSearchText(''); setStatusId(''); setPickedDate(undefined); setCurrentPage(1); fetchJobTypesList(); }}>Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto   pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800 ">Job Type</TableHead>
                <TableHead className="font-bold text-gray-800 ">Work Type</TableHead>
                <TableHead className="font-bold text-gray-800 ">Company</TableHead>
                <TableHead className="font-bold text-gray-800 ">Remarks</TableHead>
                <TableHead className="font-bold text-gray-800 ">Duration</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Status</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-gray-500">No results found</TableCell>
                </TableRow>
              )}
              {filteredRows.map((j, i) => {
                const company = companies.find(c => c.company_id === j.company_id)?.name || '-';
                const worktype = worktypes.find(w => String(w.worktype_id) === String(j.worktype_id))?.worktype_name || '-';
                const rowKey = j.jobtype_id ? `job-${j.jobtype_id}` : `row-${i}`;
                return (
                  <TableRow key={rowKey} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                    <TableCell>{j.jobtype_name}</TableCell>
                    <TableCell>{worktype}</TableCell>
                    <TableCell>{company}</TableCell>
                    <TableCell>{j.description}</TableCell>
                    <TableCell>{formatDuration(j.estimated_duration)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`rounded-full px-3 py-1 text-sm ${j.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {j.status ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{JobTypeActions(j)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </Card>

      <SidePopupForm
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setEditData(null); }}
        title={editData ? 'Edit Job Type' : 'Add New Job Type'}
        fields={jobTypeFields}
        defaultValues={editData ? {
          ...(isSuperAdmin ? { company_id: editData.company_id } : {}),
          worktype_id: editData.worktype_id,
          jobtype_name: editData.jobtype_name,
          description: editData.description,
          estimated_duration: editData.estimated_duration,
          status: editData.status ? 'active' : 'inactive',
        } : undefined}
        onSubmit={handleFormSubmit}
        companies={companies}
        worktypes={worktypes}
      />

      {/* Delete Confirmation Popup */}
{isDeleteOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
      <h2 className="text-lg font-semibold text-gray-800">Delete Job Type</h2>
      <p className="text-gray-600">Are you sure you want to delete this job type?</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteId(null); }}>Cancel</Button>
        <Button
          style={{ backgroundColor: 'red', color: '#fff' }}
          onClick={async () => {
            if (!deleteId) return;
            try {
              await api.delete(`${URLS.GET_JOB_TYPE}/${deleteId}`);
              fetchJobTypesList();
              toast.success("Job Type deleted successfully.");
            } catch (err) {
              console.error('Error deleting Job Type', err);
              ApiErrors(err);
            } finally {
              setIsDeleteOpen(false);
              setDeleteId(null);
            }
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  </div>
)}


    </div>
  );
}
