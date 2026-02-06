// UsersPage.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Pencil, X, Search } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { CustomPagination } from '@/app/components/Pagination';

type UserRow = {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  company_id?: string;
  role_id?: string;
  region_ids?: string[];
  company_name?: string;
  role_name?: string;
  region_names?: string[];
};

type PaginatedUser = {
  data: UserRow[];
  page: number;
  limit: number;
  total: number;
};

const PAGE_SIZE = 10;

export default function UsersPage() {
  const router = useRouter();
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor);

  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState<{ company_id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ role_id: string; role_name: string }[]>([]);
  const [regions, setRegions] = useState<{ region_id: string; region_name: string }[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // Fetch master data  
  useEffect(() => {
    async function fetchMasters() {
      try {
        const [companyRes, roleRes, regionRes] = await Promise.all([
          api.get(URLS.GET_COMPANIES),
          api.get(URLS.GET_ROLES),
          api.get(URLS.GET_REGION),
        ]);
        setCompanies(companyRes.data?.data || []);
        setRoles(roleRes.data?.data || []);
        setRegions(regionRes.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch master data', err);
      }
    }
    fetchMasters();
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedUser>(URLS.GET_USER, {
        params: { page: currentPage, limit: PAGE_SIZE, search: searchText },
        signal: controller.signal,
      });

      const userData: any[] = res.data?.data || [];
      const mappedUsers = userData.map((u: any) => {
        // prefer response fields, then nested objects, then master lists
        const companyName = u.company_name ?? (u.Company?.name) ?? companies.find(c => String(c.company_id) === String(u.company_id))?.name ?? '-';
        const roleName = u.role_name ?? (u.Role?.role_name) ?? roles.find(r => String(r.role_id) === String(u.role_id))?.role_name ?? '-';

        let regionNames: string[] = [];
        if (Array.isArray(u.region_ids) && u.region_ids.length > 0) {
          regionNames = u.region_ids.map((id: string) => regions.find(r => String(r.region_id) === String(id))?.region_name ?? '').filter(Boolean);
        } else if (u.region_name) {
          regionNames = [String(u.region_name)];
        } else if (u.region && (u.region.region_name || u.region.name)) {
          regionNames = [u.region.region_name ?? u.region.name];
        }

        return {
          ...u,
          company_name: companyName,
          role_name: roleName,
          region_names: regionNames.length ? regionNames : [],
        } as UserRow;
      });

      setRows(mappedUsers);
      setTotal(Number(res.data?.total ?? 0));
    } catch (err: any) {
      if (err.name !== 'CanceledError') {
        console.error('Failed to fetch users', err);
        setRows([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchText, companies, roles, regions]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onApplyFilters = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const onClearFilters = () => {
    setSearchText('');
    setCurrentPage(1);
    fetchUsers();
  };

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(URLS.DELETE_USER.replace('{id}', id));
      toast.success('User deleted successfully.');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user', err);
      toast.error('Failed to delete user.');
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const UserActions = (u: UserRow) => (
    <div className="flex gap-2 justify-center">
      <Button
        size="icon"
        variant="outline"
        className="rounded-full button-click-effect"
        onClick={() => router.push(`/user/edit/${u.user_id}`)}
      >
        <Pencil className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="destructive"
        className="rounded-full button-click-effect"
        style={{ borderColor: 'red', color: '#fff' }}
        onClick={() => {
          setDeleteId(u.user_id);
          setIsDeleteOpen(true);
        }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Users</h1>
          <Button
          className="rounded-3xl" style={{ backgroundColor: primaryColor, color: '#fff' }}
          onClick={() => router.push('/user/create')}
        >
          Create
        </Button>
      </div>

      <Card className="pt-0 gap-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search by name/email/phone"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="flex gap-4 justify-end">
            <Button onClick={onApplyFilters} className="rounded-full" style={{ backgroundColor: primaryColor, color: '#fff' }}>Filter</Button>
            <Button variant="outline" className="rounded-full" onClick={onClearFilters}>Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Name</TableHead>
                <TableHead className="font-bold text-gray-800">Email</TableHead>
                <TableHead className="font-bold text-gray-800">Phone</TableHead>
                <TableHead className="font-bold text-gray-800">Company</TableHead>
                <TableHead className="font-bold text-gray-800">Role</TableHead>
                <TableHead className="font-bold text-gray-800">Region</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                    No results found
                  </TableCell>
                </TableRow>
              )}
              {rows.map((u, i) => (
                <TableRow key={u.user_id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>{u.company_name || '-'}</TableCell>
                  <TableCell>{u.role_name || '-'}</TableCell>
                  <TableCell>{u.region_names?.join(', ') || '-'}</TableCell>
                  <TableCell className="text-center">{UserActions(u)}</TableCell>
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

      {/* Delete Confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete User</h2>
            <p className="text-gray-600">Are you sure you want to delete this user?</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setIsDeleteOpen(false); setDeleteId(null); }}
              >
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: 'red', color: '#fff' }}
                onClick={() => deleteId && handleDelete(deleteId)}
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
