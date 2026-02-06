'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { toast } from "sonner";
import api from '@/utils/api';
import { URLS } from '@/utils/urls';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Search, Filter as FilterIcon, Trash , Eye} from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import { SidePopupForm, FormField } from './components/side-popup-form';

type RegionRow = {
  region_id: number;
  region_name: string;
  company_id?: string | number;
  country_id?: string | number;
  state_id?: string | number;
  district_id?: string | number;
  pincodes: string[];
  status: boolean;

  // Sometimes backend sends nested objects
  company?: { company_id: string | number; name: string };
  country?: { country_id: string | number; country_name: string };
  state?: { state_id: string | number; state_name: string };
  district?: { district_id: string | number; district_name: string };
};

type PaginatedRegions = {
  data: RegionRow[];
  page: number;
  limit: number;
  total: number;
};

type CompanyRow = {
  company_id: string | number;
  name: string;
  status: boolean;
};

type CountryRow = {
  country_id: string | number;
  country_name: string;
};

type StateRow = {
  state_id: string | number;
  state_name: string;
};

type DistrictRow = {
  district_id: string | number;
  district_name: string;
};

const PAGE_SIZE = 10;

export default function RegionsPage() {
  const router = useRouter();
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) ?? '#4F46E5';
  const permissions = useSelector((s: RootState) => s.permissions.list);
  const SCREEN = 'Region';
  const canEdit = permissions.some((p) => p.screen === SCREEN && p.edit);
  const canAdd = permissions.some((p) => p.screen === SCREEN && p.add);

  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [regionText, setRegionText] = useState('');
  const [companyText, setCompanyText] = useState('');

  const [rows, setRows] = useState<RegionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const [isPincodeOpen, setIsPincodeOpen] = useState(false);
const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);


  // Fetch Regions
  const fetchRegions = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedRegions>(URLS.GET_REGION, {
        params: { page: currentPage, limit: PAGE_SIZE, region_name: regionText, company_name: companyText },
        signal: controller.signal,
      });
      setRows(res.data?.data ?? []);
      setTotal(Number(res.data?.total ?? 0));
    } catch (err: unknown) {
      setRows([]);
      setTotal(0);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [currentPage, regionText, companyText, router]);

  // Fetch Companies/Countries/States/Districts
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_COMPANIES);
      setCompanies(res.data?.data ?? []);
    } catch {
      setCompanies([]);
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_COUNTRIES);
      setCountries(res.data?.data ?? []);
    } catch {
      setCountries([]);
    }
  }, []);

  const fetchStates = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_STATES);
      setStates(res.data?.data ?? []);
    } catch {
      setStates([]);
    }
  }, []);

  const fetchDistricts = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_DISTRICTS);
      setDistricts(res.data?.data ?? []);
    } catch {
      setDistricts([]);
    }
  }, []);

  useEffect(() => {
    fetchRegions();
    fetchCompanies();
    fetchCountries();
    fetchStates();
    fetchDistricts();
  }, [fetchRegions, fetchCompanies, fetchCountries, fetchStates, fetchDistricts]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [regionText, companyText]);

  const onClearFilters = () => {
    setRegionText('');
    setCompanyText('');
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies.forEach((c) => (map[String(c.company_id)] = c.name));
    return map;
  }, [companies]);

  const countryMap = useMemo(() => {
    const map: Record<string, string> = {};
    countries.forEach((c) => (map[String(c.country_id)] = c.country_name));
    return map;
  }, [countries]);

  const stateMap = useMemo(() => {
    const map: Record<string, string> = {};
    states.forEach((s) => (map[String(s.state_id)] = s.state_name));
    return map;
  }, [states]);

  const districtMap = useMemo(() => {
    const map: Record<string, string> = {};
    districts.forEach((d) => (map[String(d.district_id)] = d.district_name));
    return map;
  }, [districts]);

  const ApiErrors = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;

    if (status === 404) {
      toast.error("Region not found. It may have already been deleted.");
    } else if (status === 403) {
      toast.error("You don't have permission to delete this Region.");
    } else if (status === 409) {
      toast.error("Region already exists. Please use a different name.");
    } else {
      toast.error("Failed to delete Region. Please try again.");
    }
  };



 

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Region Mapping</h1>
        {canAdd && (
          <Button
            onClick={() => router.push('/region/create')}
            style={{ backgroundColor: primaryColor, color: '#fff' }}
            className="rounded-3xl"
          >
            Create
          </Button>
        )}
      </div>

      <Card className="pt-0 gap-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Region Name"
              value={regionText}
              onChange={(e) => setRegionText(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Company"
              value={companyText}
              onChange={(e) => setCompanyText(e.target.value)}
            />
          </div>
          <div className="flex gap-4 justify-end">
            <Button className="rounded-full flex gap-2"      style={{ backgroundColor: primaryColor, color: '#fff' }}>
              <FilterIcon className="w-4 h-4" />
              Filter
            </Button>
            <Button variant="outline" className="rounded-full" onClick={onClearFilters}>
              Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto  pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Region</TableHead>
                <TableHead className="font-bold text-gray-800">Company</TableHead>
                <TableHead className="font-bold text-gray-800">Country</TableHead>
                <TableHead className="font-bold text-gray-800">State</TableHead>
                <TableHead className="font-bold text-gray-800">District</TableHead>
                <TableHead>Pincodes</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                    No results found
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((r, idx) => (
                  <TableRow key={r.region_id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <TableCell className="text-center">{(currentPage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                    <TableCell>{r.region_name}</TableCell>
                    <TableCell>
                      {r.company_id
                        ? companyMap[String(r.company_id)]
                        : r.company?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {r.country_id
                        ? countryMap[String(r.country_id)]
                        : r.country?.country_name || '-'}
                    </TableCell>
                    <TableCell>
                      {r.state_id
                        ? stateMap[String(r.state_id)]
                        : r.state?.state_name || '-'}
                    </TableCell>
                    <TableCell>
                      {r.district_id
                        ? districtMap[String(r.district_id)]
                        : r.district?.district_name || '-'}
                    </TableCell>
                    <TableCell>{r.pincodes?.join(', ') || '-'}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-sm ${
                          r.status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {r.status ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center flex justify-center gap-2">
                      <Button
        size="icon"
        variant="outline"
        className="rounded-full"
        style={{ borderColor: primaryColor, color: primaryColor }}
        onClick={() => {
          setSelectedPincodes(r.pincodes || []); // ✅ r must exist here
          setIsPincodeOpen(true);
        }}
      >
        <Eye className="w-4 h-4" />
      </Button>

                      {canEdit && (
                        
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-full"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                          onClick={() => router.push(`/region/edit/${r.region_id}`)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}


                      <Button
                        size="icon"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => {
                          setDeleteId(r.region_id);
                          setShowDeleteModal(true);
                        }}
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

 <SidePopupForm
  isOpen={isPincodeOpen}
  onClose={() => setIsPincodeOpen(false)}
  title="Pincodes"
  fields={[]}
  defaultValues={{ pincodes: selectedPincodes }}
/>


      {/* Delete Modal */}
      {showDeleteModal && deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Delete Region</h2>
            <p>Are you sure you want to delete this region? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await api.delete(URLS.DELETE_REGION.replace('{id}', String(deleteId)));
                    toast.success('Region deleted successfully!');
                    fetchRegions();
                  } catch (err) {
                    console.error('Delete failed', err);
                    ApiErrors(err);
                  } finally {
                    setShowDeleteModal(false);
                    setDeleteId(null);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
