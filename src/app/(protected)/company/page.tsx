'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // ✅ Added Input import
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash, Search } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import type { RootState } from '@/store/store';
type CompanyRow = {
  company_id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  status: boolean;
};

type PaginatedCompanies = {
  data: CompanyRow[];
  page: number;
  limit: number;
  total: number;
};

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedCompanies>(URLS.GET_COMPANIES, {
        params: { page: currentPage, limit: PAGE_SIZE },
      });
      setCompanies(res.data?.data ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch (err) {
      console.error('Failed to fetch companies', err);
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`${URLS.GET_COMPANIES}/${deleteId}`);
      setIsDeleteOpen(false);
      setDeleteId(null);
      fetchCompanies();
    } catch (err) {
      console.error('Delete failed', err);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  // Client-side filtering
  const filteredCompanies = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return companies.filter(c =>
      !text ||
      c.name.toLowerCase().includes(text) ||
      (c.phone || '').includes(text) ||
      (c.email || '').toLowerCase().includes(text) ||
      (c.city || '').toLowerCase().includes(text)
    );
  }, [companies, searchText]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Companies</h1>
        <Button
          className="rounded-3xl"
           style={{ backgroundColor: primaryColor, color: '#fff' }}
          onClick={() => router.push('/company/create')}
        >
          Create
        </Button>
      </div>

      <Card className="gap-0 py-0">
        {/* Search Filter */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search by name/phone/email/city"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCurrentPage(1)}  style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full">Filter</Button>
            <Button variant="outline" onClick={() => { setSearchText(''); setCurrentPage(1); }} className="rounded-full">Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto  pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="text-center font-bold text-gray-800 ">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Company Name</TableHead>
                <TableHead className="font-bold text-gray-800">Phone</TableHead>
                <TableHead className="font-bold text-gray-800">Email</TableHead>
                <TableHead className="font-bold text-gray-800">City</TableHead>
                <TableHead className="text-center font-bold text-gray-800">Status</TableHead>
                <TableHead className="text-center font-bold text-gray-800">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredCompanies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    No results found
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filteredCompanies.map((c, idx) => (
                  <TableRow key={c.company_id}  className={`${ idx % 2 === 0 ? 'bg-white' : 'bg-gray-50' }`}>
                    <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>{c.email || '-'}</TableCell>
                    <TableCell>{c.city || '-'}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-sm ${
                          c.status
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {c.status ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center flex justify-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => router.push(`/company/edit/${c.company_id}`)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => handleDelete(c.company_id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mr-8">
          <CustomPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </Card>

      {/* Delete Confirmation Popup */}
      {isDeleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-800">Delete Company</h2>
              <p className="text-gray-600">Are you sure you want to delete this company?</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteId(null); }}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
