'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';

// Type definitions to avoid using `any`
type VendorFormData = {
  vendor_name: string;
  photo: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  country_id: string;
  state_id: string;
  city_id: string;
  postal_code_id: string;
  lat: string;
  lng: string;
  address_1: string;
  company_id: string;
  role_id: string;
  region_id: string;
  status: boolean;
};

interface Company { company_id?: string; id?: string; name?: string; company_name?: string }
interface Country { country_id?: string; id?: string; country_name?: string; name?: string }
interface State { state_id?: string; id?: string; state_name?: string; name?: string }
interface City { city_id?: string; district_id?: string; id?: string; city_name?: string; district_name?: string; name?: string }
interface Postal { postal_code_id?: string; postal_code?: string; pincode?: string; code?: string; lat?: string; lng?: string; id?: string }
interface Role { role_id?: string; id?: string; role_name?: string; name?: string }
interface Region { region_id?: string; id?: string; region_name?: string; name?: string }

// Fallback endpoints: prefer districts and pincodes
const GET_DISTRICTS_URL = (URLS as any).GET_DISTRICTS ?? (URLS as any).GET_CITIES ?? '/settings/districts';
const GET_PINCODES_URL = (URLS as any).GET_PINCODES ?? (URLS as any).GET_POSTALS ?? '/settings/pincodes';
// Single pincode lookup (by code or id)
const GET_PINCODE_BY_CODE_URL = (URLS as any).GET_PINCODE_BY_CODE ?? '/settings/pincodes/{pincode}';

