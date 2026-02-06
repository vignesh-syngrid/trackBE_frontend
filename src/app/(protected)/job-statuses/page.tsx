// JobStatusPage.tsx
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
import { Search, Pencil, X, LoaderCircle } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import { SidePopupForm, FormField } from './components/side-popup-form';
import axios from 'axios';

type JobStatusRow = {
  job_status_id?: string;
  job_status_title: string;
  status: boolean;
  job_status_color_code: string;
};

type PaginatedJobStatus = {
  data: JobStatusRow[];
  page: number;
  limit: number;
  total: number;
};

type StatusOpt = { value: string; label: string };

const PAGE_SIZE = 10;

export default function JobStatusPage() {
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';

  const SCREEN = 'Job Status';
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [rows, setRows] = useState<JobStatusRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [statusId, setStatusId] = useState<string>(''); // filter status
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<JobStatusRow | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const [statusOpts] = useState<StatusOpt[]>([
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ]);

  const buildServerParams = useCallback(
    () => ({
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [currentPage]
  );

  // ✅ Improved fetchJobStatuses with silent cancel handling
  const fetchJobStatuses = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedJobStatus>(URLS.GET_JOBSTATUSES, {
        params: buildServerParams(),
        signal: controller.signal,
      });
      setRows(res.data?.data ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch (err: any) {
      // ✅ Ignore canceled requests (no console noise)
      if (axios.isCancel(err) || err.name === 'CanceledError') return;

      console.error('Failed to fetch job statuses', err);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildServerParams]);

  useEffect(() => {
    fetchJobStatuses();
  }, [fetchJobStatuses]);

  // ✅ Apply search + status filter client-side
  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !text || r.job_status_title.toLowerCase().includes(text);
      const matchesStatus =
        !statusId ||
        (statusId === 'true' && r.status) ||
        (statusId === 'false' && !r.status);
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchText, statusId]);

  const onApplyFilters = () => {
    setCurrentPage(1);
    fetchJobStatuses();
  };

  const onClearFilters = () => {
    setSearchText('');
    setStatusId('');
    setCurrentPage(1);
    fetchJobStatuses();
  };

  const ApiErrors = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      toast.error("Job Status not found. It may have already been deleted.");
    } else if (status === 403) {
      toast.error("You don't have permission to delete this Job Status.");
    } else if (status === 409) {
      toast.error("Job Status already exists. Please use a different name.");
    } else {
      toast.error("Failed to delete Job Status. Please try again.");
    }
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const payload = {
      job_status_title: data.job_status_title as string,
      status: data.status === 'active',
      job_status_color_code: data.job_status_color_code as string,
    };
    try {
      if (editData) {
        await api.put(`${URLS.GET_JOBSTATUSES}/${editData.job_status_id}`, payload);
      } else {
        await api.post(URLS.GET_JOBSTATUSES, payload);
      }
      setIsOpen(false);
      setEditData(null);
      fetchJobStatuses();
      toast.success("Job Status saved successfully.");
    } catch (error) {
      console.error('Error saving job status', error);
      ApiErrors(error);
    }
  };

  const JobStatusActions = (w: JobStatusRow) => (
    <div className="flex gap-2 justify-center">
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

      <Button
        size="icon"
        variant="outline"
        className="rounded-full button-click-effect"
        style={{ borderColor: 'red', color: 'red' }}
        onClick={() => {
          setDeleteId(w.job_status_id!);
          setIsDeleteOpen(true);
        }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  const jobStatusFields: FormField[] = [
    { key: 'job_status_title', label: 'Title', type: 'text', required: true },
    { key: 'job_status_color_code', label: 'Color', type: 'color', required: true },
    { key: 'status', label: 'Status', type: 'toggle' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Job Status List</h1>
        <Button
          onClick={() => {
            setIsOpen(true);
            setEditData(null);
          }}
          style={{ backgroundColor: primaryColor, color: '#fff' }}
          className="rounded-3xl button-click-effect"
        >
          Create
        </Button>
      </div>

      <Card className="pt-0 gap-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          {/* Search */}
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search job status"
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
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 justify-end">
            <Button onClick={onApplyFilters}   style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full flex gap-2">
              Filter
            </Button>
            <Button variant="outline" className="rounded-full" onClick={onClearFilters}>
              Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto pb-4">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Title</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Color</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Status</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    No results found
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((w, i) => (
                <TableRow key={w.job_status_id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <TableCell className="text-center">
                    {(currentPage - 1) * PAGE_SIZE + (i + 1)}
                  </TableCell>
                  <TableCell>{w.job_status_title}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className="rounded-full px-3 py-1 text-sm"
                      style={{ backgroundColor: w.job_status_color_code, color: '#fff' }}
                    >
                      {w.job_status_color_code}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${
                        w.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {w.status ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{JobStatusActions(w)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </Card>

      {/* Popup Form */}
      <SidePopupForm
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setEditData(null);
        }}
        title={editData ? 'Edit Job Status' : 'Add New Job Status'}
        fields={jobStatusFields}
        defaultValues={
          editData
            ? {
                job_status_title: editData.job_status_title,
                job_status_color_code: editData.job_status_color_code,
                status: editData.status ? 'active' : 'inactive',
              }
            : undefined
        }
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete Job Status</h2>
            <p className="text-gray-600">Are you sure you want to delete this job status?</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeleteId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: 'red', color: '#fff' }}
                onClick={async () => {
                  if (!deleteId) return;
                  try {
                    await api.delete(`${URLS.GET_JOBSTATUSES}/${deleteId}`);
                    fetchJobStatuses();
                    toast.success("Job Status deleted successfully.");
                  } catch (err) {
                    console.error('Error deleting Job Status', err);
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
