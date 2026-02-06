'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

interface RegionForm {
  region_name: string;
  company_id: string;
  country_id: string;
  state_id: string;
  district_id: string;
  active: boolean;
}

export default function RegionEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.regionId as string | undefined;

  const primaryColor = useSelector((state: RootState) => state.ui.primaryColor);

  const [companies, setCompanies] = useState<{ company_id: number; name: string }[]>([]);
  const [countries, setCountries] = useState<{ country_id: number; country_name: string }[]>([]);
  const [states, setStates] = useState<{ state_id: number; state_name: string }[]>([]);
  const [allDistricts, setAllDistricts] = useState<{ district_id: number; district_name: string; state_id: number }[]>([]);
  const [districts, setDistricts] = useState<{ district_id: number; district_name: string }[]>([]);
  const [allPincodes, setAllPincodes] = useState<{ pincode: string; district_id: number; assigned: boolean }[]>([]);
  const [availablePincodes, setAvailablePincodes] = useState<string[]>([]);
  const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
  const [commonLoaded, setCommonLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // loader state

  const [formData, setFormData] = useState<RegionForm>({
    region_name: '',
    company_id: '',
    country_id: '',
    state_id: '',
    district_id: '',
    active: true,
  });

  // Get user info from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setIsSuperAdmin(parsed?.role?.slug === "super_admin");

        if (parsed?.company_id) {
          setFormData((prev) => ({ ...prev, company_id: parsed.company_id.toString() }));
        }
      }
    }
  }, []);

  // Fetch common data
  useEffect(() => {
    const fetchCommon = async () => {
      try {
        setLoading(true);
        const [companiesRes, countriesRes, statesRes, districtsRes, pincodesRes] = await Promise.all([
          api.get(URLS.GET_COMPANIES),
          api.get(URLS.GET_COUNTRIES),
          api.get(URLS.GET_STATES),
          api.get(URLS.GET_DISTRICTS),
          api.get(URLS.GET_PINCODES),
        ]);

        setCompanies(companiesRes.data?.data ?? []);
        setCountries(countriesRes.data?.data ?? []);
        setStates(statesRes.data?.data ?? []);
        setAllDistricts(districtsRes.data?.data ?? []);
        setAllPincodes(
          pincodesRes.data?.data?.map((p: any) => ({
            pincode: p.pincode,
            district_id: p.district_id,
            assigned: p.assigned || false,
          })) ?? []
        );
        setCommonLoaded(true);
      } catch (err) {
        console.error('Error fetching common data:', err);
        toast.error('Failed to load common data.');
      } finally {
        setLoading(false);
      }
    };
    fetchCommon();
  }, []);

  // Fetch region for edit
  useEffect(() => {
    if (!id || !commonLoaded) return;

    const fetchRegion = async () => {
      try {
        setLoading(true);
        const res = await api.get(URLS.GET_REGION_BY_ID.replace('{id}', id));
        const data = res.data?.data ?? res.data;

        if (data) {
          setFormData({
            region_name: data.region_name || '',
            company_id: String(data.company_id || ''),
            country_id: String(data.country_id || ''),
            state_id: String(data.state_id || ''),
            district_id: String(data.district_id || ''),
            active: data.status ?? true,
          });
          setSelectedPincodes(data.pincodes || []);
        }
      } catch (err) {
        console.error('Error fetching region:', err);
        toast.error('Failed to load region data.');
      } finally {
        setLoading(false);
      }
    };

    fetchRegion();
  }, [id, commonLoaded]);

  // Update districts when state changes
  useEffect(() => {
    if (!formData.state_id) {
      setDistricts([]);
      setFormData((prev) => ({ ...prev, district_id: '' }));
      setAvailablePincodes([]);
      setSelectedPincodes([]);
      return;
    }
    const filteredDistricts = allDistricts
      .filter((d) => d.state_id.toString() === String(formData.state_id))
      .map((d) => ({ district_id: d.district_id, district_name: d.district_name }));
    setDistricts(filteredDistricts);

    if (!filteredDistricts.some((d) => d.district_id.toString() === formData.district_id)) {
      setFormData((prev) => ({ ...prev, district_id: '' }));
      setAvailablePincodes([]);
      setSelectedPincodes([]);
    }
  }, [formData.state_id, allDistricts]);

  // Update available pincodes when district or selected changes
  useEffect(() => {
    if (!formData.district_id) {
      setAvailablePincodes([]);
      return;
    }

    const districtPins = allPincodes
      .filter((p) => p.district_id.toString() === String(formData.district_id))
      .map((p) => p.pincode);

    setAvailablePincodes(districtPins.filter((pin) => !selectedPincodes.includes(pin)));
  }, [formData.district_id, allPincodes, selectedPincodes]);

  const handleChange = (field: keyof RegionForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleField = (key: keyof RegionForm) => {
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePincode = (pin: string) => {
    if (selectedPincodes.includes(pin)) {
      setSelectedPincodes((prev) => prev.filter((p) => p !== pin));
      setAvailablePincodes((prev) => [...prev, pin]);
    } else {
      setSelectedPincodes((prev) => [...prev, pin]);
      setAvailablePincodes((prev) => prev.filter((p) => p !== pin));
    }
  };

  const selectAllPincodes = () => {
    if (availablePincodes.length > 0) {
      setSelectedPincodes((prev) => [...prev, ...availablePincodes]);
      setAvailablePincodes([]);
    } else {
      setAvailablePincodes((prev) => [...prev, ...selectedPincodes]);
      setSelectedPincodes([]);
    }
  };

   const ApiErrors = (err: any) => {
      const status = err?.response?.status;
    
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
  
  
  

  const handleSave = async () => {
    try {
      const payload = { ...formData, pincodes: selectedPincodes };
      if (id) {
        await api.put(URLS.UPDATE_REGION.replace('{id}', id), payload);
        toast.success('Region updated successfully!');
      } else {
        await api.post(URLS.CREATE_REGION, payload);
        toast.success('Region created successfully!');
      }
      router.push('/region');
    } catch (err: any) {
      console.error('Save error:', err.response?.data || err.message);
      ApiErrors(err);
    }
  };

  // Show loader if data is still loading
 if (loading) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-2">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
        <span className="text-gray-500 text-lg">Loading...</span>
      </div>
    </div>
  );
}


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{id ? 'Edit Region' : 'Create Region'}</h1>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Region Name */}
          <div>
            <Label className="p-2">Region Name</Label>
            <Input
              value={formData.region_name}
              onChange={(e) => handleChange('region_name', e.target.value)}
              placeholder="Enter region name"
            />
          </div>

          {/* Company */}
         {/* Company */}
