// WorkTypePage.tsx
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Search, LoaderCircle, Pencil, X } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import { SidePopupForm, FormField } from './components/side-popup-form';

type WorkTypeRow = {
  company_id?: string;
  worktype_id?: string;
  worktype_name: string;
  worktype_description: string;
  status: boolean;
};

type PaginatedWorkTypes = {
  data: WorkTypeRow[];
  page: number;
  limit: number;
  total: number;
};

type Company = { company_id: string; name: string };
type StatusOpt = { value: string; label: string };
const PAGE_SIZE = 10;

export default function WorkTypePage() {
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor);
  const permissions = useSelector((s: RootState) => s.permissions.list);

  const SCREEN = 'Work Type';
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

  const [statusId, setStatusId] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [rows, setRows] = useState<WorkTypeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<WorkTypeRow | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [statusOpts] = useState<StatusOpt[]>([
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ]);

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

  const buildServerParams = useCallback(() => {
    const params: Record<string, string | number> = { page: currentPage, limit: PAGE_SIZE };
    if (statusId) params.status = statusId;
    return params;
  }, [currentPage, statusId]);

  const abortRef = useRef<AbortController | null>(null);

  const fetchWorkTypes = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await api.get<PaginatedWorkTypes>(URLS.GETWORKTYPE, {
        params: buildServerParams(),
        signal: controller.signal,
      });
      setRows(res.data?.data ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildServerParams]);

  useEffect(() => { fetchWorkTypes(); }, [fetchWorkTypes]);

  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter((r) =>
      !text ||
      r.worktype_name.toLowerCase().includes(text) ||
      r.worktype_description.toLowerCase().includes(text)
    );
  }, [rows, searchText]);

  const onApplyFilters = () => { setCurrentPage(1); setTimeout(fetchWorkTypes, 0); };
  const onClearFilters = () => { setSearchText(''); setStatusId(''); setCurrentPage(1); setTimeout(fetchWorkTypes, 0); };


  const ApiErrors = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;

    if (status === 404) {
      toast.error("Business Type not found. It may have already been deleted.");
    } else if (status === 403) {
      toast.error("You don't have permission to delete this Business Type.");
    } else if (status === 409) {
      toast.error("Business Type already exists. Please use a different name.");
    } else {
      toast.error("Failed to delete Business Type. Please try again.");
    }
  };





  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const payload = {
      worktype_name: (data.worktype_name as string) || '',
      worktype_description: (data.worktype_description as string) || '',
      status: (data.status === 'active'),
      company_id: isSuperAdmin ? (data.company_id as string) : user?.company_id,
    };
    try {
      if (editData) {
        await api.put(`${URLS.GETWORKTYPE}/${editData.worktype_id}`, payload);
      } else {
        await api.post(URLS.GETWORKTYPE, payload);
      }
      setIsOpen(false);
      setEditData(null);
      fetchWorkTypes();
      toast.success("Work Type saved successfully.");
    } catch (err) {
      console.error('Error saving work type', err);
      ApiErrors(err);
    }
  };



  const WorkTypeActions = (w: WorkTypeRow) => (
    <div className="flex gap-2 justify-center">
      {canEdit && (
        <Button
          size="icon"
          variant="outline"
          className="rounded-full button-click-effect"
          style={{ borderColor: primaryColor, color: primaryColor }}
          onClick={() => {
            setEditData(w);
            setIsOpen(true);
          }}
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
          setDeleteId(w.worktype_id!);
          setIsDeleteOpen(true);
        }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  const workTypeFields: FormField[] = (() => {
    const f: FormField[] = [];
    if (isSuperAdmin) {
      f.push({ key: 'company_id', label: 'Company', type: 'select', required: true });
    }
    f.push(
      { key: 'worktype_name', label: 'Name', type: 'text', required: true },
      { key: 'worktype_description', label: 'Remarks', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'toggle' }
    );
    return f;
  })();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Work Type List</h1>
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

      {/* Card with Filters & Table */}
      <Card className="pt-0 gap-0">
        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search work type"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <LoaderCircle size={18} />
            <select className="outline-none bg-transparent text-sm h-8" value={statusId} onChange={(e) => setStatusId(e.target.value)}>
              <option value="">Status</option>
              {statusOpts.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div className="flex gap-4 justify-end">
            <Button onClick={onApplyFilters} style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full flex gap-2">Filter</Button>
            <Button variant="outline" className="rounded-full" onClick={onClearFilters}>Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto  pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="text-center font-bold text-gray-800 ">S.No</TableHead>
                <TableHead className="font-bold text-gray-800 ">Company</TableHead>
                <TableHead className="font-bold text-gray-800 ">Work Type</TableHead>
                <TableHead className="font-bold text-gray-800 ">Remarks</TableHead>
                <TableHead className="text-center font-bold text-gray-800 ">Status</TableHead>
                <TableHead className="text-center font-bold text-gray-800 ">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">No results found</TableCell>
                </TableRow>
              )}
              {filteredRows.map((w, i) => {
                const company = companies.find(c => c.company_id === w.company_id)?.name || '-';

                return (
                  <TableRow key={w.worktype_id} className={`${ i % 2 === 0 ? 'bg-white' : 'bg-gray-50' }`}>
                    <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                    <TableCell>{company}</TableCell>
                    <TableCell>{w.worktype_name}</TableCell>
                    <TableCell>{w.worktype_description}</TableCell>
                    <TableCell className="text-center">
                      <span className={`rounded-full px-3 py-1 text-sm ${w.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {w.status ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{WorkTypeActions(w)}</TableCell>
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
        title={editData ? 'Edit Work Type' : 'Add New Work Type'}
        fields={workTypeFields}
        defaultValues={editData ? {
          ...(isSuperAdmin ? { company_id: editData.company_id } : {}),
          worktype_name: editData.worktype_name,
          worktype_description: editData.worktype_description,
          status: editData.status ? 'active' : 'inactive',
        } : undefined}
        onSubmit={handleFormSubmit}
        companies={companies}
      />

      {/* Delete Confirmation Popup */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete Work Type</h2>
            <p className="text-gray-600">Are you sure you want to delete this work type?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteId(null); }}>Cancel</Button>
              <Button
                style={{ backgroundColor: 'red', color: '#fff' }}
                onClick={async () => {
                  if (!deleteId) return;
                  try {
                    await api.delete(`${URLS.GETWORKTYPE}/${deleteId}`);
                    fetchWorkTypes();
                    toast.success("Work Type deleted successfully.");
                  } catch (err) {
                    console.error('Error deleting Work Type', err);
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
