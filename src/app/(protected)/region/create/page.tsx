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
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
type RegionForm = {
  region_name: string;
  company_id: string;
  country_id: string;
  state_id: string;
  district_id: string;
  active: boolean;
};

export default function CreateRegionPage() {
  const primaryColor = useSelector((state: RootState) => state.ui.primaryColor);
  const router = useRouter();

  const [companies, setCompanies] = useState<{ company_id: number; name: string }[]>([]);
  const [countries, setCountries] = useState<{ country_id: number; country_name: string }[]>([]);
  const [states, setStates] = useState<{ state_id: number; state_name: string }[]>([]);
  const [allDistricts, setAllDistricts] = useState<{ district_id: number; district_name: string; state_id: number }[]>([]);
  const [districts, setDistricts] = useState<{ district_id: number; district_name: string }[]>([]);
  const [allPincodes, setAllPincodes] = useState<{ pincode: string; district_id: number; assigned: boolean }[]>([]);
  const [availablePincodes, setAvailablePincodes] = useState<string[]>([]);
  const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [formData, setFormData] = useState<RegionForm>({
    region_name: '',
    company_id: '',
    country_id: '',
    state_id: '',
    district_id: '',
    active: true,
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
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
          (pincodesRes.data?.data ?? []).map((p: any) => {
            const rawAssigned = p?.assigned;
            const assigned =
              rawAssigned === true || rawAssigned === 'true' || rawAssigned === 1 || rawAssigned === '1';
            return {
              pincode: p.pincode,
              district_id: p.district_id,
              assigned: Boolean(assigned),
            };
          })
        );
      } catch (err) {
        console.error('Error fetching data', err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (field: keyof RegionForm, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value as any }));

    if (field === 'state_id') {
      const filteredDistricts = allDistricts
        .filter((d) => String(d.state_id) === String(value))
        .map((d) => ({ district_id: d.district_id, district_name: d.district_name }));
      setDistricts(filteredDistricts);
      setFormData((prev) => ({ ...prev, district_id: '' }));
      setAvailablePincodes([]);
      setSelectedPincodes([]);
    }

    if (field === 'district_id') {
      const filteredPincodes = allPincodes
        .filter((p) => String(p.district_id) === String(value) && !Boolean(p.assigned))
        .map((p) => p.pincode);

      setAvailablePincodes(filteredPincodes);
      setSelectedPincodes([]);
    }
  };

  const toggleField = (key: keyof RegionForm) => {
    setFormData((prev) => ({ ...prev, [key]: !(prev[key] as boolean) }));
  };

  const togglePincode = (pin: string) => {
    if (selectedPincodes.includes(pin)) {
      // Remove from selected, add back to available
      setSelectedPincodes((prev) => prev.filter((p) => p !== pin));
      setAvailablePincodes((prev) => [...prev, pin]);
    } else {
      // Add to selected, remove from available
      setSelectedPincodes((prev) => [...prev, pin]);
      setAvailablePincodes((prev) => prev.filter((p) => p !== pin));
    }
  };

  const selectAllPincodes = () => {
    if (selectedPincodes.length === availablePincodes.length) {
      // Deselect all
      setAvailablePincodes((prev) => [...prev, ...selectedPincodes]);
      setSelectedPincodes([]);
    } else {
      // Select all
      setSelectedPincodes((prev) => [...prev, ...availablePincodes]);
      setAvailablePincodes([]);
    }
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData, pincodes: selectedPincodes };
      await api.post(URLS.CREATE_REGION, payload);
      toast.success('Region created successfully!');
      router.push('/region');
    } catch (err) {
      console.error(err);
      ApiErrors(err);
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
      } else if (status === 400) {
          toast.error("Pincodes already mapped to a region).");
      } else {
        toast.error("Failed to delete Region. Please try again.");
      }
    };
  
  
  

  useEffect(() => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setIsSuperAdmin(parsed?.role?.slug === "super_admin");

      // if not super admin, set company_id in formData automatically
      if (parsed?.company_id) {
        setFormData((prev) => ({ ...prev, company_id: parsed.company_id.toString() }));
      }
    }
  }
}, []);


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Region</h1>

      <Card className="p-6">
        {/* 2 fields per row */}
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
         <div>
  <Label className="p-2">Company</Label>
  {isSuperAdmin ? (
    <Select
      value={formData.company_id}
      onValueChange={(val) => handleChange("company_id", val)}
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
    <Input
      value={companies.find((c) => c.company_id.toString() === formData.company_id)?.name || ""}
      disabled
      readOnly
    />
  )}
</div>
          {/* Country */}
          <div>
            <Label className="p-2">Country</Label>
            <Select onValueChange={(val) => handleChange('country_id', val)}>
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
            <Select onValueChange={(val) => handleChange('state_id', val)}>
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
            <Select onValueChange={(val) => handleChange('district_id', val)}>
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

          {/* Active / Inactive */}
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
              {selectedPincodes.length === availablePincodes.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="flex gap-4">
            {/* Available Pincodes */}
            <div className="flex-1">
              <Label className="p-2">Available Pincodes</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 border p-2 rounded min-h-auto bg-white">
                {availablePincodes.map((pin) => (
                  <button
                    key={pin}
                    type="button"
                    onClick={() => togglePincode(pin)}
                    className="border rounded p-2 text-sm bg-gray-100 text-gray-800 hover:bg-gray-200"
                  >
                    {pin}
                  </button>
                ))}
                {availablePincodes.length === 0 && (
                  <p className="col-span-full text-center text-gray-400">
                    No available pincodes
                  </p>
                )}
              </div>
            </div>

            {/* Selected Pincodes */}
            <div className="flex-1">
              <Label className="p-2">Selected Pincodes</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 border p-2 rounded min-h-auto bg-white">
                {selectedPincodes.map((pin) => (
                  <button
                    key={pin}
                    type="button"
                    onClick={() => togglePincode(pin)}
                    className="border rounded p-2 text-sm bg-green-500 text-white hover:bg-green-600"
                  >
                    {pin}
                  </button>
                ))}
                {selectedPincodes.length === 0 && (
                  <p className="col-span-full text-center text-gray-400">
                    No selected pincodes
                  </p>
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
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
