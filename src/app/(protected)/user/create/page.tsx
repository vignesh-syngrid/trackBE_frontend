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

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string | undefined;

  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor ?? '#4F46E5');
  const userRole = useSelector((s: RootState) => (s as any).auth?.user?.role_name ?? '');
  const userCompanyId = useSelector((s: RootState) => (s as any).auth?.user?.company_id ?? '');
  const userVendorId = useSelector((s: RootState) => (s as any).auth?.user?.vendor_id ?? '');
  // Safe read of current user from localStorage to detect company/vendor scoped login
  const [currentUser] = useState<any>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const detectedCompanyId = currentUser?.company_id || currentUser?.company?.company_id || '';
  const detectedCompanyName = currentUser?.company?.name || currentUser?.company_name || '';
  const detectedVendorId = currentUser?.vendor_id || currentUser?.vendor?.vendor_id || '';
  const detectedVendorName = currentUser?.vendor?.vendor_name || currentUser?.vendor_name || '';

  const [companies, setCompanies] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [postals, setPostals] = useState<any[]>([]);
  const [filteredPostals, setFilteredPostals] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  // refs for hidden native file inputs
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [formData, setFormData] = useState<any>({
    company_id: '',
    role_id: '',
    vendor_id: '',
    supervisor_id: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    photo: '',
    emergency_contact: '',
    address_1: '',
    country_id: '',
    state_id: '',
    city: '',
    postal_code: '',
    lat: '',
    lng: '',
    region_ids: [] as string[],
    region_id: '',
    shift_id: '',
    proof: '',
  });

  const setField = (key: string, value: any) =>
    setFormData((prev: any) => ({ ...prev, [key]: value }));

  // Load reference data
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const resArr = await Promise.all([
          api.get(URLS.GET_COMPANIES).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_ROLES).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_VENDORS).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_COUNTRIES).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_STATES).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_REGION).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_USERS).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_SHIFT).catch(() => ({ data: { data: [] } })),
        ]);
        const [
          companiesRes,
          rolesRes,
          vendorsRes,
          countriesRes,
          statesRes,
          regionsRes,
          usersRes,
          shiftsRes,
        ] = resArr;

        // raw lists
        const rawCompanies = companiesRes.data?.data ?? [];
        const rawVendors = vendorsRes.data?.data ?? [];

        const effectiveCompany = detectedCompanyId || userCompanyId || '';
        const effectiveVendor = detectedVendorId || '';

        // If user is scoped to a company (detected from localStorage or redux), limit lists to that company
        if (effectiveCompany) {
          const companyList = rawCompanies.filter((c: any) => String(c.company_id) === String(effectiveCompany));
          setCompanies(companyList.length ? companyList : [{ company_id: String(effectiveCompany), name: String(detectedCompanyName || effectiveCompany) }]);
          // vendors limited to the company
          setVendors(rawVendors.filter((v: any) => String(v.company_id) === String(effectiveCompany)));
        } else {
          setCompanies(rawCompanies);
          setVendors(rawVendors);
        }

        // If user is scoped to a vendor specifically, limit vendors to that vendor
        if (effectiveVendor) {
          const vendorList = rawVendors.filter((v: any) => String(v.vendor_id) === String(effectiveVendor));
          setVendors(vendorList.length ? vendorList : [{ vendor_id: String(effectiveVendor), vendor_name: String(detectedVendorName || effectiveVendor), company_id: effectiveCompany || '' }]);
        }

        setRoles(rolesRes.data?.data ?? []);
        setCountries(countriesRes.data?.data ?? []);
        setStates(statesRes.data?.data ?? []);
        setDistricts([]);
        setPostals([]);
        // ✅ Fix: ensure correct region data shape
        const regionData = regionsRes.data?.data ?? regionsRes.data ?? [];
        setRegions(Array.isArray(regionData) ? regionData : []);
        setUsers(usersRes.data?.data ?? []);
        setShifts(shiftsRes.data?.data ?? []);
      } catch {
        setCompanies([]);
        setRoles([]);
        setVendors([]);
        setCountries([]);
        setStates([]);
        setDistricts([]);
        setPostals([]);
        setRegions([]);
        setUsers([]);
        setShifts([]);
      }
    };
    loadRefs();
  }, [detectedCompanyId, detectedVendorId, userCompanyId, userVendorId]);

  // Auto-fill company_id for non-super-admin
  useEffect(() => {
    const effectiveCompany = detectedCompanyId || (userRole !== 'super_admin' && userCompanyId ? userCompanyId : '');
    if (effectiveCompany) setField('company_id', effectiveCompany);
    const effectiveVendor = detectedVendorId || '';
    if (effectiveVendor) setField('vendor_id', effectiveVendor);
  }, [userRole, userCompanyId, detectedVendorId]);

  // Load user data for edit
  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        const res = await api.get(URLS.GET_USER_BY_ID.replace('{id}', userId));
        const data = res.data?.data ?? res.data;
        if (data) setFormData({ ...formData, ...data, password: '', confirmPassword: '' });
      } catch (err) {
        console.error('Failed to fetch user:', err);
        alert('Failed to load user data.');
      }
    };

    fetchUser();
  }, [userId]);

  // Password handler
  const handlePasswordChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));

    if (field === 'password' && formData.confirmPassword) {
      setPasswordError(value !== formData.confirmPassword ? 'Passwords do not match' : '');
    }

    if (field === 'confirmPassword') {
      setPasswordError(value !== formData.password ? 'Passwords do not match' : '');
    }
  };

  // Form validation
  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.company_id) {
      alert('Please fill all required fields.');
      return false;
    }

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        alert('Password and Confirm Password do not match.');
        return false;
      }
      if (formData.password.length < 6) {
        alert('Password must be at least 6 characters.');
        return false;
      }
    }

    const selectedRole = roles.find(r => r.role_id === formData.role_id)?.role_name?.toLowerCase();

    if ((selectedRole === 'technician' || selectedRole === 'supervisor') && !formData.vendor_id) {
      alert('Vendor is required for Technician/Supervisor.');
      return false;
    }

    const vendor = vendors.find(v => v.vendor_id === formData.vendor_id);
    if (vendor && vendor.company_id !== formData.company_id) {
      alert('Vendor must belong to the selected company.');
      return false;
    }

    const supervisor = users.find(u => u.user_id === formData.supervisor_id);
    if (supervisor) {
      const supervisorRole = (supervisor.role_name ?? supervisor.role?.role_name ?? '').toLowerCase();
      if (
        supervisor.company_id !== formData.company_id ||
        !['supervisor', 'supervisor / dispatcher'].includes(supervisorRole)
      ) {
        alert('Supervisor must belong to the selected company and have Supervisor role.');
        return false;
      }
    }

    return true;
  };

  // Save handler
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const form = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) return;
        if (Array.isArray(v)) v.forEach(val => form.append(`${k}[]`, val));
        else form.append(k, v as any);
      });

      if (photoFile) form.append('photo', photoFile);
      if (proofFile) form.append('proof', proofFile);

      // ✅ use POST for create
      await api.post(URLS.CREATE_USER, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('User created successfully!');
      router.push('/user');
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || err.message || 'Failed to create user.');
    }
  };

  // Cascading dropdowns: load states when country changes
  useEffect(() => {
    if (!formData.country_id) {
      setStates([]);
      setDistricts([]);
      setPostals([]);
      setField('state_id', '');
      setField('city', '');
      setField('postal_code', '');
      return;
    }
    (async () => {
      try {
        const res = await api.get(URLS.GET_STATES, { params: { country_id: formData.country_id } });
        setStates(res.data?.data ?? []);
        setDistricts([]);
        setPostals([]);
        setField('state_id', '');
        setField('city', '');
        setField('postal_code', '');
      } catch (e) {
        setStates([]);
      }
    })();
  }, [formData.country_id]);

  // load cities/districts when state changes
  useEffect(() => {
    if (!formData.state_id) {
      setDistricts([]);
      setPostals([]);
      setField('city', '');
      setField('postal_code', '');
      return;
    }
    (async () => {
      try {
        const res = await api.get((URLS as any).GET_CITIES ?? URLS.GET_DISTRICTS, { params: { state_id: formData.state_id } });
        setDistricts(res.data?.data ?? []);
        setPostals([]);
        setField('city', '');
        setField('postal_code', '');
      } catch (e) {
        setDistricts([]);
      }
    })();
  }, [formData.state_id]);

  // load pincodes when city changes
  useEffect(() => {
    if (!formData.city) {
      setPostals([]);
      setFilteredPostals([]);
      setField('postal_code', '');
      setField('lat', '');
      setField('lng', '');
      return;
    }
    (async () => {
      try {
        const res = await api.get(URLS.GET_PINCODES, { params: { district_id: formData.city } });
        const list = res.data?.data ?? [];
        setPostals(list);
        setFilteredPostals(list);
        setField('postal_code', '');
        setField('lat', '');
        setField('lng', '');
      } catch (e) {
        setPostals([]);
        setFilteredPostals([]);
      }
    })();
  }, [formData.city]);

  // autofill lat/lng when postal_code selected
  useEffect(() => {
    const rawPostal = String(formData.postal_code ?? '').trim();
    if (!rawPostal) {
      setField('lat', '');
      setField('lng', '');
      return;
    }
    const sel = postals.find((p: any) => String(p.pincode) === rawPostal || String(p.postal_code) === rawPostal || String(p.postal_code_id) === rawPostal || String(p.id) === rawPostal);
    if (sel) {
      setField('lat', sel.lat ?? '');
      setField('lng', sel.lng ?? '');
      return;
    }
    // fallback: try fetch single pincode
    (async () => {
      try {
        if ((URLS as any).GET_PINCODE_BY_CODE) {
          const sRes = await api.get((URLS as any).GET_PINCODE_BY_CODE.replace('{pincode}', encodeURIComponent(rawPostal)));
          const single = sRes.data?.data ?? sRes.data ?? null;
          if (single) {
            setField('lat', single.lat ?? '');
            setField('lng', single.lng ?? '');
            setPostals((prev) => (prev.find((p: any) => String(p.pincode) === String(single.pincode)) ? prev : [...prev, single]));
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [formData.postal_code, postals]);

  // Auto-select single vendor for scoped users so disabled control shows a value
  useEffect(() => {
    const effectiveVendor = detectedVendorId || userVendorId || '';
    const effectiveCompany = detectedCompanyId || userCompanyId || '';
    if (!formData.vendor_id) {
      // if vendor-scoped, set to that vendor
      if (effectiveVendor) {
        setField('vendor_id', String(effectiveVendor));
        return;
      }
      // if company-scoped and only one vendor exists for that company, set it
      if (effectiveCompany && vendors.length === 1) {
        setField('vendor_id', String(vendors[0].vendor_id));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors, detectedVendorId, userVendorId, detectedCompanyId, userCompanyId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit User</h1>

      <Card className="p-6 space-y-6">

        {/* Photo / Logo Section */}
        <div className="space-y-2">
          <Label className='pb-3'>Photo / Logo</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="flex justify-start" role="button" tabIndex={0} onClick={() => photoInputRef.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') photoInputRef.current?.click(); }} style={{
               border: "3px dotted #b1b1b1",
               borderRadius: "15px",
               padding: "20px",
               backgroundColor:  "#f8f9fa",
               cursor: "pointer",
               transition: "all 0.2s ease-in-out",
               alignItems: "center",
             }}>
              {photoFile ? (
                <img src={URL.createObjectURL(photoFile)} alt="Photo Preview" className="w-32 h-32 object-contain border rounded-lg" />
              ) : formData.photo ? (
                <img src={formData.photo} alt="Photo Preview" className="w-32 h-32 object-contain border rounded-lg" />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-gray-400 border border-dashed rounded-lg">No Photo</div>
              )}
            
              {/* hidden native input + upload button */}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              <div className="ml-3">
                <button type="button" onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }} className="px-3 py-1 bg-white border rounded">Upload Photo</button>
              </div>
              {photoFile && <p className="mt-2 text-sm text-gray-600">{photoFile.name}</p>}
             </div>
          </div>
        </div>

        {/* Contact & Login Section */}
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <h2 className="text-lg font-medium">Contact & Login</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name, Email, Phone, Emergency Contact */}
            <div><Label className='pb-3'>Name</Label><Input value={formData.name} onChange={(e) => setField('name', e.target.value)} /></div>
            <div><Label className='pb-3'>Email</Label><Input type="email" value={formData.email} onChange={(e) => setField('email', e.target.value)} /></div>
            <div><Label className='pb-3'>Phone</Label><Input value={formData.phone} onChange={(e) => setField('phone', e.target.value)} /></div>
            <div><Label className='pb-3'>Emergency Contact</Label><Input value={formData.emergency_contact} onChange={(e) => setField('emergency_contact', e.target.value)} /></div>

            {/* Password & Confirm Password */}
            <div>
              <Label className='pb-3'>Password</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={formData.password} placeholder="Password" onChange={(e) => handlePasswordChange('password', e.target.value)} className="pr-10" />
                <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <Label className='pb-3'>Confirm Password</Label>
              <div className="relative">
                <Input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} placeholder="Confirm Password" onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)} className="pr-10" />
                <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500" onClick={() => setShowConfirmPassword(p => !p)}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
            </div>
          </div>
        </div>

        {/* Location & Area Section */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <h2 className="text-lg font-medium">Location & Area</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className='pb-3'>Address</Label><Input value={formData.address_1} onChange={(e) => setField('address_1', e.target.value)} /></div>
            <div>
              <Label className='pb-3'>Country</Label>
              <Select value={formData.country_id} onValueChange={(v) => setField('country_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Country" /></SelectTrigger>
                <SelectContent>{countries.map(c => <SelectItem key={c.country_id} value={c.country_id}>{c.country_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className='pb-3'>State</Label>
              <Select value={formData.state_id} onValueChange={(v) => setField('state_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
                <SelectContent className="max-h-48 overflow-auto">{states.map(s => <SelectItem key={s.state_id} value={s.state_id}>{s.state_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>City</Label>
              <Select value={formData.city} onValueChange={(v) => setField('city', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select City" /></SelectTrigger>
                <SelectContent className="max-h-48 overflow-auto">
                  {districts.map((d: any) => <SelectItem key={d.district_id ?? d.id} value={d.district_id ?? d.id}>{d.district_name ?? d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>Postal Code</Label>
              <Select value={formData.postal_code} onValueChange={(v) => setField('postal_code', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Postal Code" /></SelectTrigger>
                <SelectContent className="max-h-48 overflow-auto">
                  <Input placeholder="Search Postal Code..." className="mb-2 p-1 w-full border rounded" onChange={(e) => setFilteredPostals(postals.filter(p => String(p.pincode).toLowerCase().includes(e.target.value.toLowerCase())))} />
                  {(filteredPostals.length ? filteredPostals : postals).map((p: any) => <SelectItem key={p.pincode ?? p.id} value={p.pincode ?? p.postal_code}>{p.pincode ?? p.postal_code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className='pb-3'>Latitude</Label><Input value={formData.lat} onChange={(e) => setField('lat', e.target.value)} disabled /></div>
            <div><Label className='pb-3'>Longitude</Label><Input value={formData.lng} onChange={(e) => setField('lng', e.target.value)} disabled /></div>
          </div>
        </div>

        {/* Vendor Details Section */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <h2 className="text-lg font-medium">Vendor Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* derive effective ids */}
            <div>
              <Label className='pb-3'>Company</Label>
              { (detectedCompanyId || userCompanyId) ? (
                <div className="w-full">
                  <div className="p-2 border rounded bg-gray-50 text-gray-800">
                    {companies.find(c => String(c.company_id) === String(detectedCompanyId || userCompanyId))?.name || String(detectedCompanyId || userCompanyId)}
                  </div>
                </div>
              ) : (
                <Select value={formData.company_id} onValueChange={(v) => { setField('company_id', v); setField('vendor_id', ''); setField('supervisor_id', ''); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Company" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.company_id} value={c.company_id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className='pb-3'>Vendor</Label>
              {
                // Disable vendor when user is vendor-scoped or company-scoped
                (detectedVendorId || userVendorId || userCompanyId) ? (
                  // if exactly one vendor available, show name read-only
                  vendors.length === 1 ? (
                    <div className="w-full">
                      <div className="p-2 border rounded bg-gray-50 text-gray-800">
                        {vendors[0].vendor_name || String(vendors[0].vendor_id)}
                      </div>
                    </div>
                  ) : (
                    // otherwise show disabled select so user can see options but not change
                    <Select value={formData.vendor_id} onValueChange={(v) => setField('vendor_id', v)} disabled>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.filter(v => !formData.company_id || String(v.company_id) === String(formData.company_id)).map((v: any) => (
                          <SelectItem key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <Select value={formData.vendor_id} onValueChange={(v) => setField('vendor_id', v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.filter(v => !formData.company_id || String(v.company_id) === String(formData.company_id)).map((v: any) => (
                        <SelectItem key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
            </div>

            <div>
              <Label className='pb-3'>Region</Label>
              <Select value={formData.region_id} onValueChange={(v) => setField('region_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Region" /></SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(r => {
                      const effectiveCompany = String(formData.company_id || detectedCompanyId || userCompanyId || '');
                      const rCompanyId = String(r.company_id ?? r.company?.company_id ?? '');
                      return !effectiveCompany || rCompanyId === String(effectiveCompany);
                    })
                    .map(r => (
                      <SelectItem key={r.region_id ?? r.id} value={String(r.region_id ?? r.id)}>
                        {r.region_name ?? r.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Roles & Supervisor Section */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <h2 className="text-lg font-medium">Roles & Supervisor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className='pb-3'>Role</Label>
              <Select value={formData.role_id} onValueChange={(v) => setField('role_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Role" /></SelectTrigger>
                <SelectContent>{roles.map(r => <SelectItem key={r.role_id} value={r.role_id}>{r.role_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>Supervisor</Label>
              <Select value={formData.supervisor_id} onValueChange={(v) => setField('supervisor_id', v)} disabled={!formData.company_id || users.length === 0}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Supervisor" /></SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => {
                      // Always normalize role name
                      const roleName = (u.role_name ?? u.role?.role_name ?? '').toLowerCase();
                      const isSupervisor = ['supervisor', 'supervisor / dispatcher'].includes(roleName);

                      // Support both flat and nested IDs
                      const userCompanyId = u.company_id ?? u.company?.company_id;
                      const userVendorId = u.vendor_id ?? u.vendor?.vendor_id;

                      // Match company
                      const sameCompany = String(userCompanyId) === String(formData.company_id);

                      // Match vendor (only if vendor selected)
                      const sameVendor =
                        !formData.vendor_id || String(userVendorId) === String(formData.vendor_id);

                      return sameCompany && sameVendor || isSupervisor;
                    })
                    .map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Shift Section */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <h2 className="text-lg font-medium">Shift</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className='pb-3'>Shift</Label>
              <Select value={formData.shift_id} onValueChange={(v) => setField('shift_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Shift" /></SelectTrigger>
                <SelectContent>{shifts.map(s => <SelectItem key={s.shift_id} value={s.shift_id}>{s.shift_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KYC / Proof Section */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <Label className='pb-3'>Proof / Document</Label>
          {/* hidden native input + upload button for proof */}
          <input ref={proofInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
          <div><button type="button" onClick={() => proofInputRef.current?.click()} className="px-3 py-1 bg-white border rounded">Upload Proof</button></div>
          {proofFile && <p className="text-sm text-gray-600 mt-1">{proofFile.name}</p>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="destructive" onClick={() => router.push('/user')}>Cancel</Button>
          <Button onClick={handleSave} style={{ backgroundColor: primaryColor, color: '#fff' }}>Update</Button>
        </div>

      </Card>
    </div>
  );
}
