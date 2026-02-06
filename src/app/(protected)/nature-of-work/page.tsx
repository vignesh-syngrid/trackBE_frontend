// WorkTypePage.tsx
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Search, LoaderCircle, Pencil, X } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import { SidePopupForm, FormField } from './components/side-popup-form';

/* ===================================================
   📌 Types
=================================================== */
type NatureofWorkRow = {
  now_id?: string;
  now_name: string;
  now_status: boolean;
};

type PaginatedNatureofWork = {
  data: NatureofWorkRow[];
  page: number;
  limit: number;
  total: number;
};

type StatusOpt = { value: string; label: string };

const PAGE_SIZE = 10;

/* ===================================================
   📌 Component
=================================================== */
export default function NatureofWorkPage() {
  /* ---------- Redux Data ---------- */
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';

  /* ---------- States ---------- */
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [statusId, setStatusId] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [rows, setRows] = useState<NatureofWorkRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<NatureofWorkRow | null>(null);

  const [statusOpts] = useState<StatusOpt[]>([
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  /* ===================================================
     📌 Build API Params
  =================================================== */
  const buildServerParams = useCallback(() => {
    const params: Record<string, string | number> = {
      page: currentPage,
      limit: PAGE_SIZE,
    };
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

  /* ===================================================
     📌 Fetch Work Types
  =================================================== */
  const fetchNatureofWork = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedNatureofWork>(URLS.GET_NATUREOFWORK, {
        params: buildServerParams(),
        signal: controller.signal,
      });
      setRows(res.data?.data ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch (err) {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildServerParams]);

  useEffect(() => {
    fetchNatureofWork();
  }, [fetchNatureofWork]);



  const ApiErrors = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;

    if (status === 404) {
      toast.error("Nature of Work not found. It may have already been deleted.");
    } else if (status === 403) {
      toast.error("You don't have permission to delete this Nature of Work.");
    } else if (status === 409) {
      toast.error("Nature of Work already exists. Please use a different name.");
    } else {
      toast.error("Failed to delete Nature of Work. Please try again.");
    }
  };
  /* ===================================================
     📌 Filtering
  =================================================== */
  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter((r) =>
      !text || r.now_name.toLowerCase().includes(text)
    );
  }, [rows, searchText]);

  const onApplyFilters = () => {
    setCurrentPage(1);
    setTimeout(fetchNatureofWork, 0);
  };
  const onClearFilters = () => {
    setSearchText('');
    setStatusId('');
    setPickedDate(undefined);
    setCurrentPage(1);
    setTimeout(fetchNatureofWork, 0);
  };

  /* ===================================================
     📌 Form Submit
  =================================================== */
  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const payload = {
      now_name: String(data.now_name ?? ''),
      now_status: !!data.now_status,
    };
    try {
      if (editData) {
        await api.put(`${URLS.GET_NATUREOFWORK}/${editData.now_id}`, payload);
      } else {
        await api.post(URLS.GET_NATUREOFWORK, payload);
      }
      setIsOpen(false);
      setEditData(null);
      fetchNatureofWork();
      toast.success("Nature of Work Saved successfully.");
    } catch (err) {
      console.error('Error saving Nature of Work', err);
    }
  };



  /* ===================================================
     📌 Table Actions
  =================================================== */
  const NatureofWorkActions = (n: NatureofWorkRow) => (
    <div className="flex gap-2 justify-center">

      <Button
        size="icon"
        variant="outline"
        className="rounded-full button-click-effect"
        style={{ borderColor: primaryColor, color: primaryColor }}
        onClick={() => {
          setEditData(n);
          setIsOpen(true);
        }}
      >
        <Pencil className="w-4 h-4" />
      </Button>

      <Button
        size="icon"
        variant="outline"
        className="rounded-full button-click-effect"
        style={{ borderColor: 'red', color: 'red' }}
        onClick={() => {
          setDeleteId(n.now_id!);
          setIsDeleteOpen(true);
        }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  /* ===================================================
     📌 Form Fields
  =================================================== */
  const natureofWorkFields: FormField[] = [
    { key: "now_name", label: "Name", type: "text", required: true },
    { key: "now_status", label: "Status", type: "toggle" }, // toggle expects boolean
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ===================================================
     📌 Render
  =================================================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Nature of Work List</h1>

        <Button
          onClick={() => { setIsOpen(true); setEditData(null); }}
          style={{ backgroundColor: primaryColor, color: '#fff' }}
          className="rounded-3xl button-click-effect"
        >
          Create
        </Button>

      </div>

      {/* Card: Filters + Table */}
      <Card className="pt-0 gap-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          {/* Search */}
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search work type"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>



          {/* Status */}
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <LoaderCircle size={18} />
            <select
              className="outline-none bg-transparent text-sm h-8"
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
            >
              <option value="">Status</option>
              {statusOpts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Filter / Clear Buttons */}
          <div className="flex gap-4 justify-end">
            <Button onClick={onApplyFilters}  style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full flex gap-2">Filter</Button>
            <Button variant="outline" className="rounded-full" onClick={onClearFilters}>Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto pb-4">
          <Table>
            <TableHeader className="px-6">
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Nature of Work</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Status</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    No results found
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((n, i) => (
                <TableRow key={n.now_id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <TableCell className="  text-center">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                  <TableCell >{n.now_name}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${n.now_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {n.now_status ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{NatureofWorkActions(n)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* Popup Form */}
      <SidePopupForm
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setEditData(null); }}
        title={editData ? 'Edit Nature of Work' : 'Add New Nature of Work'}
        fields={natureofWorkFields}
        defaultValues={editData ? {
          now_name: editData.now_name,
          now_status: editData.now_status, // boolean
        } : { now_status: true }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Popup */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete Work Type</h2>
            <p className="text-gray-600">Are you sure you want to delete this work type?</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setIsDeleteOpen(false); setDeleteId(null); }}
              >
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: 'red', color: '#fff' }}
                onClick={async () => {
                  if (!deleteId) return;
                  try {
                    await api.delete(`${URLS.GET_NATUREOFWORK}/${deleteId}`);
                    fetchNatureofWork();
                     toast.success("Nature of Work deleted successfully.");
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
