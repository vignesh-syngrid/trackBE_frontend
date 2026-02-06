// SubscriptionTypesPage.tsx
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

/* ===================================================
   📌 Types
=================================================== */
type SubscriptionRow = {
  subscription_id?: string;
  subscription_title: string;
  subscription_status: boolean;
};

type PaginatedSubscription = {
  data: SubscriptionRow[];
  page: number;
  limit: number;
  total: number;
};

type StatusOpt = { value: string; label: string };

const PAGE_SIZE = 10;

/* ===================================================
   📌 Component
=================================================== */
export default function SubscriptionTypesPage() {
  /* ---------- Redux Data ---------- */
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';
  const permissions = useSelector((s: RootState) => s.permissions.list);

  /* ---------- States ---------- */
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [statusId, setStatusId] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<SubscriptionRow | null>(null);

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
     📌 Fetch Subscription Type
  =================================================== */
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedSubscription>(URLS.GET_SUBSCRIPTION_TYPES, {
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
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  /* ===================================================
     📌 Filtering
  =================================================== */
  const filteredRows: SubscriptionRow[] = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter((r) =>
      !text || r.subscription_title.toLowerCase().includes(text)
    );
  }, [rows, searchText]);

  const onApplyFilters = () => {
    setCurrentPage(1);
    setTimeout(fetchSubscriptions, 0);
  };
  const onClearFilters = () => {
    setSearchText('');
    setStatusId('');
    setPickedDate(undefined);
    setCurrentPage(1);
    setTimeout(fetchSubscriptions, 0);
  };

  /* ===================================================
     📌 Form Submit
  =================================================== */
  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const payload = {
      subscription_title: String(data.subscription_title ?? ''),
      subscription_status: !!data.subscription_status,
    };
    try {
      if (editData) {
        await api.put(`${URLS.GET_SUBSCRIPTION_TYPES}/${editData.subscription_id}`, payload);
      } else {
        await api.post(URLS.GET_SUBSCRIPTION_TYPES, payload);
      }
      setIsOpen(false);
      setEditData(null);
      fetchSubscriptions();
      toast.success("Subscription Type saved successfully.");
    } catch (err) {
      console.error('Error saving subscription type', err);
    }
  };

   const ApiErrors = (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
    
      if (status === 404) {
        toast.error("Subscription Type not found. It may have already been deleted.");
      } else if (status === 403) {
        toast.error("You don't have permission to delete this Subscription Type.");
      } else if (status === 409) {
          toast.error("Subscription Type already exists. Please use a different name.");
      } else {
        toast.error("Failed to delete Subscription Type. Please try again.");
      }
    };
  

 

  /* ===================================================
     📌 Table Actions
  =================================================== */
  const SubscriptionActions = (s: SubscriptionRow) => (
    <div className="flex gap-2 justify-center">
     
        <Button
          size="icon"
          variant="outline"
          className="rounded-full button-click-effect"
          style={{ borderColor: primaryColor, color: primaryColor }}
          onClick={() => {
            setEditData(s);
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
          setDeleteId(s.subscription_id!);
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
  const subscriptionFields: FormField[] = [
    { key: "subscription_title", label: "Title", type: "text", required: true },
    { key: "subscription_status", label: "Status", type: "toggle" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ===================================================
     📌 Render
  =================================================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Subscription Type</h1>
       
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
              placeholder="Search subscription"
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
            <Button onClick={onApplyFilters}   style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full flex gap-2">Filter</Button>
            <Button variant="outline" className="rounded-full" onClick={onClearFilters}>Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Subscription Title</TableHead>
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
              {filteredRows.map((s: SubscriptionRow, i: number) => (
                <TableRow key={String(s.subscription_id)} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} `}>
                  <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                  <TableCell>{s.subscription_title}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${
                        s.subscription_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {s.subscription_status ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{SubscriptionActions(s)}</TableCell>
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
        title={editData ? 'Edit Subscription Type' : 'Add New Subscription Type'}
        fields={subscriptionFields}
        defaultValues={editData ? {
          subscription_title: editData.subscription_title,
          subscription_status: editData.subscription_status,
        } : { subscription_status: true }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Popup */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete Subscription Type</h2>
            <p className="text-gray-600">Are you sure you want to delete this subscription type?</p>
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
                    await api.delete(`${URLS.GET_SUBSCRIPTION_TYPES}/${deleteId}`);
                    fetchSubscriptions();
                      toast.success("Subscription Type deleted successfully.");
                  } catch (err) {
                    console.error('Error deleting subscription type', err);
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
