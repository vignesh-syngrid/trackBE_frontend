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
import { toast } from 'sonner';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string | undefined;

  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor ?? '#4F46E5');
  const userRole = useSelector((s: RootState) => (s as any).auth?.user?.role_name ?? '');
  const userCompanyId = useSelector((s: RootState) => (s as any).auth?.user?.company_id ?? '');

  // Safe read of current user from localStorage to detect company-scoped login
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
  const effectiveCompany = detectedCompanyId || (userRole !== 'super_admin' && userCompanyId ? userCompanyId : '');

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
  // refs for hidden file inputs
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDropdown, setLoadingDropdown] = useState<boolean>(false);
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
    city_name: '',
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
      setLoading(true);
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

        setCompanies(companiesRes.data?.data ?? []);
        setRoles(rolesRes.data?.data ?? []);
        setVendors(vendorsRes.data?.data ?? []);
        setCountries(countriesRes.data?.data ?? []);
        setStates(statesRes.data?.data ?? []);
        setRegions(regionsRes.data?.data ?? []);
        setUsers(usersRes.data?.data ?? []);
        // Normalize shift response shape and ensure an array
        const shiftData = shiftsRes.data?.data ?? shiftsRes.data ?? [];
        setShifts(Array.isArray(shiftData) ? shiftData : []);
        // If scoped to a company and no shifts returned, try fetching shifts for that company
        if (effectiveCompany && (!Array.isArray(shiftData) || shiftData.length === 0)) {
          try {
            const scRes = await api.get(URLS.GET_SHIFT, { params: { company_id: effectiveCompany } }).catch(() => ({ data: { data: [] } }));
            const scData = scRes.data?.data ?? scRes.data ?? [];
            if (Array.isArray(scData) && scData.length > 0) setShifts(scData);
          } catch (err) {
            // ignore
          }
        }
      } catch (e) {
        setCompanies([]);
        setRoles([]);
        setVendors([]);
        setCountries([]);
        setStates([]);
        setRegions([]);
        setUsers([]);
        setShifts([]);
      }
      setLoading(false);
    };
    loadRefs();
  }, []);

  // Auto-fill company_id when scoped
  useEffect(() => {
    if (effectiveCompany) setField('company_id', String(effectiveCompany));
  }, [effectiveCompany]);

  // Load user data for edit
  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await api.get(URLS.GET_USER_BY_ID.replace('{id}', userId));
        const data = res.data?.data ?? res.data;
        if (data) {
          // normalize potentially nested ids/objects
          const countryId = data.country_id ?? data.country?.country_id ?? data.country?.id ?? '';
          const stateId = data.state_id ?? data.state?.state_id ?? data.state?.id ?? '';
          const cityVal = data.city ?? data.city_id ?? data.district_id ?? data.city?.district_id ?? data.city?.id ?? '';
          const postalVal = data.postal_code ?? data.pincode ?? data.postal_code_id ?? '';
          const shiftId = data.shift_id ?? data.shift?.shift_id ?? data.shift?.id ?? '';

          // merge user data but do not overwrite existing keys with undefined
          const safeData: any = {};
          Object.entries(data).forEach(([k, v]) => {
            if (v !== undefined) safeData[k] = v;
          });
          setFormData((prev: any) => ({
            ...prev,
            ...safeData,
            country_id: countryId ? String(countryId) : prev.country_id ?? '',
            state_id: stateId ? String(stateId) : prev.state_id ?? '',
            city: cityVal ? String(cityVal) : prev.city ?? '',
            city_name: '',
            postal_code: postalVal ? String(postalVal) : prev.postal_code ?? '',
            shift_id: shiftId ? String(shiftId) : prev.shift_id ?? '',
            password: '',
            confirmPassword: '',
          }));

          // ensure shift_id selection
          if (shiftId) setField('shift_id', String(shiftId));

          // load dependent lists in order
          try {
            if (countryId) {
              const sRes = await api.get(URLS.GET_STATES, { params: { country_id: countryId } });
              setStates(sRes.data?.data ?? []);
              setField('country_id', String(countryId));
            }

            if (stateId) {
              const stId = String(stateId);
              setField('state_id', stId);
              try {
                const cRes = await api.get((URLS as any).GET_CITIES ?? URLS.GET_DISTRICTS, { params: { state_id: stId } });
                const districtsFetched = cRes.data?.data ?? [];
                setDistricts(districtsFetched);

                // resolve city selection
                if (cityVal) {
                  const match = districtsFetched.find((d: any) => String(d.district_id) === String(cityVal) || String(d.id) === String(cityVal) || String((d.district_name ?? d.name) ?? '').toLowerCase() === String(cityVal).toLowerCase());
                  if (match) {
                    const resolvedId = String(match.district_id ?? match.id);
                    setField('city', resolvedId);
                    setField('city_name', String(match.district_name ?? match.name ?? ''));
                  } else {
                    setField('city', String(cityVal));
                    // if cityVal looks like a name, store it in city_name as fallback
                    if (typeof cityVal === 'string') setField('city_name', cityVal);
                    else setField('city_name', '');
                  }
                }

                // load pincodes
                const districtParam = cityVal || stId || '';
                if (districtParam) {
                  try {
                    const pRes = await api.get(URLS.GET_PINCODES, { params: { district_id: districtParam } });
                    const fetched = pRes.data?.data ?? [];
                    setPostals(fetched);
                    if (postalVal) {
                      const postalMatch = fetched.find((p: any) => String(p.pincode) === String(postalVal) || String(p.postal_code) === String(postalVal) || String(p.postal_code_id) === String(postalVal) || String(p.id) === String(postalVal));
                      if (postalMatch) {
                        setField('postal_code', String(postalMatch.pincode ?? postalMatch.postal_code ?? postalMatch.postal_code_id ?? postalMatch.id));
                        setField('lat', String(postalMatch.lat ?? ''));
                        setField('lng', String(postalMatch.lng ?? ''));
                      }
                    } else if (data.lat || data.lng) {
                      setField('lat', String(data.lat ?? ''));
                      setField('lng', String(data.lng ?? ''));
                    }
                  } catch (e) {
                    // ignore
                  }
                }
              } catch (e) {
                // ignore
              }
            }
          } catch (err) {
            console.error('Failed to load dependent location lists for user edit', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        toast.error('Failed to load user data.');
      }
      setLoading(false);
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
      toast.error('Please fill all required fields.');
      return false;
    }

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Password and Confirm Password do not match.');
        return false;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters.');
        return false;
      }
    }

    const selectedRole = roles.find(r => r.role_id === formData.role_id)?.role_name?.toLowerCase();

    if ((selectedRole === 'technician' || selectedRole === 'supervisor') && !formData.vendor_id) {
      toast.error('Vendor is required for Technician/Supervisor.');
      return false;
    }

    const vendor = vendors.find(v => v.vendor_id === formData.vendor_id);
    if (vendor && vendor.company_id !== formData.company_id) {
      toast.error('Vendor must belong to the selected company.');
      return false;
    }

    const supervisor = users.find(u => u.user_id === formData.supervisor_id);
    if (supervisor) {
      const supervisorRole = (supervisor.role_name ?? supervisor.role?.role_name ?? '').toLowerCase();
      if (
        supervisor.company_id !== formData.company_id ||
        !['supervisor', 'supervisor / dispatcher'].includes(supervisorRole)
      ) {
        toast.error('Supervisor must belong to the selected company and have Supervisor role.');
        return false;
      }
    }

    return true;
  };

  // Save handler
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const hasFiles = Boolean(photoFile) || Boolean(proofFile);

      if (hasFiles) {
        const form = new FormData();
        Object.entries(formData).forEach(([k, v]) => {
          if (v === '' || v === null || v === undefined) return;
          if (Array.isArray(v)) v.forEach(val => form.append(`${k}[]`, val));
          else form.append(k, v as any);
        });

        if (photoFile) form.append('photo', photoFile);
        if (proofFile) form.append('proof', proofFile);

        // debug: print form entries to console to inspect multipart payload
        if (typeof window !== 'undefined') {
          try {
            for (const pair of (form as any).entries()) {
              // eslint-disable-next-line no-console
              console.debug('FormData entry:', pair[0], pair[1] instanceof File ? pair[1].name : pair[1]);
            }
          } catch (e) {
            // ignore
          }
        }

        if (userId) await api.put(URLS.UPDATE_USER.replace('{id}', userId), form);
        else await api.post(URLS.CREATE_USER, form);
      } else {
        // send JSON when no files attached to avoid multipart parsing issues
        const payload: any = {};
        Object.entries(formData).forEach(([k, v]) => {
          if (v === '' || v === null || v === undefined) return;
          payload[k] = v;
        });

        // debug: log payload
        if (typeof window !== 'undefined') console.debug('JSON payload:', payload);

        if (userId) await api.put(URLS.UPDATE_USER.replace('{id}', userId), payload);
        else await api.post(URLS.CREATE_USER, payload);
      }

      toast.success(userId ? 'User updated successfully!' : 'User created successfully!');
      router.push('/user');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err.message || 'Failed to save user.');
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
      setLoadingDropdown(true);
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
      } finally {
        setLoadingDropdown(false);
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
      setField('city_name', '');
      return;
    }
    (async () => {
      setLoadingDropdown(true);
      try {
        const res = await api.get((URLS as any).GET_CITIES ?? URLS.GET_DISTRICTS, { params: { state_id: formData.state_id } });
        const fetched = res.data?.data ?? [];
        setDistricts(fetched);
        // if a city id already present, resolve and set city_name so UI shows label
        if (formData.city) {
          const match = fetched.find((d: any) => String(d.district_id ?? d.id) === String(formData.city) || String((d.district_name ?? d.name) ?? '').toLowerCase() === String(formData.city).toLowerCase());
          if (match) setField('city_name', String(match.district_name ?? match.name ?? ''));
        }
        setPostals([]);
        setField('city', '');
        setField('postal_code', '');
      } catch (e) {
        setDistricts([]);
      } finally {
        setLoadingDropdown(false);
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
      setLoadingDropdown(true);
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
      } finally {
        setLoadingDropdown(false);
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{userId ? 'Edit User' : 'Create User'}</h1>

      <Card className="p-6 space-y-6">
        {(loading || loadingDropdown) && (
          <div className="fixed inset-0 bg-white/60 z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-600 border-gray-200" />
          </div>
        )}

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
            
              {/* hidden native input + Upload button */}
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
            <div><Label className='pb-3'>Name</Label><Input value={formData.name ?? ''} onChange={(e) => setField('name', e.target.value)} /></div>
            <div><Label className='pb-3'>Email</Label><Input type="email" value={formData.email ?? ''} onChange={(e) => setField('email', e.target.value)} /></div>
            <div><Label className='pb-3'>Phone</Label><Input value={formData.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} /></div>
            <div><Label className='pb-3'>Emergency Contact</Label><Input value={formData.emergency_contact ?? ''} onChange={(e) => setField('emergency_contact', e.target.value)} /></div>

            <div>
              <Label className='pb-3'>Password</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={formData.password ?? ''} placeholder="Password" onChange={(e) => handlePasswordChange('password', e.target.value)} className="pr-10" />
                <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <Label className='pb-3'>Confirm Password</Label>
              <div className="relative">
                <Input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword ?? ''} placeholder="Confirm Password" onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)} className="pr-10" />
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
            <div><Label className='pb-3'>Address</Label><Input value={formData.address_1 ?? ''} onChange={(e) => setField('address_1', e.target.value)} /></div>
            <div>
              <Label className='pb-3'>Country</Label>
              <Select value={String(formData.country_id ?? '')} onValueChange={(v) => setField('country_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Country" /></SelectTrigger>
                <SelectContent>
                  {countries.map((c: any) => (
                    <SelectItem key={String(c.country_id ?? c.id ?? c.value)} value={String(c.country_id ?? c.id ?? c.value)}>{c.country_name ?? c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>State</Label>
              <Select value={String(formData.state_id ?? '')} onValueChange={(v) => setField('state_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
                <SelectContent>
                  {states.map((s: any) => (
                    <SelectItem key={String(s.state_id ?? s.id ?? s.value)} value={String(s.state_id ?? s.id ?? s.value)}>{s.state_name ?? s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>City</Label>
              <Select value={String(formData.city ?? '')} onValueChange={(v) => {
                setField('city', v);
                const match = districts.find((d: any) => String(d.district_id ?? d.id ?? d.value) === String(v));
                setField('city_name', match ? String(match.district_name ?? match.city_name ?? match.name ?? '') : '');
              }}>
                <SelectTrigger className="w-full"><SelectValue>{formData.city_name || 'Select City'}</SelectValue></SelectTrigger>
                <SelectContent className="max-h-48 overflow-auto">
                  {districts.map((d: any) => (
                    <SelectItem key={String(d.district_id ?? d.id ?? d.value)} value={String(d.district_id ?? d.id ?? d.value)}>{d.district_name ?? d.city_name ?? d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>Postal Code</Label>
              <Select value={String(formData.postal_code ?? '')} onValueChange={(v) => setField('postal_code', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Postal Code" /></SelectTrigger>
                <SelectContent className="max-h-48 overflow-auto">
                  <Input placeholder="Search Postal Code..." className="mb-2 p-1 w-full border rounded" onChange={(e) => setFilteredPostals(postals.filter(p => String(p.pincode).toLowerCase().includes(e.target.value.toLowerCase())))} />
                  {(filteredPostals.length ? filteredPostals : postals).map((p: any) => <SelectItem key={p.pincode ?? p.id} value={String(p.pincode ?? p.postal_code)}>{p.pincode ?? p.postal_code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className='pb-3'>Latitude</Label><Input value={formData.lat ?? ''} onChange={(e) => setField('lat', e.target.value)} /></div>
            <div><Label className='pb-3'>Longitude</Label><Input value={formData.lng ?? ''} onChange={(e) => setField('lng', e.target.value)} /></div>
          </div>
        </div>

        {/* Vendor Details Section */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <h2 className="text-lg font-medium">Vendor Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className='pb-3'>Company</Label>
              {effectiveCompany ? (
                <Select value={String(effectiveCompany)} disabled onValueChange={() => {}}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(effectiveCompany)}>
                      {companies.find(c => String(c.company_id) === String(effectiveCompany))?.name || detectedCompanyName || String(effectiveCompany)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={String(formData.company_id ?? '')} onValueChange={(v) => { setField('company_id', v); setField('vendor_id', ''); setField('supervisor_id', ''); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Company" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.company_id} value={c.company_id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className='pb-3'>Vendor</Label>
              <Select value={String(formData.vendor_id ?? '')} onValueChange={(v) => setField('vendor_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.filter(v => v.company_id === formData.company_id).map(v => <SelectItem key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>Region</Label>
              <Select value={String(formData.region_id ?? '')} onValueChange={(v) => setField('region_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Region" /></SelectTrigger>
                <SelectContent>
                  {regions.filter(r => !formData.company_id || String(r.company_id ?? r.company?.company_id ?? '') === String(formData.company_id))
                    .map(r => <SelectItem key={r.region_id ?? r.id} value={String(r.region_id ?? r.id)}>{r.region_name ?? r.name}</SelectItem>)}
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
              <Select value={String(formData.role_id ?? '')} onValueChange={(v) => setField('role_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Role" /></SelectTrigger>
                <SelectContent>{roles.map(r => <SelectItem key={r.role_id} value={r.role_id}>{r.role_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>Supervisor</Label>
              <Select value={String(formData.supervisor_id ?? '')} onValueChange={(v) => setField('supervisor_id', v)} disabled={!formData.company_id || users.length === 0}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Supervisor" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => {
                    const roleName = (u.role_name ?? u.role?.role_name ?? '').toLowerCase();
                    const isSupervisor = ['supervisor', 'supervisor / dispatcher'].includes(roleName);
                    const sameCompany = String(u.company_id ?? u.company?.company_id) === String(formData.company_id);
                    const sameVendor = !formData.vendor_id || String(u.vendor_id ?? u.vendor?.vendor_id) === String(formData.vendor_id);
                    return sameCompany && sameVendor || isSupervisor;
                  }).map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='pb-3'>Shift</Label>
              <Select value={String(formData.shift_id ?? '')} onValueChange={(v) => setField('shift_id', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(
                    // try to find in fetched shifts
                    (shifts.find((s: any) => String(s.shift_id ?? s.id ?? s.shiftId ?? '') === String(formData.shift_id))?.shift_name)
                    || (shifts.find((s: any) => String(s.shift_id ?? s.id ?? s.shiftId ?? '') === String(formData.shift_id))?.shiftName)
                    || (shifts.find((s: any) => String(s.shift_id ?? s.id ?? s.shiftId ?? '') === String(formData.shift_id))?.name)
                    // fallbacks from loaded user payload
                    || formData.shift_name
                    || (formData.shift && (formData.shift.shift_name || formData.shift.name))
                    || 'Select Shift'
                  )}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s: any) => {
                    const id = s.shift_id ?? s.id ?? s.shiftId ?? '';
                    const name = s.shift_name ?? s.shiftName ?? s.name ?? 'Shift';
                    return (<SelectItem key={String(id)} value={String(id)}>{name}</SelectItem>);
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Proof Section */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <h2 className="text-lg font-medium">Proof Document</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <input ref={proofInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
              <div><button type="button" onClick={() => proofInputRef.current?.click()} className="px-3 py-1 bg-white border rounded">Upload Proof</button></div>
              {proofFile && <p className="text-sm text-gray-600 mt-1">{proofFile.name}</p>}
            </div>
            {formData.proof && !proofFile && <div><a href={String(formData.proof)} target="_blank" className="text-blue-600 underline">View Existing Proof</a></div>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="destructive" onClick={() => router.push('/user')}>Cancel</Button>
          <Button onClick={handleSave} style={{ backgroundColor: primaryColor, color: '#fff' }}>{userId ? 'Update' : 'Save'}</Button>
        </div>
      </Card>
    </div>
  );
}