<div>
  <Label className="p-2">Company</Label>
  {isSuperAdmin ? (
    <Select
      onValueChange={(val) => handleChange('company_id', val)}
      value={formData.company_id}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select Company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.company_id} value={c.company_id.toString()}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (
    <div className="p-2 border rounded bg-gray-100 text-gray-700">
      {companies.find((c) => String(c.company_id) === formData.company_id)?.name || 'N/A'}
    </div>
  )}
</div>

          {/* Country */}
          <div>
            <Label className="p-2">Country</Label>
            <Select onValueChange={(val) => handleChange('country_id', val)} value={formData.country_id}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.country_id} value={c.country_id.toString()}>
                    {c.country_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div>
            <Label className="p-2">State</Label>
            <Select onValueChange={(val) => handleChange('state_id', val)} value={formData.state_id}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.state_id} value={s.state_id.toString()}>
                    {s.state_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          <div>
            <Label className="p-2">District</Label>
            <Select onValueChange={(val) => handleChange('district_id', val)} value={formData.district_id}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d.district_id} value={d.district_id.toString()}>
                    {d.district_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => toggleField('active')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.active ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium">
              {formData.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Pincode Section */}
        <div className="mt-6 border p-4 rounded-lg bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <Button variant="outline" size="sm" onClick={selectAllPincodes}>
              {availablePincodes.length > 0 ? 'Select All' : 'Deselect All'}
            </Button>
          </div>
          <div className="flex gap-4">
            {/* Available */}
            <div className="flex-1">
              <Label className="p-2">Available Pincodes</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 border p-2 rounded bg-white">
                {availablePincodes.map((pin) => (
                  <button
                    key={pin}
                    type="button"
                    onClick={() => togglePincode(pin)}
                    className="border rounded p-2 text-sm bg-gray-100 text-gray-800"
                  >
                    {pin}
                  </button>
                ))}
                {availablePincodes.length === 0 && (
                  <p className="col-span-full text-center text-gray-400">No available pincodes</p>
                )}
              </div>
            </div>

            {/* Selected */}
            <div className="flex-1">
              <Label className="p-2">Selected Pincodes</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 border p-2 rounded bg-white">
                {selectedPincodes.map((pin) => (
                  <button
                    key={pin}
                    type="button"
                    onClick={() => togglePincode(pin)}
                    className="border rounded p-2 text-sm bg-green-500 text-white"
                  >
                    {pin}
                  </button>
                ))}
                {selectedPincodes.length === 0 && (
                  <p className="col-span-full text-center text-gray-400">No selected pincodes</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="destructive" onClick={() => router.push('/region')}>
            Cancel
          </Button>
          <Button style={{ backgroundColor: primaryColor, color: '#fff' }} onClick={handleSave}>
            {id ? 'Update' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
