// StatesPage.tsx
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
type StateRow = {
  state_id?: string;
  state_name: string;
  state_status: boolean;
  country_id: number;
  country_name?: string;
};

type PaginatedState = {
  data: StateRow[];
  page: number;
  limit: number;
  total: number;
};

type CountryOpt = { value: number; label: string };
type StatusOpt = { value: string; label: string };

const PAGE_SIZE = 10;

/* ===================================================
   📌 Component
=================================================== */
export default function StatesPage() {
  /* ---------- Redux Data ---------- */
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor);
  const permissions = useSelector((s: RootState) => s.permissions.list);

  /* ---------- Permissions ---------- */
  // permissions may be used later; keep permissions object available
  const SCREEN = 'States';

  /* ---------- States ---------- */
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [statusId, setStatusId] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [rows, setRows] = useState<StateRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [countries, setCountries] = useState<CountryOpt[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<StateRow | null>(null);

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
    if (statusId) params.state_status = statusId;
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
     📌 Fetch Countries
  =================================================== */
  const fetchCountries = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_COUNTRIES);
      const list = res.data?.data ?? [];
      setCountries(list.map((c: any) => ({
        value: c.country_id,
        label: c.country_name
      })));
    } catch (err) {
      console.error('Error fetching countries', err);
    }
  }, []);

  /* ===================================================
     📌 Fetch States
  =================================================== */
  const fetchStates = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedState>(URLS.GET_STATES, {
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
    fetchCountries();
    fetchStates();
  }, [fetchStates, fetchCountries]);

  /* ===================================================
     📌 Filtering
  =================================================== */
  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter((r) =>
      !text || r.state_name.toLowerCase().includes(text)
    );
  }, [rows, searchText]);

    const onApplyFilters = () => {
    setCurrentPage(1);
    setTimeout(fetchStates, 0);
  };
  const onClearFilters = () => {
    setSearchText('');
    setStatusId('');
    setPickedDate(undefined);
    setCurrentPage(1);
    setTimeout(fetchStates, 0);
  };


   const ApiErrors = (err: any) => {
      const status = err?.response?.status;
    
      if (status === 404) {
        toast.error("State not found. It may have already been deleted.");
      } else if (status === 403) {
        toast.error("You don't have permission to delete this State.");
      } else if (status === 409) {
          toast.error("State already exists. Please use a different name.");
      } else {
        toast.error("Failed to delete State. Please try again.");
      }
    };
  
  
  


  /* ===================================================
     📌 Form Submit
  =================================================== */
  const handleFormSubmit = async (data: Record<string, any>) => {
    const payload = {
      country_id: Number(data.country_id),
      state_name: data.state_name,
      state_status: !!data.state_status,
    };
    try {
      if (editData) {
        await api.put(`${URLS.GET_STATES}/${editData.state_id}`, payload);
      } else {
        await api.post(URLS.GET_STATES, payload);
      }
      setIsOpen(false);
      setEditData(null);
      fetchStates();
      toast.success("State saved successfully.");
    } catch (err) {
      console.error('Error saving state', err);
      ApiErrors(err);
    }
  };

  /* ===================================================
     📌 Delete State
  =================================================== */
 
  /* ===================================================
     📌 Table Actions
  =================================================== */
  const StateActions = (s: StateRow) => (
    <div className="flex gap-2 justify-center">
      
        <Button
          size="icon"
          variant="outline"
          className="rounded-full"
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
        className="rounded-full"
        style={{ borderColor: 'red', color: 'red' }}
        onClick={() => {
          setDeleteId(s.state_id!);
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
  const stateFields: FormField[] = [
    { key: "country_id", label: "Country", type: "select", required: true,  },
    { key: "state_name", label: "State Name", type: "text", required: true },
    { key: "state_status", label: "Status", type: "toggle" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ===================================================
     📌 Render
  =================================================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">States</h1>
       
          <Button
            onClick={() => { setIsOpen(true); setEditData(null); }}
            style={{ backgroundColor: primaryColor, color: '#fff' }}
            className="rounded-3xl"
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
              placeholder="Search state"
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
                      <Button onClick={onApplyFilters} className="rounded-full flex gap-2"  style={{ backgroundColor: primaryColor, color: '#fff' }}>
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

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto  pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Country</TableHead>
                <TableHead className="font-bold text-gray-800">State</TableHead>
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
              {filteredRows.map((s, i) => {
  const country = countries.find(c => c.value === s.country_id)?.label || '-';
  return (
    <TableRow key={s.state_id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
      <TableCell>{country}</TableCell>
      <TableCell>{s.state_name}</TableCell>
      <TableCell className="text-center">
        <span
          className={`rounded-full px-3 py-1 text-sm ${
            s.state_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {s.state_status ? 'Active' : 'Inactive'}
        </span>
      </TableCell>
      <TableCell className="text-center">{StateActions(s)}</TableCell>
    </TableRow>
  );
})}
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
  title={editData ? 'Edit State' : 'Add New State'}
  fields={stateFields}
  defaultValues={editData ? {
    country_id: editData.country_id,
    state_name: editData.state_name,
    state_status: editData.state_status,
  } : { state_status: true }}
  onSubmit={handleFormSubmit}
  countries={countries.map(c => ({ country_id: c.value, country_name: c.label }))}
/>

      {/* Delete Confirmation Popup */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete State</h2>
            <p className="text-gray-600">Are you sure you want to delete this state?</p>
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
                    await api.delete(`${URLS.GET_STATES}/${deleteId}`);
                    fetchStates();
                    toast.success("State deleted successfully.");
                  } catch (err) {
                    console.error('Error deleting state', err);
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
