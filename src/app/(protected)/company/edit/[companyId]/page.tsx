'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';

export default function CompanyFormPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.companyId as string | undefined;
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) || '#4F46E5';

  const [countries, setCountries] = useState<any[]>([]);
  const [allStates, setAllStates] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [postals, setPostals] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  // refs for hidden file inputs
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [formData, setFormData] = useState<any>({
    logo: '',
    proof: '',
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
    city: '',
    lat: '',
    lng: '',
    subscription_id: '',
    no_of_users: '',
    subscription_startDate: '',
    subscription_endDate: '',
    subscription_amountPerUser: '',
    remarks: '',
    theme_color: primaryColor,
    status: true,
  });

  const setField = (k: string, v: any) =>
    setFormData((prev: any) => ({ ...prev, [k]: v }));

  const handlePasswordChange = (field: string, value: string) => {
    setField(field, value);
    if (field === 'confirmPassword') {
      setPasswordError(value !== formData.password ? 'Passwords do not match' : '');
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    const filePath = path.replace(/^\/+/, '');
    return `${baseUrl}/${filePath}`;
  };

  const safeValue = (val: any) => (val === null || val === undefined ? '' : val);

  // Load references: countries, states, subscriptions
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [countriesRes, statesRes, subsRes] = await Promise.all([
          api.get(URLS.GET_COUNTRIES),
          api.get(URLS.GET_STATES),
          api.get(URLS.GET_SUBSCRIPTION_TYPES),
        ]);
        setCountries(countriesRes.data?.data ?? []);
        setAllStates(statesRes.data?.data ?? []);
        setSubscriptions(subsRes.data?.data ?? []);
      } catch (err: unknown) {
        console.error('Failed to load reference data', err);
        setCountries([]);
        setAllStates([]);
        setSubscriptions([]);
      }
    };
    loadRefs();
  }, []);

  // Fetch company data if editing
  useEffect(() => {
    if (!companyId) return;

    const fetchCompany = async () => {
      try {
        const res = await api.get(URLS.GET_COMPANY_BY_ID.replace('{id}', companyId));
        const data = res.data?.data ?? res.data;
        if (!data) return;

        // determine district id: prefer district_id, fallback to city if it contains uuid
        const districtId = data.district_id ?? data.city ?? '';

        setFormData((prev: any) => ({
          ...prev,
          ...data,
          country_id: data.country_id ? String(data.country_id) : '',
          state_id: data.state_id ? String(data.state_id) : '',
          district_id: districtId ? String(districtId) : '',
          postal_code: data.postal_code ? String(data.postal_code) : '',
          subscription_startDate: data.subscription_startDate ? data.subscription_startDate.split('T')[0] : '',
          subscription_endDate: data.subscription_endDate ? data.subscription_endDate.split('T')[0] : '',
          password: '',
          confirmPassword: '',
        }));

        // load districts for this state so district select shows current value
        const stateId = data.state_id ?? '';
        let districtList: any[] = [];
        if (stateId) {
          try {
            const dRes = await api.get(`${URLS.GET_DISTRICTS}?state_id=${stateId}`);
            districtList = dRes.data?.data ?? [];
            setDistricts(districtList);
            console.debug('Fetched districts for state', stateId, 'count', districtList.length, districtList);
            // If the company has a district value that is a name, try resolve to UUID so the select can show it
            if (districtId) {
              try {
                const resolved = await resolveDistrictId(districtId, districtList);
                console.debug('Resolved districtId on load ->', resolved);
                if (resolved) {
                  setField('district_id', String(resolved));
                }
              } catch (e) {
                console.error('Error resolving districtId on load', districtId, e);
              }
            }
          } catch (err) {
            console.error('Failed to load districts for state', stateId, err);
            setDistricts([]);
          }
        }

        // load postals for this district so postal select shows current value
        if (districtId) {
          try {
            const districtParam = await resolveDistrictId(districtId, districtList.length ? districtList : districts);
            if (districtParam) {
              const pRes = await api.get(`${URLS.GET_PINCODES}?district_id=${districtParam}`);
              const postalList = pRes.data?.data ?? [];
              setPostals(postalList);
              if (data.postal_code) {
                const sel = postalList.find((p: any) => String(p.pincode) === String(data.postal_code));
                if (sel) {
                  setField('lat', sel.lat ?? '');
                  setField('lng', sel.lng ?? '');
                }
              }
            } else {
              setPostals([]);
            }
          } catch {
            setPostals([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch company:', err);
        alert('Failed to load company data.');
      }
    };

    fetchCompany();
  }, [companyId]);

  // Filter states when country changes
  useEffect(() => {
    if (!formData.country_id) {
      setStates([]);
      setField('state_id', '');
      return;
    }
    const filtered = allStates.filter(s => String(s.country_id) === String(formData.country_id));
    setStates(filtered);
  }, [formData.country_id, allStates]);

  // Load districts when state changes
  useEffect(() => {
    if (!formData.state_id) {
      setDistricts([]);
      setField('district_id', '');
      return;
    }
    const loadDistricts = async () => {
      try {
        console.debug('Loading districts for state', formData.state_id);
        const res = await api.get(`${URLS.GET_DISTRICTS}?state_id=${formData.state_id}`);
        const fetched = res.data?.data ?? [];
        setDistricts(fetched);
        console.debug('Loaded districts', fetched.length, fetched);
      } catch {
        console.error('Failed to load districts for state', formData.state_id);
        setDistricts([]);
      }
    };
    loadDistricts();
  }, [formData.state_id]);

  // Load postals when district changes
  useEffect(() => {
    if (!formData.district_id) {
      setPostals([]);
      setField('postal_code', '');
      setField('lat', '');
      setField('lng', '');
      return;
    }
    const loadPostals = async () => {
      try {
        console.debug('Attempting to load postals for district', formData.district_id, 'with local districts count', districts.length);
        const districtParam = await resolveDistrictId(formData.district_id, districts);
        console.debug('Resolved districtParam ->', districtParam);
        if (!districtParam) {
          setPostals([]);
          return;
        }
        const res = await api.get(`${URLS.GET_PINCODES}?district_id=${districtParam}`);
        setPostals(res.data?.data ?? []);
      } catch {
        setPostals([]);
      }
    };
    loadPostals();
  }, [formData.district_id]);

  // Set lat/lng when postal changes
  useEffect(() => {
    if (!formData.postal_code) {
      setField('lat', '');
      setField('lng', '');
      return;
    }
    const selected = postals.find(p => String(p.pincode) === String(formData.postal_code));
    if (selected) {
      setField('lat', selected.lat);
      setField('lng', selected.lng);
    }
  }, [formData.postal_code, postals]);

  const handleSave = async () => {
    if (!formData.name) return alert('Company name is required.');
    if (!formData.email) return alert('Email is required.');
    if (!formData.phone) return alert('Phone is required.');
    if (formData.password && formData.password !== formData.confirmPassword)
      return alert('Passwords do not match.');

    try {
      const payload: any = { ...formData };
      delete payload.confirmPassword;

      // Ensure we send district_id (UUID) and also include city name
      if (formData.district_id) {
        // keep district_id as the UUID
        payload.district_id = String(formData.district_id);
        // set city to the district name if available
        const sel = districts.find((d: any) => String(d.district_id || d.id) === String(formData.district_id) || String(d.district_name || d.name) === String(formData.district_id));
        if (sel && (sel.district_name || sel.name)) payload.city = String(sel.district_name || sel.name);
      }
      if (formData.postal_code) payload.postal_code = String(formData.postal_code);

      if (payload.subscription_startDate)
        payload.subscription_startDate = payload.subscription_startDate.split('T')[0];
      if (payload.subscription_endDate)
        payload.subscription_endDate = payload.subscription_endDate.split('T')[0];

      const hasFiles = logoFile || proofFile;
      if (hasFiles) {
        const form = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v === '' || v === null || v === undefined) return;
          if (v instanceof File) {
            form.append(k, v);
          } else if (typeof v === 'object') {
            form.append(k, JSON.stringify(v));
          } else {
            form.append(k, String(v));
          }
        });
        if (logoFile) form.append('logo', logoFile);
        if (proofFile) form.append('proof', proofFile);
        await api.put(URLS.UPDATE_COMPANY.replace('{id}', String(companyId ?? '')), form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put(URLS.UPDATE_COMPANY.replace('{id}', String(companyId ?? '')), payload);
      }

      alert('Company saved successfully!');
      router.push('/company');
    } catch (err: any) {
      console.error(err.response || err);
      alert(err?.response?.data?.error || err?.message || 'Failed to save company.');
    }
  };

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const resolveDistrictId = async (val: any, list: any[]) => {
    const s = String(val ?? '');
    console.debug('Resolving district id for value:', s);
    if (!s) return '';
    if (uuidRegex.test(s)) return s;
    const found = (list || []).find((d: any) => String(d.district_id) === s || String(d.id) === s || String(d.district_name) === s || String(d.name) === s);
    if (found) return String(found.district_id || found.id);

    // Try to fetch districts for the current state and search there
    try {
      if (formData.state_id) {
        const dRes = await api.get(`${URLS.GET_DISTRICTS}?state_id=${formData.state_id}`);
        const fetched = dRes.data?.data ?? [];
        setDistricts(fetched);
        console.debug('Fetched remote districts while resolving, count', fetched.length);
        const f = fetched.find((d: any) => String(d.district_id) === s || String(d.id) === s || String(d.district_name) === s || String(d.name) === s);
        if (f) return String(f.district_id || f.id);
      }
    } catch (e) {
      console.error('Error fetching districts while resolving id for', s, e);
      // ignore and fallthrough
    }

    // Could not resolve to a UUID
    console.debug('Could not resolve district to UUID for value:', s);
    return '';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{companyId ? 'Edit Company' : 'Create Company'}</h1>
      <Card className="p-6 space-y-8">
        <Label className="mb-2 block pb-1">Company Logo</Label>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div
            className="flex justify-start items-center"
            role="button"
            tabIndex={0}
            onClick={() => logoInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') logoInputRef.current?.click(); }}
            style={{
              border: '3px dotted #b1b1b1',
              borderRadius: '15px',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <div>
              {logoFile ? (
                <p className="text-sm mt-1">{logoFile.name}</p>
              ) : formData.logo ? (
                <img src={getImageUrl(formData.logo)} alt="Logo" className="w-32 h-32 object-contain" />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-gray-400 border border-dashed rounded-lg">No Logo</div>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            <div className="ml-4">
              <button type="button" onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }} className="px-3 py-1 bg-white border rounded">
                Upload Logo
              </button>
            </div>
          </div>
        </div>

        {/* Contact fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className='pb-3'>Company Name</Label>
            <Input value={safeValue(formData.name)} onChange={(e) => setField('name', e.target.value)} />
          </div>
          <div>
            <Label className='pb-3'>Email</Label>
            <Input type="email" value={safeValue(formData.email)} onChange={(e) => setField('email', e.target.value)} />
          </div>
          <div>
            <Label className='pb-3'>GST Number</Label>
            <Input value={safeValue(formData.gst)} onChange={(e) => setField('gst', e.target.value)} />
          </div>
          <div>
            <Label className='pb-3'>Phone</Label>
            <Input value={safeValue(formData.phone)} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className='pb-3'>Address</Label>
            <Input value={safeValue(formData.address_1)} onChange={(e) => setField('address_1', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className='pb-3'>Country</Label>
            <Select value={String(formData.country_id)} onValueChange={(v) => setField('country_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Country" /></SelectTrigger>
              <SelectContent>{countries.map((c: any) => <SelectItem key={c.country_id} value={String(c.country_id)}>{c.country_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className='pb-3'>State</Label>
            <Select value={String(formData.state_id)} onValueChange={(v) => setField('state_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
              <SelectContent>{states.map((s: any) => <SelectItem key={s.state_id} value={String(s.state_id)}>{s.state_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className='pb-3'>District</Label>
            <Select value={String(formData.district_id)} onValueChange={(v) => setField('district_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select District" /></SelectTrigger>
              <SelectContent>{districts.map((d: any) => <SelectItem key={d.district_id || d.id} value={String(d.district_id || d.id)}>{d.district_name || d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className='pb-3'>Postal Code</Label>
            <Select value={String(formData.postal_code)} onValueChange={(v) => setField('postal_code', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Postal Code" /></SelectTrigger>
              <SelectContent>{postals.map((p: any) => <SelectItem key={p.id} value={String(p.pincode)}>{p.pincode}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><Label className='pb-3'>Latitude</Label><Input value={safeValue(formData.lat)} disabled /></div>
          <div><Label className='pb-3'>Longitude</Label><Input value={safeValue(formData.lng)} disabled /></div>

          <div>
            <Label className='pb-3'>Password</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={safeValue(formData.password)} onChange={(e) => handlePasswordChange('password', e.target.value)} className="pr-10" />
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500" onClick={() => setShowPassword(p => !p)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <Label className='pb-3'>Confirm Password</Label>
            <div className="relative">
              <Input type={showConfirmPassword ? 'text' : 'password'} value={safeValue(formData.confirmPassword)} onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)} className="pr-10" />
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500" onClick={() => setShowConfirmPassword(p => !p)}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
          </div>

          <div>
            <Label className='pb-3'>Company Proof</Label>
            <input ref={proofInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
            <div>
              <button type="button" onClick={() => proofInputRef.current?.click()} className="px-3 py-1 bg-white border rounded">Upload Proof</button>
            </div>
            {proofFile && <p className="text-sm mt-1">{proofFile.name}</p>}
            {!proofFile && typeof formData.proof === 'string' && formData.proof && (
              (String(formData.proof).endsWith('.pdf') ? <a href={getImageUrl(formData.proof)} target="_blank" className="text-blue-600 underline">View PDF</a> : <img src={getImageUrl(formData.proof)} alt="Proof" className="w-32 h-32 object-contain mt-2" />)
            )}
          </div>

          <div>
            <Label className='pb-3'>Theme Color</Label>
            <Input type="color" value={safeValue(formData.theme_color)} onChange={(e) => setField('theme_color', e.target.value)} />
            <span className="ml-2">{safeValue(formData.theme_color)}</span>
          </div>

          <div>
            <Label className='pb-3'>Subscription Plan</Label>
            <Select value={String(formData.subscription_id)} onValueChange={(v) => setField('subscription_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Subscription" /></SelectTrigger>
              <SelectContent>{subscriptions.map((s: any) => <SelectItem key={s.subscription_id} value={s.subscription_id}>{s.subscription_title}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><Label className='pb-3'>No. of Users</Label><Input type="number" value={safeValue(formData.no_of_users)} onChange={(e) => setField('no_of_users', e.target.value)} /></div>
          <div><Label className='pb-3'>Amount per User</Label><Input type="number" value={safeValue(formData.subscription_amountPerUser)} onChange={(e) => setField('subscription_amountPerUser', e.target.value)} /></div>
          <div><Label className='pb-3'>Start Date</Label><Input type="date" value={safeValue(formData.subscription_startDate)} onChange={(e) => setField('subscription_startDate', e.target.value)} /></div>
          <div><Label className='pb-3'>End Date</Label><Input type="date" value={safeValue(formData.subscription_endDate)} onChange={(e) => setField('subscription_endDate', e.target.value)} /></div>

          <div><Label className='pb-3'>Remarks</Label><Input value={safeValue(formData.remarks)} onChange={(e) => setField('remarks', e.target.value)} /></div>

          <div className="flex items-center gap-2">
            <Label className='pb-3'>Status</Label>
            <button
              type="button"
              onClick={() => setField('status', !formData.status)}
              className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${formData.status ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${formData.status ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className="ml-2 font-medium">{formData.status ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="destructive" onClick={() => router.push('/company')}>Cancel</Button>
          <Button style={{ backgroundColor: formData.theme_color, color: '#fff' }} onClick={handleSave}>{companyId ? 'Update' : 'Save'}</Button>
        </div>
      </Card>
    </div>
  );
}
