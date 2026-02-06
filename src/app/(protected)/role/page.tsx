// RolesPage.tsx
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Search, Pencil, X } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import { SidePopupForm, FormField } from '../role/components/side-popup-form';

type RoleRow = {
  role_id?: string;
  role_name: string;
  role_slug: string;
  status: boolean;
};

type PaginatedRole = {
  data: RoleRow[];
  page: number;
  limit: number;
  total: number;
};

type StatusOpt = { value: string; label: string };
const PAGE_SIZE = 10;

export default function RolesPage() {
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';
  const permissions = useSelector((s: RootState) => s.permissions.list);

  const SCREEN = 'Roles';
  const canView = permissions.some((p) => p.screen === SCREEN && p.view);
  const canEdit = permissions.some((p) => p.screen === SCREEN && p.edit);
  const canAdd = permissions.some((p) => p.screen === SCREEN && p.add);

  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [statusId, setStatusId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<RoleRow | null>(null);

  const [statusOpts] = useState<StatusOpt[]>([
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

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

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedRole>(URLS.GET_ROLES, {
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
    fetchRoles();
  }, [fetchRoles]);

  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter(
      (r) =>
        !text ||
        r.role_name.toLowerCase().includes(text) ||
        r.role_slug.toLowerCase().includes(text)
    );
  }, [rows, searchText]);

  const onApplyFilters = () => {
    setCurrentPage(1);
    setTimeout(fetchRoles, 0);
  };
  const onClearFilters = () => {
    setSearchText('');
    setStatusId('');
    setPickedDate(undefined);
    setCurrentPage(1);
    setTimeout(fetchRoles, 0);
  };

  const ApiErrors = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;

    if (status === 404) {
      toast.error("Role not found. It may have already been deleted.");
    } else if (status === 403) {
      toast.error("You don't have permission to delete this Role.");
    } else if (status === 409) {
      toast.error("Role already exists. Please use a different name.");
    } else {
      toast.error("Failed to delete Role. Please try again.");
    }
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const roleName = String(data.role_name ?? '');
    const slug = roleName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');

    const payload = {
      role_name: roleName,
      role_slug: String(data.role_slug ?? slug),
      status: Boolean(data.status),
    };

    try {
      if (editData) {
        await api.put(`${URLS.GET_ROLES}/${editData.role_id}`, payload);
      } else {
        await api.post(URLS.GET_ROLES, payload);
      }
      setIsOpen(false);
      setEditData(null);
      fetchRoles();
      toast.success("Role saved successfully.");
    } catch (err: unknown) {
      console.error("Error saving role", (err as any)?.response?.data ?? (err as Error).message ?? err);
      ApiErrors(err);
    }
  };

  const RoleActions = (r: RoleRow) => (
    <div className="flex gap-2 justify-center">
      {canEdit && (
        <Button
          size="icon"
          variant="outline"
          className="rounded-full button-click-effect"
          style={{ borderColor: primaryColor, color: primaryColor }}
          onClick={() => {
            setEditData(r);
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
          setDeleteId(r.role_id!);
          setIsDeleteOpen(true);
        }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  const roleFields: FormField[] = [
    { key: 'role_name', label: 'Role Name', type: 'text', required: true },
    { key: 'role_slug', label: 'Role Slug', type: 'text',  disabled: !!editData, readonly: !!editData },
    { key: 'status', label: 'Status', type: 'toggle' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Roles</h1>
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

      {/* Card: Filters + Table */}
      <Card className="pt-0 gap-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search role"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
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

          <div className="flex gap-4 justify-end">
            <Button onClick={onApplyFilters}      style={{ backgroundColor: primaryColor, color: '#fff' }} className="rounded-full flex gap-2">Filter</Button>
            <Button variant="outline" className="rounded-full" onClick={onClearFilters}>Clear</Button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block w-full overflow-x-auto pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Role Name</TableHead>
                <TableHead className="font-bold text-gray-800">Role Slug</TableHead>
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
              {filteredRows.map((r, i) => (
                <TableRow key={r.role_id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                  <TableCell>{r.role_name}</TableCell>
                  <TableCell>{r.role_slug}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${
                        r.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.status ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{RoleActions(r)}</TableCell>
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
  title={editData ? 'Edit Role' : 'Add New Role'}
  fields={roleFields}
  defaultValues={editData ? {
    role_name: editData.role_name,
    role_slug: editData.role_slug,
    status: editData.status,
  } : { status: true, role_slug: '' }}
  onSubmit={handleFormSubmit}
/>

      {/* Delete Confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete Role</h2>
            <p className="text-gray-600">Are you sure you want to delete this role?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteId(null); }}>Cancel</Button>
              <Button
                style={{ backgroundColor: 'red', color: '#fff' }}
                onClick={async () => {
                  if (!deleteId) return;
                  try {
                    await api.delete(`${URLS.GET_ROLES}/${deleteId}`);
                    fetchRoles();
                    toast.success("Role deleted successfully.");
                  } catch (err) {
                    console.error('Error deleting role', err);
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
