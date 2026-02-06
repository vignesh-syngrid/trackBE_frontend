'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Calendar as CalendarIcon } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';

const PAGE_SIZE = 10;

type AttendanceRow = {
  attendance_id: string;
  user_id: string;
  company_id: string;
  mode?: string;
  check_in_at?: string;
  check_out_at?: string;
  check_in_km?: number;
  check_out_km?: number;
  total_minutes?: number;
};

type User = {
  user_id: string; // note: user_id, not id
  name: string;
  company_id: string;
};

type Company = {
  id: string;
  name: string;
};

interface AttendanceParams {
  page: number;
  limit: number;
  from?: string;
  to?: string;
}

export default function AttendanceListPage() {
  const [attendances, setAttendances] = useState<AttendanceRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pickedDate, setPickedDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_USER);
      console.log('Users API:', res.data);

      const userList: User[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setUsers(userList);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  }, []);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_COMPANIES);
      console.log('Companies API:', res.data);

      const companyList: Company[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setCompanies(companyList);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setCompanies([]);
    }
  }, []);

  // Fetch attendance
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params: AttendanceParams = { page: currentPage, limit: PAGE_SIZE };
      if (pickedDate) {
        const start = new Date(pickedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(pickedDate);
        end.setHours(23, 59, 59, 999);
        params.from = start.toISOString();
        params.to = end.toISOString();
      }

      const res = await api.get(URLS.GET_ATTENDANCE, { params });
      console.log('Attendance API:', res.data);

      const attendanceList: AttendanceRow[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setAttendances(attendanceList);
      setTotal(res.data?.total ?? res.data?.data?.total ?? attendanceList.length);
    } catch (err) {
      console.error('Error fetching attendance', err);
      setAttendances([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pickedDate]);

  // Build lookup maps
  const userMap = useMemo(() => {
    const map: Record<string, { name: string; company_id: string }> = {};
    users.forEach((u) => {
      map[u.user_id] = {
        name: u.name,
        company_id: u.company_id,
      };
    });
    return map;
  }, [users]);

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [companies]);

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, [fetchUsers, fetchCompanies]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Attendance</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-44 justify-start px-3 gap-2 rounded-full"
            >
              <CalendarIcon size={18} />
              {pickedDate ? format(pickedDate, 'PP') : 'Select Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0">
            <Calendar
              mode="single"
              selected={pickedDate}
              onSelect={setPickedDate}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => {
            setPickedDate(undefined);
            setCurrentPage(1);
          }}
        >
          Clear
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>KMs</TableHead>
              <TableHead>Total Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && attendances.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                  No attendance found
                </TableCell>
              </TableRow>
            )}

            {attendances.map((att, i) => {
              const user = userMap[att.user_id];
              const companyName = user ? companyMap[user.company_id] : 'N/A';

              return (
                <TableRow key={att.attendance_id}>
                  <TableCell>{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                  <TableCell>{user?.name || 'Unknown'}</TableCell>
                  <TableCell>{companyName || 'N/A'}</TableCell>
                  <TableCell>{att.mode || '-'}</TableCell>
                  <TableCell>
                    {att.check_in_at ? format(new Date(att.check_in_at), 'PPpp') : '-'}
                  </TableCell>
                  <TableCell>
                    {att.check_out_at ? format(new Date(att.check_out_at), 'PPpp') : '-'}
                  </TableCell>
                  <TableCell>
                    {att.check_in_km ?? 0} / {att.check_out_km ?? 0} km
                  </TableCell>
                  <TableCell>{att.total_minutes ?? 0} mins</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
}