export default function VendorFormPage() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params?.vendorId as string | undefined;

  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor) || '#4F46E5';

  // typed reference data states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [postals, setPostals] = useState<Postal[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [formData, setFormData] = useState<VendorFormData>({
    vendor_name: '',
    photo: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country_id: '',
    state_id: '',
    city_id: '',
    postal_code_id: '',
    lat: '',
    lng: '',
    address_1: '',
    company_id: '',
    role_id: '',
    region_id: '',
    status: true,
  });

  const setField = (k: keyof VendorFormData, v: string | boolean) => setFormData((prev: VendorFormData) => ({ ...prev, [k]: v }));

  // normalize string for comparisons (handles numbers/strings, trims and lowercases)
  const norm = (v: unknown) => String(v ?? '').toLowerCase().trim();
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  // Helper to fetch a single pincode record. Tries path-based endpoint first, then falls back to querying the pincodes list (?pincode=) if the path fails (e.g. 400).
  const fetchSinglePincode = async (rawPostal: string): Promise<Postal | null> => {
    if (!rawPostal) return null;
    const template = GET_PINCODE_BY_CODE_URL;
    // If the value is numeric-only (e.g. '626125'), the backend path endpoint may expect a UUID and return 400.
    // Detect numeric-only and avoid calling the path endpoint in that case — directly query the list instead.
    const isNumericOnly = /^\d+$/.test(rawPostal);
    const looksLikeUuid = uuidRegex.test(rawPostal);
    const looksLikePathSafe = looksLikeUuid || /[a-zA-Z\-]/.test(rawPostal);
    try {
      if (looksLikePathSafe && !isNumericOnly) {
        const singleUrl = template.replace('{pincode}', encodeURIComponent(rawPostal));
        const sRes = await api.get(singleUrl);
        return sRes.data?.data ?? sRes.data ?? null;
      }
    } catch {
      // fallthrough to query-based lookup
    }
    // Query-based lookup on the pincodes list
    try {
      const queryKeys = ['pincode', 'postal_code', 'code', 'postalcode', 'postal'];
      for (const key of queryKeys) {
        try {
          const qRes = await api.get(GET_PINCODES_URL + `?${key}=${encodeURIComponent(rawPostal)}`);
          const arr = qRes.data?.data ?? qRes.data ?? [];
          if (Array.isArray(arr) && arr.length) return arr[0] as Postal;
          if (arr && !Array.isArray(arr)) return arr as Postal;
        } catch {
          // ignore and try next key
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  // Load reference data
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [companiesRes, countriesRes, rolesRes, regionsRes] = await Promise.all([
          api.get(URLS.GET_COMPANIES).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_COUNTRIES).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_ROLES).catch(() => ({ data: { data: [] } })),
          api.get(URLS.GET_REGION).catch(() => ({ data: { data: [] } })),
        ]);

        setCompanies(companiesRes.data?.data ?? []);
        setCountries(countriesRes.data?.data ?? []);
        setRoles(rolesRes.data?.data ?? []);
        setRegions(regionsRes.data?.data ?? []);
      } catch {
        setCompanies([]);
        setCountries([]);
        setRoles([]);
        setRegions([]);
      }
    };
    loadRefs();
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (!formData.country_id) {
      setStates([]);
      setFormData(prev => ({ ...prev, state_id: '', city_id: '', postal_code_id: '' }));
      return;
    }
    const loadStates = async () => {
      try {
        const res = await api.get(URLS.GET_STATES + `?country_id=${formData.country_id}`);
        setStates(res.data?.data ?? []);
      } catch {
        setStates([]);
      }
    };
    loadStates();
  }, [formData.country_id]);

  // Load cities when state changes
  useEffect(() => {
    if (!formData.state_id) {
      setCities([]);
      setFormData(prev => ({ ...prev, city_id: '', postal_code_id: '' }));
      return;
    }
    const loadCities = async () => {
      try {
        // treat this as districts list
        const res = await api.get(GET_DISTRICTS_URL + `?state_id=${formData.state_id}`);
        setCities(res.data?.data ?? []);
      } catch {
        setCities([]);
      }
    };
    loadCities();
  }, [formData.state_id]);

  // Load postal codes when city changes
  useEffect(() => {
    if (!formData.city_id) {
      setPostals([]);
      setFormData(prev => ({ ...prev, postal_code_id: '' }));
      setFormData(prev => ({ ...prev, lat: '', lng: '' }));
      return;
    }
    const loadPostals = async () => {
      try {
        // Determine district id to use for the pincodes API. The form value may be an id or a name.
        const cityVal = String(formData.city_id ?? '').trim();
        let districtParam = '';
        if (uuidRegex.test(cityVal)) {
          districtParam = cityVal;
        } else {
          // try to resolve name to an id from the loaded cities/districts list
          const found = cities.find((c: City) => {
            return norm(c.city_id) === norm(cityVal) || norm(c.district_id) === norm(cityVal) || norm(c.city_name) === norm(cityVal) || norm(c.district_name) === norm(cityVal) || norm(c.name) === norm(cityVal);
          });
          if (found) districtParam = String((found as City).district_id ?? (found as City).city_id ?? (found as City).id ?? '');
        }

        if (!districtParam) {
          // cannot resolve district id, clear postals and lat/lng
          setPostals([]);
          setFormData(prev => ({ ...prev, postal_code_id: '', lat: '', lng: '' }));
          return;
        }

        // fetch pincodes using resolved district id
        const res = await api.get(GET_PINCODES_URL + `?district_id=${encodeURIComponent(districtParam)}`);
        const fetched = res.data?.data ?? [];
        setPostals(fetched as Postal[]);
        // If a postal is already selected, populate lat/lng
        if (formData.postal_code_id) {
          const sel = fetched.find((p: Postal) => norm(p.postal_code_id) === norm(formData.postal_code_id) || norm(p.postal_code) === norm(formData.postal_code_id) || norm(p.pincode) === norm(formData.postal_code_id));
          if (sel) {
            const canonical = String(sel.postal_code_id ?? sel.id ?? sel.pincode ?? '');
            setFormData(prev => ({ ...prev, postal_code_id: canonical, lat: sel.lat ?? '', lng: sel.lng ?? '' }));
          } else {
            // try fetching single pincode by code/id to populate lat/lng
            try {
              const rawPostal = String(formData.postal_code_id ?? '').trim();
              if (rawPostal) {
                const single = await fetchSinglePincode(rawPostal);
                if (single) {
                  // append to postals if not present
                  setPostals(prev => {
                    const exists = prev.find((p: Postal) => norm(p.postal_code_id) === norm(single.postal_code_id) || norm(p.postal_code) === norm(single.postal_code) || norm(p.pincode) === norm(single.pincode));
                    if (exists) return prev;
                    return [...prev, single];
                  });
                  setFormData(prev => ({ ...prev, lat: single.lat ?? '', lng: single.lng ?? '' }));
                } else {
                  setFormData(prev => ({ ...prev, lat: '', lng: '' }));
                }
              } else {
                setFormData(prev => ({ ...prev, lat: '', lng: '' }));
              }
            } catch {
              setFormData(prev => ({ ...prev, lat: '', lng: '' }));
            }
          }
        } else {
          setFormData(prev => ({ ...prev, lat: '', lng: '' }));
        }
      } catch {
        setPostals([]);
        setFormData(prev => ({ ...prev, lat: '', lng: '' }));
      }
    };
    loadPostals();
  }, [formData.city_id]);

  // When user selects a pincode, update lat/lng from loaded pincodes
  useEffect(() => {
    if (!formData.postal_code_id) {
      setFormData(prev => ({ ...prev, lat: '', lng: '' }));
      return;
    }
    const sel = postals.find((p: Postal) => norm(p.postal_code_id) === norm(formData.postal_code_id) || norm(p.postal_code) === norm(formData.postal_code_id) || norm(p.pincode) === norm(formData.postal_code_id));
    if (sel) {
      const canonical = String(sel.postal_code_id ?? sel.id ?? sel.pincode ?? '');
      setFormData(prev => ({ ...prev, postal_code_id: canonical, lat: sel.lat ?? '', lng: sel.lng ?? '' }));
      return;
    }

    // If not found in loaded postals, fetch single pincode to populate lat/lng
    (async () => {
      try {
        const rawPostal = String(formData.postal_code_id ?? '').trim();
        if (!rawPostal) return;
        const single = await fetchSinglePincode(rawPostal);
        if (single) {
          setPostals(prev => {
            const exists = prev.find((p: Postal) => norm(p.postal_code_id) === norm(single.postal_code_id) || norm(p.postal_code) === norm(single.postal_code) || norm(p.pincode) === norm(single.pincode));
            if (exists) return prev;
            return [...prev, single];
          });
          const canonical = String(single.postal_code_id ?? single.id ?? single.pincode ?? '');
          setFormData(prev => ({ ...prev, postal_code_id: canonical, lat: single.lat ?? '', lng: single.lng ?? '' }));
        }
      } catch (err) {
        // ignore failure
      }
    })();
  }, [formData.postal_code_id, postals]);

  // Load vendor data for edit
  useEffect(() => {
    if (!vendorId) return;

    const fetchVendor = async () => {
      try {
        const res = await api.get(URLS.GET_VENDOR_BY_ID.replace('{id}', vendorId));
        const data = res.data?.data ?? res.data;
        if (data) {
          // derive vendor district/city and postal values from multiple possible response fields
          const vendorCityVal = data.city_id ?? data.district_id ?? data.city ?? data.district ?? '';
          const vendorPostalVal = data.postal_code_id ?? data.postal_code ?? data.pincode ?? '';

          setFormData(prev => ({
            ...prev,
            ...data,
            password: '',
            confirmPassword: '',
            country_id: data.country_id ? String(data.country_id) : '',
            state_id: data.state_id ? String(data.state_id) : '',
            city_id: vendorCityVal ? String(vendorCityVal) : '',
            postal_code_id: vendorPostalVal ? String(vendorPostalVal) : '',
            company_id: data.company_id ? String(data.company_id) : '',
            role_id: data.role_id ? String(data.role_id) : '',
            region_id: data.region_id ? String(data.region_id) : '',
          } as VendorFormData));
          setPhotoFile(null);

          // Load dependent dropdown lists so the selects show the current values
          try {
            if (data.country_id) {
              const sRes = await api.get(URLS.GET_STATES + `?country_id=${data.country_id}`);
              setStates(sRes.data?.data ?? []);
            }
            if (data.state_id) {
              const cRes = await api.get(GET_DISTRICTS_URL + `?state_id=${data.state_id}`);
              const districtsFetched = cRes.data?.data ?? [];
              setCities(districtsFetched);

              // If vendor provided a district name (not id), resolve it to the district id so select shows it
              let resolvedDistrictId = '';
              if (vendorCityVal) {
                const match = districtsFetched.find((d: City) => {
                  return norm(d.district_id) === norm(vendorCityVal) || norm(d.id) === norm(vendorCityVal) || norm(d.district_name) === norm(vendorCityVal) || norm(d.name) === norm(vendorCityVal);
                });
                if (match) {
                  resolvedDistrictId = String(match.district_id ?? match.id);
                  setFormData(prev => ({ ...prev, city_id: resolvedDistrictId }));
                }
              }

              // If vendor provided city_id directly (already an ID), use it as resolvedDistrictId
              if (!resolvedDistrictId && data.city_id) {
                resolvedDistrictId = String(data.city_id);
              }

              // If we have a resolved district id, fetch pincodes for it
              if (resolvedDistrictId) {
                try {
                  const pRes2 = await api.get(GET_PINCODES_URL + `?district_id=${resolvedDistrictId}`);
                  const fetched2 = pRes2.data?.data ?? [];
                  setPostals(fetched2 as Postal[]);

                  // If vendor provided a postal/pincode value, resolve it to postal_code_id
                  if (vendorPostalVal) {
                    const postalMatch = fetched2.find((p: Postal) => {
                      return norm(p.postal_code_id) === norm(vendorPostalVal) || norm(p.postal_code) === norm(vendorPostalVal) || norm(p.pincode) === norm(vendorPostalVal);
                    });
                    if (postalMatch) {
                      const pid = String((postalMatch as Postal).postal_code_id ?? (postalMatch as Postal).id ?? (postalMatch as Postal).pincode);
                      setFormData(prev => ({ ...prev, postal_code_id: pid, lat: (postalMatch as Postal).lat ?? '', lng: (postalMatch as Postal).lng ?? '' }));
                    }
                  } else if (data.postal_code_id) {
                    const postalMatch = fetched2.find((p: Postal) => {
                      return norm(p.postal_code_id) === norm(data.postal_code_id) || norm(p.postal_code) === norm(data.postal_code_id) || norm(p.pincode) === norm(data.postal_code_id);
                    });
                    if (postalMatch) {
                      const pid = String((postalMatch as Postal).postal_code_id ?? (postalMatch as Postal).id ?? (postalMatch as Postal).pincode);
                      setFormData(prev => ({ ...prev, postal_code_id: pid, lat: (postalMatch as Postal).lat ?? '', lng: (postalMatch as Postal).lng ?? '' }));
                    }
                  }
                } catch (err) {
                  // ignore pincode fetch failure here
                }
              }
            }
            if (data.city_id) {
              const pRes = await api.get(GET_PINCODES_URL + `?district_id=${data.city_id}`);
              const fetched = pRes.data?.data ?? [];
              setPostals(fetched as Postal[]);
              // set lat/lng from vendor data if present, otherwise from matching pincode
              if (data.lat || data.lng) {
                setFormData(prev => ({ ...prev, lat: String(data.lat ?? ''), lng: String(data.lng ?? '') }));
              } else if (data.postal_code_id) {
                const sel = fetched.find((p: Postal) => norm(p.postal_code_id) === norm(data.postal_code_id) || norm(p.postal_code) === norm(data.postal_code_id) || norm(p.pincode) === norm(data.postal_code_id));
                if (sel) setFormData(prev => ({ ...prev, lat: sel.lat ?? '', lng: sel.lng ?? '' }));
              }
            }
          } catch (err) {
            console.error('Failed to load dependent location lists for vendor edit', err);
          }
        }
      } catch (error) {
        console.error('Failed to fetch vendor:', error);
        toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || (error as Error).message || 'Failed to load vendor data.');
      }
    };
    fetchVendor();
  }, [vendorId]);

  const handleSave = async () => {
    if (!formData.vendor_name) return toast.error('Vendor name is required.');
    if (!formData.email) return toast.error('Email is required.');
    if (!formData.phone) return toast.error('Phone is required.');
    if (formData.password && formData.password !== formData.confirmPassword)
      return toast.error('Passwords do not match.');
    if (!formData.company_id) return toast.error('Company selection is required.');
    if (!formData.role_id) return toast.error('Role is required.');
    if (!formData.region_id) return toast.error('Region is required.');
    if (!formData.country_id) return toast.error('Country is required.');
    if (!formData.state_id) return toast.error('State is required.');
    // city may be provided as a district_id (UUID) or as a string; we don't require city_id here
    if (!formData.postal_code_id) return toast.error('Postal Code is required.');

    try {
      const hasFile = !!photoFile;
      // prepare payload and ensure city_id/postal_code_id are valid IDs
      const payloadPrep: Record<string, unknown> = { ...formData };
      // city_id may actually be a name; try resolve against cities (districts) list
      // resolve district selection to a city string for API (send 'city' instead of district id)
      let cityName = '';
      const rawCityVal = formData.city_id ?? '';
      if (rawCityVal) {
        // try matching by id or name
        const matched = cities.find((c: City) => norm(c.city_id) === norm(rawCityVal) || norm(c.district_id) === norm(rawCityVal) || norm(c.city_name) === norm(rawCityVal) || norm(c.district_name) === norm(rawCityVal) || norm(c.name) === norm(rawCityVal));
        if (matched) {
          cityName = (matched as any).district_name ?? (matched as any).city_name ?? (matched as any).name ?? '';
        } else if (typeof rawCityVal === 'string') {
          cityName = String(rawCityVal);
        }
      }
      if (cityName) {
        payloadPrep.city = cityName;
      }
      // remove city_id from payload to avoid sending null/ids; API expects 'city' string
      delete payloadPrep.city_id;

      // postal_code_id may be name/number; try resolve
      const rawPostal = String(formData.postal_code_id ?? '').trim();
      if (rawPostal) {
        if (uuidRegex.test(rawPostal)) {
          payloadPrep.postal_code_id = rawPostal;
          // also try to set postal_code string if we have it in loaded list
          const localMatch = postals.find((p: Postal) => norm(p.postal_code_id) === norm(rawPostal) || norm(p.id) === norm(rawPostal));
          if (localMatch) payloadPrep.postal_code = localMatch.postal_code ?? (localMatch as any).pincode ?? '';
        } else {
          const matchedP = postals.find((p: Postal) => norm(p.postal_code_id) === norm(rawPostal) || norm(p.postal_code) === norm(rawPostal) || norm(p.pincode) === norm(rawPostal) || norm(p.id) === norm(rawPostal));
          if (matchedP) {
            payloadPrep.postal_code_id = String((matchedP as Postal).postal_code_id ?? (matchedP as Postal).id ?? (matchedP as Postal).pincode);
            payloadPrep.lat = (matchedP as Postal).lat ?? (payloadPrep.lat as string);
            payloadPrep.lng = (matchedP as Postal).lng ?? (payloadPrep.lng as string);
            // include pincode string as well for backend compatibility
            payloadPrep.postal_code = (matchedP as Postal).postal_code ?? (matchedP as Postal).pincode ?? '';
          } else {
            // Try fetching the single pincode (may not be in loaded list yet)
            try {
              const single = await fetchSinglePincode(rawPostal);
              if (single) {
                payloadPrep.postal_code_id = String(single.postal_code_id ?? single.id ?? single.pincode);
                payloadPrep.lat = single.lat ?? (payloadPrep.lat as string | undefined);
                payloadPrep.lng = single.lng ?? (payloadPrep.lng as string | undefined);
                // ensure UI list contains it
                setPostals(prev => {
                  const exists = prev.find((p: Postal) => norm(p.postal_code_id) === norm(single.postal_code_id) || norm(p.postal_code) === norm(single.postal_code) || norm(p.pincode) === norm(single.pincode));
                  if (exists) return prev;
                  return [...prev, single];
                });
                // include pincode string as well for backend compatibility
                payloadPrep.postal_code = single.postal_code ?? single.pincode ?? '';
              } else {
                payloadPrep.postal_code = rawPostal;
                delete payloadPrep.postal_code_id;
              }
            } catch {
              payloadPrep.postal_code = rawPostal;
              delete payloadPrep.postal_code_id;
            }
          }
        }
      } else {
        delete payloadPrep.postal_code_id;
      }

      // Ensure canonical postal_code_id is set (resolve non-UUID values just in case)
      if (payloadPrep.postal_code_id && !uuidRegex.test(String(payloadPrep.postal_code_id))) {
        const candidate = String(payloadPrep.postal_code_id);
        const matched = postals.find((p: Postal) => norm(p.postal_code_id) === norm(candidate) || norm(p.postal_code) === norm(candidate) || norm(p.pincode) === norm(candidate) || norm(p.id) === norm(candidate));
        if (matched) {
          payloadPrep.postal_code_id = String(matched.postal_code_id ?? matched.id ?? matched.pincode);
          payloadPrep.lat = matched.lat ?? (payloadPrep.lat as string | undefined);
          payloadPrep.lng = matched.lng ?? (payloadPrep.lng as string | undefined);
          // include pincode string too
          payloadPrep.postal_code = matched.postal_code ?? matched.pincode ?? '';
        } else {
          try {
            const single = await fetchSinglePincode(candidate);
            if (single) {
              payloadPrep.postal_code_id = String(single.postal_code_id ?? single.id ?? single.pincode);
              payloadPrep.lat = single.lat ?? (payloadPrep.lat as string | undefined);
              payloadPrep.lng = single.lng ?? (payloadPrep.lng as string | undefined);
              setPostals(prev => {
                const exists = prev.find((p: Postal) => norm(p.postal_code_id) === norm(single.postal_code_id) || norm(p.postal_code) === norm(single.postal_code) || norm(p.pincode) === norm(single.pincode));
                if (exists) return prev;
                return [...prev, single];
              });
              payloadPrep.postal_code = single.postal_code ?? single.pincode ?? '';
            }
          } catch {
            // ignore
          }
        }
      }

      // Final note: we intentionally send both postal_code_id and postal_code for compatibility

      if (hasFile) {
        const form = new FormData();
        Object.entries(payloadPrep).forEach(([k, v]) => {
          if (['confirmPassword'].includes(k)) return;
          if (v === '' || v === null || v === undefined) return;
          // append values as strings for simplicity; files are handled separately below
          form.append(k, String(v));
        });
        if (photoFile) form.append('photo', photoFile);

        // DEBUG: log FormData entries
        try {
          console.debug('DEBUG: sending multipart FormData (keys):', Array.from(form.keys()));
        } catch {
          /* ignore debug failures */
        }

        const endpoint = (URLS.UPDATE_VENDOR as string).replace('{id}', vendorId ?? '');
        await api.put(endpoint, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const payload = { ...payloadPrep };
        delete (payload as Record<string, unknown>).confirmPassword;

        // DEBUG: log JSON payload
        try {
          console.debug('DEBUG: update JSON payload', payload);
        } catch {
          /* ignore */
        }

        const endpoint = (URLS.UPDATE_VENDOR as string).replace('{id}', vendorId ?? '');
        await api.put(endpoint, payload);
      }

      toast.success('Vendor saved successfully!');
      router.push('/vendor');
    } catch (error) {
      console.error(error);
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || (error as Error).message || 'Failed to save vendor.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{vendorId ? 'Edit Vendor' : 'Create Vendor'}</h1>
      <Card className="p-6 space-y-8">
        <h2 className="text-lg font-semibold">Vendor & Password Details</h2>
        {/* Photo Section */}
      <div>
  <Label className="pb-3 block">Vendor Photo</Label>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    {/* ✅ Column 1 — Upload Box */}
    <div
      className="flex items-center gap-4 mt-2"
      role="button"
      tabIndex={0}
      onClick={() => photoInputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') photoInputRef.current?.click(); }}
      style={{
        border: '3px dotted #b1b1b1',
        borderRadius: '15px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        alignItems: 'center',
      }}
    >
      {photoFile ? (
        <img
          src={URL.createObjectURL(photoFile)}
          alt="Photo"
          className="w-32 h-32 object-contain border rounded-lg"
        />
      ) : formData.photo ? (
        <img
          src={getImageUrl(formData.photo)}
          alt="Photo"
          className="w-32 h-32 object-contain border rounded-lg"
        />
      ) : (
        <div className="w-32 h-32 flex items-center justify-center text-gray-400 border border-dashed rounded-lg">
          No Photo
        </div>
      )}

      {/* hidden native file input triggered by clicking area or button */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
      <div className="ml-3">
        <button type="button" onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }} className="px-3 py-1 bg-white border rounded">
          Upload Photo
        </button>
      </div>
     </div>

    {/* ✅ Column 2 — Empty */}
    <div></div>

  </div>
</div>


        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className='pb-3'>Vendor Name</Label><Input value={formData.vendor_name} onChange={(e) => setField('vendor_name', e.target.value)} /></div>

          <div>
            <Label className='pb-3'>Company</Label>
            <Select value={String(formData.company_id)} onValueChange={(v) => setField('company_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Company" /></SelectTrigger>
              <SelectContent>{companies.map((c: Company, idx: number) => <SelectItem key={c.company_id ?? c.id ?? `company-${idx}`} value={String(c.company_id ?? c.id)}>{c.name ?? c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><Label className='pb-3'>Email</Label><Input type="email" value={formData.email} onChange={(e) => setField('email', e.target.value)} /></div>
          <div><Label className='pb-3'>Phone</Label><Input value={formData.phone} onChange={(e) => setField('phone', e.target.value)} /></div>

          {/* Password */}
          <div>
            <Label className='pb-3'>Password</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handlePasswordChange('password', e.target.value)} className="pr-10" />
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500" onClick={() => setShowPassword(p => !p)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <div>
            <Label className='pb-3'>Confirm Password</Label>
            <div className="relative">
              <Input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)} className="pr-10" />
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500" onClick={() => setShowConfirmPassword(p => !p)}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
          </div>
        </div>
        <h2 className="text-lg font-semibold">Location & Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        

          {/* Cascading Dropdowns */}
          <div>
            <Label className='pb-3'>Country</Label>
            <Select value={String(formData.country_id)} onValueChange={(v) => setField('country_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Country" /></SelectTrigger>
              <SelectContent>{countries.map((c: Country, idx: number) => <SelectItem key={c.country_id ?? c.id ?? `country-${idx}`} value={String(c.country_id ?? c.id)}>{c.country_name ?? c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className='pb-3'>State / Province</Label>
            <Select value={String(formData.state_id)} onValueChange={(v) => setField('state_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select State" /></SelectTrigger>
              <SelectContent>{states.map((s: State, idx: number) => <SelectItem key={s.state_id ?? s.id ?? `state-${idx}`} value={String(s.state_id ?? s.id)}>{s.state_name ?? s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className='pb-3'>District</Label>
            <Select value={String(formData.city_id)} onValueChange={(v) => setField('city_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select District" /></SelectTrigger>
              <SelectContent>{cities.map((c: City, idx: number) => <SelectItem key={c.city_id ?? c.district_id ?? c.id ?? `district-${idx}`} value={String(c.city_id ?? c.district_id ?? c.id)}>{c.city_name ?? c.district_name ?? c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className='pb-3'>Pincode</Label>
            <Select value={String(formData.postal_code_id)} onValueChange={(v) => setField('postal_code_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Pincode" /></SelectTrigger>
              <SelectContent>{postals.map((p: Postal, idx: number) => <SelectItem key={p.postal_code_id ?? p.id ?? `postal-${idx}`} value={String(p.postal_code_id ?? p.id ?? p.pincode)}>{p.postal_code ?? p.code ?? p.pincode}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><Label className='pb-3'>Latitude</Label><Input value={formData.lat} disabled /></div>
          <div><Label className='pb-3'>Longitude</Label><Input value={formData.lng} disabled /></div>

          <div className="md:col-span-2"><Label>Address</Label><Input value={formData.address_1} onChange={(e) => setField('address_1', e.target.value)} /></div>
        </div>

         <h2 className="text-lg font-semibold">Role & Region</h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Role & Region */}
          <div>
            <Label className='pb-3'>Role</Label>
            <Select value={String(formData.role_id)} onValueChange={(v) => setField('role_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Role" /></SelectTrigger>
              <SelectContent>{roles.map((r: Role, idx: number) => <SelectItem key={String(r.role_id ?? r.id ?? `role-${idx}`)} value={String(r.role_id ?? r.id)}>{r.role_name ?? r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className='pb-3'>Region</Label>
            <Select value={String(formData.region_id)} onValueChange={(v) => setField('region_id', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Region" /></SelectTrigger>
              <SelectContent>{regions.map((r: Region, idx: number) => <SelectItem key={String(r.region_id ?? r.id ?? `region-${idx}`)} value={String(r.region_id ?? r.id)}>{r.region_name ?? r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
</div>
        {/* Status Toggle */}
        <div className="flex items-center gap-3 mt-4">
          <button type="button" onClick={() => setField('status', !formData.status)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.status ? 'bg-green-600' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.status ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-medium">{formData.status ? 'Active' : 'Inactive'}</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="destructive" onClick={() => router.push('/vendor')}>Cancel</Button>
          <Button style={{ backgroundColor: primaryColor, color: '#fff' }} onClick={handleSave}>{vendorId ? 'Update' : 'Save'}</Button>
        </div>
      </Card>
    </div>
  );
}
