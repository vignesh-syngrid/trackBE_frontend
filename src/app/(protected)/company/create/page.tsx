'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { toast } from 'sonner';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';

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
import { Eye, EyeOff } from "lucide-react";

// ---------- Types ----------
type CountryRow = { country_id: string | number; country_name: string };
type StateRow = { state_id: string | number; state_name: string };
type DistrictRow = { district_id: string; district_name: string };
type PinCodeRow = { id: string; pincode: string; lat: string; lng: string };
type SubscriptionRow = {
  subscription_id: string;
  subscription_title: string;
  subscription_status: boolean;
};

// ---------- Component ----------
export default function CreateCompanyPage() {
  const router = useRouter();
  const primaryColor =
    useSelector((s: RootState) => s.ui.primaryColor) || '#4F46E5';

  // ---------- State ----------
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [pinCodes, setPinCodes] = useState<PinCodeRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  // refs for hidden file inputs
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [formData, setFormData] = useState({
    logo: '',
    name: '',
    gst: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address_1: '',
    country_id: '',
    state_id: '',
    district_id: '',
    postal_code: '',
    pincode: '',
    city: '',
    lat: '',
    lng: '',
    theme_color: '#4F46E5',
    proof: '',
    subscription_id: '',
    no_of_users: '',
    subscription_amountPerUser: '',
    subscription_startDate: '',
    subscription_endDate: '',
    remarks: '',
    status: true,
  });

  // ---------- Load reference data ----------
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [countriesRes, subsRes] = await Promise.all([
          api.get(URLS.GET_COUNTRIES),
          api.get(URLS.GET_SUBSCRIPTION_TYPES),
        ]);
        setCountries(countriesRes.data?.data ?? []);
        setSubscriptions(subsRes.data?.data ?? []);
      } catch (err: unknown) {
        console.error('Failed to load reference data', err);
        setCountries([]);
        setSubscriptions([]);
      }
    };
    loadRefs();
  }, []);

  // ---------- Helpers ----------
  const setField = (k: string, v: any) =>
    setFormData((prev) => ({ ...prev, [k]: v === null || v === undefined ? '' : v }));

  const handlePasswordChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'confirmPassword') {
      setPasswordError(value !== formData.password ? 'Passwords do not match' : '');
    }
  };

  // ---------- Cascading Dropdown Handlers ----------
  const handleCountryChange = async (countryId: string) => {
    setField('country_id', countryId);
    setField('state_id', '');
    setField('district_id', '');
    setField('pincode', '');
    setField('lat', '');
    setField('lng', '');
    try {
      const res = await api.get(`${URLS.GET_STATES}?country_id=${countryId}`);
      setStates(res.data?.data ?? []);
      setDistricts([]);
      setPinCodes([]);
    } catch {
      setStates([]);
    }
  };

  const handleStateChange = async (stateId: string) => {
    setField('state_id', stateId);
    setField('district_id', '');
    setField('pincode', '');
    setField('lat', '');
    setField('lng', '');
    try {
      const res = await api.get(`${URLS.GET_DISTRICTS}?state_id=${stateId}`);
      setDistricts(res.data?.data ?? []);
      setPinCodes([]);
    } catch {
      setDistricts([]);
    }
  };

  const handleDistrictChange = async (districtId: string) => {
    setField('district_id', districtId);
    setField('pincode', '');
    setField('lat', '');
    setField('lng', '');
    try {
      const districtParam = resolveDistrictId(districtId, districts);
      const res = await api.get(`${URLS.GET_PINCODES}?district_id=${districtParam}`);
      setPinCodes(res.data?.data ?? []);
    } catch {
      setPinCodes([]);
    }
  };

  const handlePostalCodeChange = (postalCode: string) => {
    setField('pincode', postalCode);
    const selected = pinCodes.find((p) => p.pincode === postalCode);
    if (selected) {
      setField('lat', selected.lat);
      setField('lng', selected.lng);
    }
  };

  // resolve district id helper: prefers UUID, falls back to lookup by name
  const resolveDistrictId = (val: any, list: any[]) => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const s = String(val ?? '');
    if (!s) return '';
    if (uuidRegex.test(s)) return s;
    const found = list.find((d: any) => String(d.district_id) === s || String(d.district_name) === s);
    return found ? String(found.district_id) : s;
  };

  // ---------- Save Handler ----------
  const handleSave = async () => {
  if (!formData.name) return alert('Company name is required.');
  if (!formData.email) return alert('Email is required.');
  if (!formData.phone) return alert('Phone is required.');
  if (!formData.password) return alert('Password is required.');
  if (formData.password !== formData.confirmPassword)
    return alert('Passwords do not match.');

  try {
    const form = new FormData();

    Object.entries(formData).forEach(([k, v]) => {
      if (k === 'logo' || k === 'proof' || k === 'confirmPassword') return;
      if (v === '' || v === null || v === undefined) return;

      // numeric or boolean fields -> string
      if (['no_of_users', 'subscription_amountPerUser', 'lat', 'lng', 'status'].includes(k)) {
        form.append(k, String(v));
        return;
      }

      if (k === 'district_id') {
        const selectedDistrict = districts.find((d) => String(d.district_id) === String(v));
        if (selectedDistrict) form.append('city', String(selectedDistrict.district_name));
        form.append('district_id', String(v));
        return;
      }

      if (k === 'pincode') {
        form.append('postal_code', String(v));
        return;
      }

      form.append(k, String(v));
    });

    if (logoFile) form.append('logo', logoFile);
    else if (formData.logo) form.append('logo', String(formData.logo));

    if (proofFile) form.append('proof', proofFile);
    else if ((formData as any).proof) form.append('proof', String((formData as any).proof));

    await api.post(URLS.CREATE_COMPANY, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    toast.success('Company created successfully!');
    router.push('/company');
  } catch (err: unknown) {
    console.error(err);
    const errorMsg = (err as any)?.response?.data?.error ?? (err as any)?.message ?? 'Failed to create company.';
    toast.error(String(errorMsg));
  }
};



  // ---------- Render ----------
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Company</h1>

      <Card className="p-6 space-y-8">
        {/* Logo Upload */}
        <div>
          <Label className="mb-2 block pb-3">Company Logo</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex justify-start " style={{
             
              padding: "20px",
            
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              alignItems: "center",
            }}>
              {logoFile ? (
                <img
                  src={URL.createObjectURL(logoFile)}
                  alt="Logo Preview"
                  className="w-32 h-32 object-contain border rounded-lg"
                />
              ) : formData.logo ? (
                <img
                  src={formData.logo}
                  alt="Logo Preview"
                  className="w-32 h-32 object-contain border rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-gray-400 border border-dashed rounded-lg">
                  No Logo
                </div>
              )}
            
              {/* hidden native file input triggered by clicking area or button */}
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              <div className="ml-4">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                  className="px-3 py-1 border rounded"
                  style={{ backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }}
                >
                  Upload Logo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <h2 className="text-lg font-semibold">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className='pb-3'>Company Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </div>
          <div>
            <Label className='pb-3'>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </div>
          <div>
            <Label className='pb-3'>GST Number</Label>
            <Input
              value={formData.gst}
              onChange={(e) => setField('gst', e.target.value)}
            />
          </div>
          <div>
            <Label className='pb-3'>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </div>
        
          <div className="md:col-span-2">
            <Label className='pb-3'>Address</Label>
            <Input
              value={formData.address_1}
              onChange={(e) => setField('address_1', e.target.value)}
            />
          </div>
         <div>
          <Label className='pb-3'>Country</Label>
          <Select
            value={formData.country_id}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.country_id} value={String(c.country_id)}>
                  {c.country_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* State */}
        <div>
          <Label className='pb-3'>State</Label>
          <Select
            value={formData.state_id}
            onValueChange={handleStateChange}
            disabled={!formData.country_id}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.state_id} value={String(s.state_id)}>
                  {s.state_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* District */}
        <div>
          <Label className='pb-3'>District / City</Label>
          <Select
            value={formData.district_id}
            onValueChange={handleDistrictChange}
            disabled={!formData.state_id}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d.district_id} value={d.district_id}>
                  {d.district_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Postal Code */}
        <div>
          <Label className='pb-3'>Postal Code</Label>
          <Select
            value={formData.pincode}
            onValueChange={handlePostalCodeChange}
            disabled={!formData.district_id}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Postal Code" />
            </SelectTrigger>
            <SelectContent>
              {pinCodes.map((p) => (
                <SelectItem key={p.id} value={p.pincode}>
                  {p.pincode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>



        {/* Latitude & Longitude (Disabled) */}
      
          <div>
            <Label className='pb-3'>Latitude</Label>
            <Input value={formData.lat} disabled id="latitude" />
          </div>
          <div>
            <Label className='pb-3'>Longitude</Label>
            <Input value={formData.lng} disabled id="longitude" />
          </div>
       
           
         
        
        
          
         <div>
  <Label className='pb-3'>Password</Label>
  <div className="relative">
    <Input
      type={showPassword ? "text" : "password"}
      value={formData.password}
      onChange={(e) => handlePasswordChange("password", e.target.value)}
      className="pr-10"
    />
    <button
      type="button"
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
      onClick={() => setShowPassword((p) => !p)}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</div>

<div>
  <Label className='pb-3'>Confirm Password</Label>
  <div className="relative">
    <Input
      type={showConfirmPassword ? "text" : "password"}
      value={formData.confirmPassword}
      onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
      className="pr-10"
    />
    <button
      type="button"
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
      onClick={() => setShowConfirmPassword((p) => !p)}
    >
      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
  {passwordError && (
    <p className="text-sm text-red-600 mt-1">{passwordError}</p>
  )}
</div>

        </div>

        {/* Proof Upload */}
        <div>
          <Label className="mb-2 block pb-3">Company Proof (Document)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Preview */}
            <div className="flex justify-center">
              {proofFile ? (
                proofFile.type.includes('image') ? (
                  <img
                    src={URL.createObjectURL(proofFile)}
                    alt="Proof Preview"
                    className="w-32 h-32 object-contain border rounded-lg"
                  />
                ) : (
                  <a
                    href={URL.createObjectURL(proofFile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View PDF
                  </a>
                )
              ) : (typeof formData.proof === 'string' && formData.proof) ? (
                (formData.proof as string).endsWith('.pdf') ? (
                  <a
                    href={formData.proof as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View PDF
                  </a>
                ) : (
                  <img
                    src={formData.proof as string}
                    alt="Proof Preview"
                    className="w-32 h-32 object-contain border rounded-lg"
                  />
                )
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-gray-400 border border-dashed rounded-lg">
                  No Proof
                </div>
              )}
            </div>
            {/* Upload */}
            <div>
              <input ref={proofInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
              <div>
                <button
                  type="button"
                  onClick={() => proofInputRef.current?.click()}
                  className="px-3 py-1 border rounded"
                  style={{ backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }}
                >
                  Upload Proof
                </button>
              </div>
               {proofFile && (
                 <p className="mt-2 text-sm text-gray-600">
                   Selected: {proofFile.name}
                 </p>
               )}
             </div>
          </div>
        </div>

        {/* Theme */}
        <h2 className="text-lg font-semibold">Company Theme</h2>
        <div className="flex items-center gap-3">
          <Label className='pb-3'>Theme Color</Label>
          <Input
            type="color"
            className="w-16 h-10 p-1"
            value={formData.theme_color}
            onChange={(e) => setField('theme_color', e.target.value)}
          />
          <span className="text-sm text-gray-600">{formData.theme_color}</span>
        </div>

        {/* Subscription */}
        <h2 className="text-lg font-semibold">Subscription</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className='pb-3'>Subscription Plan</Label>
            <Select
              value={formData.subscription_id}
              onValueChange={(v) => setField('subscription_id', v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Subscription" />
              </SelectTrigger>
              <SelectContent>
                {subscriptions.map((s) => (
                  <SelectItem key={s.subscription_id} value={s.subscription_id}>
                    {s.subscription_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className='pb-3'>No. of Users</Label>
            <Input
              type="number"
              value={formData.no_of_users}
              onChange={(e) => setField('no_of_users', e.target.value)}
            />
          </div>

          <div>
            <Label className='pb-3'>Amount per User</Label>
            <Input
              type="number"
              value={formData.subscription_amountPerUser}
              onChange={(e) =>
                setField('subscription_amountPerUser', e.target.value)
              }
            />
          </div>

          <div>
            <Label className='pb-3'>From</Label>
            <Input
              type="date"
              value={formData.subscription_startDate}
              onChange={(e) =>
                setField('subscription_startDate', e.target.value)
              }
            />
          </div>

          <div>
            <Label>To</Label>
            <Input
              type="date"
              value={formData.subscription_endDate}
              onChange={(e) =>
                setField('subscription_endDate', e.target.value)
              }
            />
          </div>

          <div className="md:col-span-2">
            <Label className='pb-3'>Remarks</Label>
            <Input
              value={formData.remarks}
              onChange={(e) => setField('remarks', e.target.value)}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setField('status', !formData.status)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.status ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.status ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium">
            {formData.status ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Actions */}
         <div className="flex justify-end gap-4">
          <Button variant="destructive" onClick={() => router.push('/company')}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            style={{ backgroundColor: formData.theme_color, color: '#fff' }}
          >
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}