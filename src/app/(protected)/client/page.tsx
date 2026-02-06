'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Pencil, X } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import type { RootState } from '@/store/store';

type ClientRow = {
  client_id: string;
  business_typeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  visiting_startTime: string;
  visiting_endTime: string;
  available_status: boolean;
};

type PaginatedClients = {
  data: ClientRow[];
  page: number;
  limit: number;
  total: number;
};

type BusinessType = {
  business_typeId: string;
  business_typeName: string;
};

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const router = useRouter();
const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [businessTypes, setBusinessTypes] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  // Fetch business types
  const fetchBusinessTypes = useCallback(async () => {
    try {
      const res = await api.get<{ data: BusinessType[] }>(URLS.GET_BUSINESS_TYPES);
      const map: Record<string, string> = {};
      res.data.data.forEach(bt => (map[bt.business_typeId] = bt.business_typeName));
      setBusinessTypes(map);
    } catch (err) {
      console.error('Failed to fetch business types', err);
      setBusinessTypes({});
    }
  }, []);

  // Build API params
  const buildServerParams = useCallback(() => {
    const params: Record<string, string | number> = { page: currentPage, limit: PAGE_SIZE };
    if (statusFilter) params.available_status = statusFilter;
    return params;
  }, [currentPage, statusFilter]);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedClients>(URLS.GET_CLIENT, {
        params: buildServerParams(),
        signal: controller.signal,
      });
      setRows(res.data?.data ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch (err) {
      const e = err as any;
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') {
        // request was intentionally aborted, ignore
        return;
      }
      console.error('Fetch clients failed', err);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildServerParams]);

  useEffect(() => {
    fetchBusinessTypes();
    fetchClients();
  }, [fetchClients, fetchBusinessTypes]);

  // Filtered rows for search
  const filteredRows = useMemo(() => {
    const nameText = searchName.trim().toLowerCase();
    const emailText = searchEmail.trim().toLowerCase();
    const phoneText = searchPhone.trim().toLowerCase();

    return rows.filter(c =>
      (!nameText || `${c.firstName} ${c.lastName}`.toLowerCase().includes(nameText)) &&
      (!emailText || (c.email ?? '').toLowerCase().includes(emailText)) &&
      (!phoneText || (c.phone ?? '').toLowerCase().includes(phoneText))
    );
  }, [rows, searchName, searchEmail, searchPhone]);

  const onApplyFilters = () => {
    setCurrentPage(1);
    setTimeout(fetchClients, 0);
  };

  const onClearFilters = () => {
    setSearchName('');
    setSearchEmail('');
    setSearchPhone('');
    setStatusFilter('');
    setCurrentPage(1);
    setTimeout(fetchClients, 0);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(URLS.DELETE_CLIENT.replace('{id}', deleteId));
      fetchClients();
      toast.success('Client deleted successfully.');
    } catch (error) {
      console.error('Error deleting client', error);
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error as Error).message || 'Failed to delete client.');
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Clients</h1>
        <Button className="rounded-3xl"   style={{ backgroundColor: primaryColor, color: '#fff' }} onClick={() => router.push('/client/create')}>Create</Button>
      </div>

      {/* Filters + Table */}
      <Card className="pt-0 gap-0">
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <Input
            placeholder="Search name"
            className="h-8 w-44 border rounded-full px-3"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
          <Input
            placeholder="Search email"
            className="h-8 w-44 border rounded-full px-3"
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
          />
          <Input
            placeholder="Search phone"
            className="h-8 w-44 border rounded-full px-3"
            value={searchPhone}
            onChange={e => setSearchPhone(e.target.value)}
          />

          <select
            className="h-8 text-sm border rounded-full px-3"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Status</option>
            <option value="true">Available</option>
            <option value="false">Not Available</option>
          </select>

          <div className="flex gap-4">
            <Button onClick={onApplyFilters}   style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full">Filter</Button>
            <Button variant="outline" onClick={onClearFilters} className="rounded-full">Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto pb-4">
          <Table>
            <TableHeader>
               <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead  className="font-bold text-gray-800">Name</TableHead>
                <TableHead  className="font-bold text-gray-800">Email</TableHead>
                <TableHead  className="font-bold text-gray-800">Phone</TableHead>
                <TableHead  className="font-bold text-gray-800">Business Type</TableHead>
                <TableHead  className="font-bold text-gray-800">Visiting Time</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">Loading...</TableCell>
                </TableRow>
              )}
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">No results found</TableCell>
                </TableRow>
              )}
              {!loading && filteredRows.map((c, idx) => (
                <TableRow key={c.client_id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                  <TableCell>{c.firstName} {c.lastName}</TableCell>
                  <TableCell>{c.email || '-'}</TableCell>
                  <TableCell>{c.phone || '-'}</TableCell>
                  <TableCell>{businessTypes[c.business_typeId] ?? '-'}</TableCell>
                  <TableCell>{c.visiting_startTime} - {c.visiting_endTime}</TableCell>
                  <TableCell className="flex justify-center gap-2">
                    <Button size="icon" variant="outline" className="rounded-full" onClick={() => router.push(`/client/edit/${c.client_id}`)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="rounded-full" onClick={() => { setDeleteId(c.client_id); setIsDeleteOpen(true); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </Card>

      {/* Delete Confirmation Popup */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete Client</h2>
            <p className="text-gray-600">Are you sure you want to delete this client?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteId(null); }}>Cancel</Button>
              <Button style={{ backgroundColor: 'red', color: '#fff' }} onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
