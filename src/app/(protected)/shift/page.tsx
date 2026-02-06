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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, LoaderCircle, Pencil, X } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import { SidePopupForm, FormField } from './components/side-popup-form';

type ShiftRow = {
  shift_id: string;
  company_id: string;
  shift_name: string;
  shift_startTime: string;
  shift_endTime: string;
  description: string;
  status: boolean;
};

type PaginatedShifts = {
  data: ShiftRow[];
  page: number;
  limit: number;
  total: number;
};

type Company = { company_id: string; name: string };

const PAGE_SIZE = 10;

export default function ShiftPage() {
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';
  const permissions = useSelector((s: RootState) => s.permissions.list);

  const SCREEN = 'Shift';
  const canEdit = permissions.some((p) => p.screen === SCREEN && p.edit);
  const canAdd = permissions.some((p) => p.screen === SCREEN && p.add);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<ShiftRow | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);


 // get user from localStorage
  const user =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || 'null')
      : null;
  const isSuperAdmin = user?.role?.slug === 'super_admin';


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



  // Server params
  const buildServerParams = useCallback(() => ({ page: currentPage, limit: PAGE_SIZE, search: searchText }), [currentPage, searchText]);

  // Fetch shifts
  const fetchShiftList = useCallback(async () => {
     setLoading(true);
     if (abortRef.current) abortRef.current.abort();
     const controller = new AbortController();
     abortRef.current = controller;

     try {
       const res = await api.get<PaginatedShifts>(URLS.GET_SHIFT, { params: buildServerParams(), signal: controller.signal });
       setRows(res.data?.data ?? []);
       setTotal(res.data?.total ?? 0);
     } catch (err) {
       setRows([]);
       setTotal(0);
     } finally {
       setLoading(false);
     }
   }, [buildServerParams]);

  useEffect(() => { fetchShiftList(); }, [fetchShiftList]);

  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter(r => !text || r.shift_name.toLowerCase().includes(text) || r.description.toLowerCase().includes(text));
  }, [rows, searchText]);


  const ApiErrors = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;

    if (status === 404) {
      toast.error("Shift not found. It may have already been deleted.");
    } else if (status === 403) {
      toast.error("You don't have permission to delete this Shift.");
    } else if (status === 409) {
      toast.error("Shift already exists. Please use a different name.");
    } else {
      toast.error("Failed to delete Shift. Please try again.");
    }
  };



  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const payload = {
      company_id: isSuperAdmin ? String(data.company_id ?? '') : (user as any)?.company_id,
      shift_name: String(data.shift_name ?? ''),
      shift_startTime: String(data.shift_startTime ?? ''),
      shift_endTime: String(data.shift_endTime ?? ''),
      description: String(data.description ?? ''),
      status: (data.status === 'active') || Boolean(data.status),
    };

    try {
      if (editData) await api.put(`${URLS.GET_SHIFT}/${editData.shift_id}`, payload);
      else await api.post(URLS.GET_SHIFT, payload);

      setIsOpen(false);
      setEditData(null);
      fetchShiftList();
      toast.success("Shift saved successfully.");
    } catch (err: unknown) {
      console.error('Error saving Shift', err);
      ApiErrors(err);
    }
  };



  const ShiftActions = (s: ShiftRow) => (
    <div className="flex gap-2 justify-center">
      {canEdit && (
        <Button
          size="icon"
          variant="outline"
          className="rounded-full button-click-effect"
          style={{ borderColor: primaryColor, color: primaryColor }}
          onClick={() => { setEditData(s); setIsOpen(true); }}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      )}
      <Button
        size="icon"
        variant="outline"
        className="rounded-full button-click-effect"
        style={{ borderColor: 'red', color: 'red' }}
        onClick={() => { setDeleteId(s.shift_id); setIsDeleteOpen(true); }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  const shiftFields: FormField[] = (() => {
    const f: FormField[] = [];
    if (isSuperAdmin) f.push({ key: 'company_id', label: 'Company', type: 'select', required: true });
    f.push(
      { key: 'shift_name', label: 'Shift Name', type: 'text', required: true },
      { key: 'shift_startTime', label: 'Start Time', type: 'time', required: true },
      { key: 'shift_endTime', label: 'End Time', type: 'time', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'toggle' }
    );
    return f;
  })();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Shift List</h1>
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
        {/* Search */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search shift"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="flex gap-4 justify-end">
            <Button onClick={() => { setCurrentPage(1); fetchShiftList(); }}  style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full flex gap-2">Filter</Button>
            <Button variant="outline" className="rounded-full" onClick={() => { setSearchText(''); setCurrentPage(1); fetchShiftList(); }}>Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto  pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Shift Name</TableHead>
                <TableHead className="font-bold text-gray-800">Company</TableHead>
                <TableHead className="font-bold text-gray-800">Start Time</TableHead>
                <TableHead className="font-bold text-gray-800">End Time</TableHead>
                <TableHead className="font-bold text-gray-800">Description</TableHead>
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
              {filteredRows.map((s, i) => {
                const company = companies.find(c => String(c.company_id) === String(s.company_id))?.name || '-';
                const rowKey = s.shift_id ? `shift-${s.shift_id}` : `row-${i}`;
                return (
                  <TableRow key={rowKey} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                    <TableCell>{s.shift_name}</TableCell>
                    <TableCell>{company}</TableCell>
                    <TableCell>{s.shift_startTime}</TableCell>
                    <TableCell>{s.shift_endTime}</TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell className="text-center">
                      <span className={`rounded-full px-3 py-1 text-sm ${s.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.status ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{ShiftActions(s)}</TableCell>
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
        title={editData ? 'Edit Shift' : 'Add New Shift'}
        fields={shiftFields}
        defaultValues={editData ? {
          ...(isSuperAdmin ? { company_id: editData.company_id } : {}),
          shift_name: editData.shift_name,
          shift_startTime: editData.shift_startTime,
          shift_endTime: editData.shift_endTime,
          description: editData.description,
          status: Boolean(editData.status),
        } : { status: false }}
        onSubmit={handleFormSubmit}
        companies={companies}
      />

      {/* Delete Confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete Shift</h2>
            <p className="text-gray-600">Are you sure you want to delete this shift?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteId(null); }}>Cancel</Button>
              <Button
                style={{ backgroundColor: 'red', color: '#fff' }}
                onClick={async () => {
                  if (!deleteId) return;
                  try {
                    await api.delete(`${URLS.GET_SHIFT}/${deleteId}`);
                    fetchShiftList();
                    toast.success("Shift deleted successfully.");
                  } catch (err) {
                    console.error('Error deleting Shift', err);
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
