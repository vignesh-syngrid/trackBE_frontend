// PincodesPage.tsx
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Pencil, X } from 'lucide-react';
import { CustomPagination } from '@/app/components/Pagination';
import { SidePopupForm, FormField } from './components/side-popup-form';

/* ===================================================
   📌 Types
=================================================== */
type PincodeRow = {
  pincode_id?: string;
  country_id: number;
  state_id: string;
  district_id: string;
  pincode: string;
  lat: number;
  lng: number;
};

type PaginatedPincode = {
  data: PincodeRow[];
  page: number;
  limit: number;
  total: number;
};

type CountryOpt = { value: number; label: string };
type StateOpt = { value: string; label: string; country_id: number };
type DistrictOpt = { value: string; label: string; state_id: string };

const PAGE_SIZE = 10;

/* ===================================================
   📌 Component
=================================================== */
export default function PincodesPage() {
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor);
  const permissions = useSelector((s: RootState) => s.permissions.list);

  // const SCREEN = 'Pincode';
  // const canView = permissions.some((p) => p.screen === SCREEN && p.view);
  // const canEdit = permissions.some((p) => p.screen === SCREEN && p.edit);
  // const canAdd = permissions.some((p) => p.screen === SCREEN && p.add);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [searchText, setSearchText] = useState<string>('');
  const [rows, setRows] = useState<PincodeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [countries, setCountries] = useState<CountryOpt[]>([]);
  const [states, setStates] = useState<StateOpt[]>([]);
  const [districts, setDistricts] = useState<DistrictOpt[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<PincodeRow | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  /* ===================================================
     📌 Build API Params
  ==================================================== */
  const buildServerParams = useCallback(() => ({
    page: currentPage,
    limit: PAGE_SIZE,
  }), [currentPage]);

  /* ===================================================
     📌 Fetch Countries / States / Districts
  ==================================================== */
  const fetchCountries = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_COUNTRIES);
      const list = res.data?.data ?? [];
      setCountries(list.map((c: any) => ({ value: c.country_id, label: c.country_name })));
    } catch (err) {
      console.error('Error fetching countries', err);
    }
  }, []);

  const fetchStates = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_STATES);
      const list = res.data?.data ?? [];
      setStates(list.map((s: any) => ({
        value: s.state_id,
        label: s.state_name,
        country_id: s.country_id, // include country_id for TS
      })));
    } catch (err) {
      console.error('Error fetching states', err);
    }
  }, []);

  const fetchDistricts = useCallback(async () => {
    try {
      const res = await api.get(URLS.GET_DISTRICTS);
      const list = res.data?.data ?? [];
      setDistricts(list.map((d: any) => ({
        value: d.district_id,
        label: d.district_name,
        state_id: d.state_id, // include state_id for TS
      })));
    } catch (err) {
      console.error('Error fetching districts', err);
    }
  }, []);

  /* ===================================================
     📌 Fetch Pincodes
  ==================================================== */
  const fetchPincodes = useCallback(async () => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PaginatedPincode>(URLS.GET_PINCODES, {
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
    fetchDistricts();
    fetchPincodes();
  }, [fetchCountries, fetchStates, fetchDistricts, fetchPincodes]);

  /* ===================================================
     📌 Filtering
  ==================================================== */
  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    return rows.filter((r) => !text || r.pincode.toString().toLowerCase().includes(text));
  }, [rows, searchText]);

  const onApplyFilters = () => {
    setCurrentPage(1);
    setTimeout(fetchCountries, 0);
  };
  const onClearFilters = () => {
    setSearchText('');


    setCurrentPage(1);
    setTimeout(fetchCountries, 0);
  };


   const ApiErrors = (err: any) => {
      const status = err?.response?.status;
    
      if (status === 404) {
        toast.error("Pincode not found. It may have already been deleted.");
      } else if (status === 403) {
        toast.error("You don't have permission to delete this Pincode.");
      } else if (status === 409) {
          toast.error("Pincode already exists. Please use a different name.");
      } else {
        toast.error("Failed to delete Pincode. Please try again.");
      }
    };
  
  
  

  /* ===================================================
     📌 Form Submit
  ==================================================== */
  const handleFormSubmit = async (data: Record<string, any>) => {
    const payload = {
      country_id: Number(data.country_id),
      state_id: data.state_id,
      district_id: data.district_id,
      pincode: data.pincode,
      lat: Number(data.lat),
      lng: Number(data.lng),
    };
    try {
      if (editData) {
        await api.put(`${URLS.GET_PINCODES}/${editData.pincode_id}`, payload);
      } else {
        await api.post(URLS.GET_PINCODES, payload);
      }
      setIsOpen(false);
      setEditData(null);
      fetchPincodes();
      toast.success(`Pincode ${editData ? 'updated' : 'created'} successfully.`);
    } catch (err) {
      console.error('Error saving pincode', err);
      ApiErrors(err);
    }
  };
 
  /* ===================================================
     📌 Table Actions
  ==================================================== */
  const PincodeActions = (p: PincodeRow) => (
    <div className="flex gap-2 justify-center">
      <Button
        size="icon"
        variant="outline"
        className="rounded-full"
        style={{ borderColor: primaryColor, color: primaryColor }}
        onClick={() => { setEditData(p); setIsOpen(true); }}
      >
        <Pencil className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="rounded-full"
        style={{ borderColor: 'red', color: 'red' }}
        onClick={() => { setDeleteId(String(p.pincode_id ?? p.pincode)); setIsDeleteOpen(true); }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  /* ===================================================
     📌 Form Fields
  ==================================================== */
  const pincodeFields: FormField[] = [
    { key: "country_id", label: "Country", type: "select", required: true },
    { key: "state_id", label: "State", type: "select", required: true },
    { key: "district_id", label: "District", type: "select", required: true },
    { key: "pincode", label: "Pincode", type: "text", required: true },
    { key: "lat", label: "Latitude", type: "text" },
    { key: "lng", label: "Longitude", type: "text" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ===================================================
     📌 Render
  ==================================================== */
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Pincodes</h1>
        {(
          <Button
            onClick={() => { setIsOpen(true); setEditData(null); }}
            style={{ backgroundColor: primaryColor, color: '#fff' }}
            className="rounded-3xl"
          >
            Create
          </Button>
        )}
      </div>

      <Card className="pt-0 gap-0">
        <div className="flex flex-wrap gap-2 bg-[#f9fafb] items-center p-4 rounded-t-xl justify-end">
          <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <Search size={18} />
            <Input
              className="h-8 w-44 border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search pincode"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>


          {/* Filter / Clear Buttons */}
          <div className="flex gap-4 justify-end">
            <Button onClick={onApplyFilters} className="rounded-full flex gap-2"   style={{ backgroundColor: primaryColor, color: '#fff' }}>
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

        <div className="hidden md:block w-full overflow-x-auto  pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold text-gray-800 text-center">S.No</TableHead>
                <TableHead className="font-bold text-gray-800">Country</TableHead>
                <TableHead className="font-bold text-gray-800">State</TableHead>
                <TableHead className="font-bold text-gray-800">District</TableHead>
                <TableHead className="font-bold text-gray-800">Pincode</TableHead>
                <TableHead className="font-bold text-gray-800">Lat</TableHead>
                <TableHead className="font-bold text-gray-800">Lng</TableHead>
                <TableHead className="font-bold text-gray-800 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                    No results found
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((p, i) => {
                const country = countries.find(c => c.value === p.country_id)?.label || '-';
                const state = states.find(s => s.value === p.state_id)?.label || '-';
                const district = districts.find(d => d.value === p.district_id)?.label || '-';
                return (
                  <TableRow key={p.pincode_id ?? i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <TableCell className="text-center ">{(currentPage - 1) * PAGE_SIZE + (i + 1)}</TableCell>
                    <TableCell>{country}</TableCell>
                    <TableCell>{state}</TableCell>
                    <TableCell>{district}</TableCell>
                    <TableCell>{p.pincode}</TableCell>
                    <TableCell>{p.lat}</TableCell>
                    <TableCell>{p.lng}</TableCell>
                    <TableCell className="text-center">{PincodeActions(p)}</TableCell>
                  </TableRow>
                );
              })}

            </TableBody>
          </Table>
        </div>

        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>

      <SidePopupForm
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setEditData(null); }}
        title={editData ? 'Edit Pincode' : 'Add New Pincode'}
        fields={pincodeFields}
        defaultValues={editData ? {
          country_id: editData.country_id,
          state_id: editData.state_id,
          district_id: editData.district_id,
          pincode: editData.pincode,
          lat: editData.lat,
          lng: editData.lng,
        } : { lat: '', lng: '' }}
        onSubmit={handleFormSubmit}
        countries={countries.map(c => ({ country_id: c.value, country_name: c.label }))}
        states={states.map(s => ({ state_id: s.value, state_name: s.label, country_id: s.country_id }))}
        districts={districts.map(d => ({ district_id: d.value, district_name: d.label, state_id: d.state_id }))}
      />

      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800">Delete Pincode</h2>
            <p className="text-gray-600">Are you sure you want to delete this pincode?</p>
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
                  const id = String(deleteId);
                  try {
                    await api.delete(`${URLS.GET_PINCODES}/${encodeURIComponent(id)}`);
                    await fetchPincodes();
                    toast.success('Pincode deleted successfully.');
                  } catch (err) {
                    console.error('Error deleting pincode', err);
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
