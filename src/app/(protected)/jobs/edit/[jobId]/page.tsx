'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { BadgeCheck, Loader2, Phone, Mail } from 'lucide-react';
import Image from 'next/image';

import DatePickerWithInput from '@/app/components/DatePickerWithInput';

import api from '@/utils/api';
import { URLS } from '@/utils/urls';
import JobStatusSelector from '../../components/JobStatusSelector';
import { toast } from 'sonner';

// typed URL map to allow optional endpoints not present on the URLS type
const urlMap = URLS as Record<string, string | undefined>;

/** ---------------- Helpers ---------------- */
const nowTimeStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const mergeDateAndTime = (date: Date, time: string) => {
  const [hh = '00', mm = '00', ss = '00'] = time.split(':');
  const merged = new Date(date);
  merged.setHours(Number(hh) || 0, Number(mm) || 0, Number(ss) || 0, 0);
  return merged;
};

const clampNumStr = (val: string, min: number, max: number) => {
  const n = Number(val);
  if (Number.isNaN(n)) return String(min);
  return String(Math.min(max, Math.max(min, Math.trunc(n))));
};

// Format a Date to 12-hour with uppercase AM/PM
const fmtDateTime12 = (d?: Date | null) => {
  if (!d) return '-';
  const s = d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return s.replace(/\bam\b/i, 'AM').replace(/\bpm\b/i, 'PM');
};

/** ---------------- Types ---------------- */
type Option = { value: string; label: string };
type NatureItem = { id: string; name: string };

interface ClientBE {
  client_id: string | number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address_1?: string;
  city?: string;
  postal_code?: string;
}

interface WorkTypeBE {
  worktype_id: string | number;
  worktype_name?: string;
  status?: boolean;
}

interface JobTypeBE {
  jobtype_id: string | number;
  jobtype_name?: string;
  worktype_id?: string | number;
  status?: boolean;
}

interface NatureOfWorkBE {
  now_id: string | number;
  now_name?: string;
  now_status?: boolean;
}

interface RoleBE {
  role_id: string | number;
  role_slug?: string;
}

interface UserBE {
  user_id: string | number;
  name?: string;
  email?: string;
  phone?: string;
  role_id?: string | number;
  assigned_jobs?: number;
  can_assign?: boolean;
  available_slots?: number;
  available_time_label?: string;
}

interface JobStatusBE {
  job_status_id: string;
  job_status_title: string;
  job_status_color_code?: string;
  status?: boolean;
}

interface ApiEnvelope<T> {
  data?: T;
}

type Technician = {
  user_id: string;
  name: string;
  assigned_jobs: number;
  can_assign: boolean;
  available_time_label: string;
};

type CSSVars = React.CSSProperties & { ['--primary']?: string };

type JobDetails = {
  job_id: string;
  company_id: string;
  client_id: string;
  reference_number?: string;
  worktype_id?: string;
  jobtype_id?: string;
  job_description?: string;
  job_photo?: string;
  estimated_duration?: number; // total mins fallback
  estimated_days?: number;
  estimated_hours?: number;
  estimated_minutes?: number;
  scheduledDateAndTime?: string;
  supervisor_id?: string;
  now_id?: string;
  technician_id?: string;
  job_status_id?: string;

  client?: ClientBE;
  technician?: UserBE;
  supervisor?: UserBE;
  work_type?: WorkTypeBE;
  job_type?: JobTypeBE;
  nature_of_work?: NatureOfWorkBE;
  job_status?: JobStatusBE;
};

type FormData = {
  companyId: string;
  client: string;
  referenceNumber: string;
  workType: string;
  jobType: string;
  jobDescription: string;
  scheduleDate: Date | null;
  scheduleTime: string;
  supervisor: string;
  natureOfWork: string;
  durationDays: string;
  durationHours: string; // ≤ 24
  durationMinutes: string; // ≤ 59
  technician: string;
  jobStatusId: string;
};

type StatusHistoryItem = {
  id: string;
  job_status_id: string;
  job_status_title: string;
  job_status_color_code?: string;
  is_completed?: boolean;
  remarks?: string | null;
  completed?: boolean;
  at: string; // ISO
};

/** ---------------- Component ---------------- */
export default function EditJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor);

  // Safe localStorage read for currentUser
  const [currentUser] = useState<any>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const roleSlug = (currentUser?.role?.slug || '').toLowerCase();
  const isSuperAdmin = roleSlug === 'super_admin';
  const isSupervisorUser =
    roleSlug === 'supervisor' || roleSlug === 'company_admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');

  // dropdown sources
  const [companyOpts, setCompanyOpts] = useState<Option[]>([]);
  const [clientOpts, setClientOpts] = useState<Option[]>([]);
  const [workTypeOpts, setWorkTypeOpts] = useState<Option[]>([]);
  const [jobTypeOpts, setJobTypeOpts] = useState<Option[]>([]);
  const [supervisorOpts, setSupervisorOpts] = useState<Option[]>([]);
  const [supervisorRoleId, setSupervisorRoleId] = useState<string | null>(null);
  const [supervisorsLoaded, setSupervisorsLoaded] = useState(false);
  const [natureList, setNatureList] = useState<NatureItem[]>([]);
  const [jobStatusOpts, setJobStatusOpts] = useState<
    { value: string; label: string; color?: string }[]
  >([]);
  const [currentStatusLabel, setCurrentStatusLabel] = useState<string>('');

  const [jobTypeLoading, setJobTypeLoading] = useState(false);

  // technician search table
  const [techLoading, setTechLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [hasSearchedTechs, setHasSearchedTechs] = useState(false);
  const [selectedTechDetails, setSelectedTechDetails] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  } | null>(null);

  // Available actions from backend for the current job status
  const [availableActions, setAvailableActions] = useState<
    JobStatusBE[] | null
  >(null);

  // prefill form
  const [formData, setFormData] = useState<FormData>({
    companyId: '',
    client: '',
    referenceNumber: '',
    workType: '',
    jobType: '',
    jobDescription: '',
    scheduleDate: new Date(),
    scheduleTime: nowTimeStr(),
    supervisor: '',
    natureOfWork: '',
    durationDays: '',
    durationHours: '0',
    durationMinutes: '0',
    technician: '',
    jobStatusId: '',
  });

  const [jobPhotoUrl, setJobPhotoUrl] = useState<string>('');
  const [jobPhotoFile, setJobPhotoFile] = useState<File | null>(null);
  const [jobPhotoPreview, setJobPhotoPreview] = useState<string | null>(null);
  const [jobPhotoRemoved, setJobPhotoRemoved] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState('');
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);

  useEffect(() => {
    if (jobPhotoFile) {
      const previewUrl = URL.createObjectURL(jobPhotoFile);
      setJobPhotoPreview(previewUrl);
      return () => {
        URL.revokeObjectURL(previewUrl);
      };
    }
    setJobPhotoPreview(jobPhotoUrl || null);
  }, [jobPhotoFile, jobPhotoUrl]);

  // -------- Status helpers & read-only rules --------
  const normalize = (s: string) =>
    (s || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  const canonicalKey = (s: string) => {
    const n = normalize(s).replace(/\s+/g, '');
    if (n.includes('notstarted') || n === 'new' || n.includes('pending'))
      return 'not_started';
    if (n.includes('approved') || n.includes('approve')) return 'approved';
    if (
      n.includes('assignedtechnician') ||
      n.includes('assignedtech') ||
      n === 'assigned'
    )
      return 'assigned';
    if (n.includes('enroute') || n.includes('enrout')) return 'enroute';
    if (n.includes('onsite') || n.includes('onsit') || n.includes('on-site'))
      return 'onsite';
    // On hold variants: "On Hold", "Hold", "Paused", "Pause"
    if (
      n.includes('onhold') ||
      n.includes('hold') ||
      n.includes('paused') ||
      n.includes('pause')
    )
      return 'onhold';
    // Resume variants & synonyms: Resume/Resumed, Continue, Reopen, Unhold, Release Hold, Remove Hold
    if (
      n.includes('resume') ||
      n.includes('resum') ||
      n.includes('continue') ||
      n.includes('reopen') ||
      n.includes('unhold') ||
      (n.includes('release') && n.includes('hold')) ||
      (n.includes('remove') && n.includes('hold'))
    )
      return 'resume';
    if (n.includes('completed') || n === 'done') return 'completed';
    if (n.includes('rejected')) return 'rejected';
    if (n.includes('unresolved')) return 'unresolved';
    if (
      n.includes('waitingforapproval') ||
      (n.includes('waiting') && n.includes('approval'))
    )
      return 'waiting_for_approval';
    return n || '';
  };

  const currentStatusTitle = useMemo(() => {
    if (currentStatusLabel) return currentStatusLabel;
    const cur = jobStatusOpts.find(
      (s) => String(s.value) === String(formData.jobStatusId)
    );
    return cur?.label || '';
  }, [currentStatusLabel, jobStatusOpts, formData.jobStatusId]);

  const currentStatusKey = useMemo(
    () => canonicalKey(currentStatusTitle),
    [currentStatusTitle]
  );

  const isTerminalStatus = useMemo(
    () =>
      ['completed', 'rejected', 'unresolved'].includes(currentStatusKey || ''),
    [currentStatusKey]
  );

  const formDisabled = isTerminalStatus; // prevent editing on terminal statuses

  const handleChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onBlurHours = () =>
    setFormData((p) => ({
      ...p,
      durationHours: clampNumStr(p.durationHours, 0, 24),
    }));

  const onBlurMinutes = () =>
    setFormData((p) => ({
      ...p,
      durationMinutes: clampNumStr(p.durationMinutes, 0, 59),
    }));

  const triggerPhotoPicker = () => {
    if (formDisabled) return;
    photoInputRef.current?.click();
  };

  const onPhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setJobPhotoFile(file);
      setJobPhotoRemoved(false);
    }
    // allow selecting the same file twice
    event.target.value = '';
  };

  const onRemovePhoto = () => {
    if (jobPhotoFile) {
      setJobPhotoFile(null);
      return;
    }
    if (jobPhotoUrl) {
      setJobPhotoUrl('');
      setJobPhotoRemoved(true);
    }
  };

  /** --------- Load companies (super_admin) --------- */
  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<
          ApiEnvelope<
            {
              company_id: string | number;
              company_name?: string;
              name?: string;
            }[]
          >
        >((URLS as any).GET_COMPANIES ?? '/companies', {
          params: { limit: 500 },
        });
        if (cancelled) return;
        const companies = res.data?.data ?? [];
        setCompanyOpts(
          companies.map((c) => ({
            value: String(c.company_id),
            label: String(c.company_name ?? c.name ?? c.company_id),
          }))
        );
      } catch (e) {
        console.error('Failed to load companies', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  /** --------- Load job statuses (masters/job-statuses) --------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const endpoint =
          (URLS as any).GET_JOB_STATUSES ?? '/masters/job-statuses';
        const res = await api.get<{
          data: JobStatusBE[];
          page: number;
          limit: number;
          total: number;
        }>(endpoint, {
          params: { limit: 200, sortBy: 'job_status_order', order: 'ASC' },
        });
        if (cancelled) return;
        const list = res.data?.data ?? [];
        setJobStatusOpts(
          list.map((s) => ({
            value: String(s.job_status_id),
            label: s.job_status_title,
            color: s.job_status_color_code,
          }))
        );
      } catch (e) {
        console.error('Failed to load job statuses', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** --------- Load job details, then base dropdowns, then job types --------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');

        // 1) Fetch job
        const jobEndpoint = URLS?.GET_JOB_DETAILS
          ? `${URLS.GET_JOB_DETAILS}/${jobId}`
          : `/jobs/${jobId}`;
        const jobRes = await api.get<JobDetails>(jobEndpoint);
        if (cancelled) return;

        const job = jobRes.data;
        const history = (job as any)?.status_history;
        setStatusHistory(
          Array.isArray(history) ? (history as StatusHistoryItem[]) : []
        );
        if (!job?.job_id) {
          setError('No job data found.');
          setLoading(false);
          return;
        }

        // build initial form fields from job
        const schedule = job.scheduledDateAndTime
          ? new Date(job.scheduledDateAndTime)
          : new Date();

        const pad = (n: number) => String(n).padStart(2, '0');
        const timeStr = `${pad(schedule.getHours())}:${pad(
          schedule.getMinutes()
        )}:${pad(schedule.getSeconds())}`;

        // Prefer split fields if present; else derive from total minutes
        const days =
          typeof job.estimated_days === 'number'
            ? job.estimated_days
            : Math.floor((job.estimated_duration ?? 0) / (24 * 60));
        const hours =
          typeof job.estimated_hours === 'number'
            ? job.estimated_hours
            : Math.floor(((job.estimated_duration ?? 0) % (24 * 60)) / 60);
        const minutes =
          typeof job.estimated_minutes === 'number'
            ? job.estimated_minutes
            : (job.estimated_duration ?? 0) % 60;

        // prefill
        setFormData((prev) => ({
          ...prev,
          companyId: job.company_id ? String(job.company_id) : '',
          client: job.client_id ? String(job.client_id) : '',
          referenceNumber: job.reference_number || '',
          workType: job.worktype_id ? String(job.worktype_id) : '',
          jobType: '', // we'll set after job types arrive
          jobDescription: job.job_description || '',
          scheduleDate: schedule,
          scheduleTime: timeStr,
          supervisor: job.supervisor_id ? String(job.supervisor_id) : '',
          natureOfWork: job.now_id ? String(job.now_id) : '',
          durationDays: String(days ?? 0),
          durationHours: String(hours ?? 0),
          durationMinutes: String(minutes ?? 0),
          technician: job.technician_id ? String(job.technician_id) : '',
          jobStatusId: job.job_status_id ? String(job.job_status_id) : '',
        }));
        setJobPhotoUrl(job.job_photo || '');
        setJobPhotoFile(null);
        setJobPhotoRemoved(false);

        // also store the status title from job for gating
        setCurrentStatusLabel(String(job.job_status?.job_status_title || ''));
        setAvailableActions(
          Array.isArray((job as any).available_actions)
            ? ((job as any).available_actions as JobStatusBE[])
            : null
        );

        // capture initial technician details if present
        if (job.technician) {
          setSelectedTechDetails({
            name: job.technician.name,
            email: job.technician.email,
            phone: job.technician.phone,
          });
        } else {
          setSelectedTechDetails(null);
        }

        // 2) Load base dropdowns (scoped by company if SA)
        const [clientsRes, worksRes, nowsRes, rolesRes] = await Promise.all([
          api.get<ApiEnvelope<ClientBE[]>>(URLS.GET_CLIENTS, {
            params: {
              available_status: true,
              limit: 200,
              company_id: job.company_id || undefined,
            },
          }),
          api.get<ApiEnvelope<WorkTypeBE[]>>(URLS.GET_WORK_TYPES, {
            params: {
              status: true,
              limit: 200,
              company_id: job.company_id || undefined,
            },
          }),
          api.get<ApiEnvelope<NatureOfWorkBE[]>>(URLS.GET_NATURE_OF_WORK, {
            params: {
              now_status: true,
              limit: 200,
              company_id: job.company_id || undefined,
            },
          }),
          api.get<ApiEnvelope<RoleBE[]>>(URLS.GET_ROLES, {
            params: {
              limit: 200,
              company_id: job.company_id || undefined,
            },
          }),
        ]);
        if (cancelled) return;

        const clients = clientsRes.data?.data ?? [];
        const works = worksRes.data?.data ?? [];
        const nows = nowsRes.data?.data ?? [];
        const roles = rolesRes.data?.data ?? [];

        setClientOpts(
          (clients as ClientBE[]).map((c) => ({
            value: String(c.client_id),
            label:
              [c.firstName, c.lastName].filter(Boolean).join(' ') ||
              c.name ||
              c.email ||
              `#${c.client_id}`,
          }))
        );

        setWorkTypeOpts(
          (works as WorkTypeBE[]).map((w) => ({
            value: String(w.worktype_id),
            label: String(w.worktype_name ?? ''),
          }))
        );

        setNatureList(
          (nows as NatureOfWorkBE[]).map((n) => ({
            id: String(n.now_id),
            name: String(n.now_name ?? ''),
          }))
        );

        const supRole = (roles as RoleBE[]).find(
          (r) => String(r.role_slug ?? '').toLowerCase() === 'supervisor'
        );
        const supRoleId = supRole?.role_id;
        setSupervisorRoleId(supRoleId ? String(supRoleId) : null);

        // 3) Load job types by worktype and set selected jobType
        if (job.worktype_id) {
          setJobTypeLoading(true);
          const jtRes = await api.get<ApiEnvelope<JobTypeBE[]>>(
            URLS.GET_JOB_TYPES,
            {
              params: {
                worktype_id: job.worktype_id,
                status: true,
                limit: 200,
                company_id: job.company_id || undefined,
              },
            }
          );
          if (cancelled) return;

          const jobs = (jtRes.data?.data ?? []) as JobTypeBE[];
          const options = jobs.map((j) => ({
            value: String(j.jobtype_id),
            label: String(j.jobtype_name ?? ''),
          }));
          setJobTypeOpts(options);
          setJobTypeLoading(false);
          // select the job's jobtype_id if present
          setFormData((prev) => ({
            ...prev,
            jobType:
              job.jobtype_id && options.some((o) => o.value === job.jobtype_id)
                ? job.jobtype_id
                : '',
          }));
        }
      } catch (e) {
        console.error('Failed to load job details', e);
        setError('Failed to load job details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Update selected tech details when technician selection changes
  useEffect(() => {
    let cancelled = false;
    const id = formData.technician;
    if (!id) {
      setSelectedTechDetails(null);
      return;
    }
    // Try from current technician search results first
    const inList = technicians.find((t) => t.user_id === id);
    if (inList) {
      setSelectedTechDetails((prev) => ({ ...prev, name: inList.name }));
      return;
    }
    // Otherwise fetch details for this technician id
    (async () => {
      try {
        const res = await api.get<ApiEnvelope<UserBE[]>>(URLS.GET_USERS, {
          params: { limit: 1, user_id: id },
        });
        if (cancelled) return;
        const user = (res.data?.data ?? [])[0] as UserBE | undefined;
        if (user) {
          setSelectedTechDetails({
            name: user.name,
            email: user.email,
            phone: user.phone,
          });
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.technician, technicians]);

  /** --------- Re-load job types when Work Type (or company) changes by user --------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // when user changes workType, clear jobType and refetch
      setJobTypeOpts([]);
      setFormData((prev) => ({ ...prev, jobType: '' }));
      if (!formData.workType) return;

      try {
        setJobTypeLoading(true);
        const res = await api.get<ApiEnvelope<JobTypeBE[]>>(
          URLS.GET_JOB_TYPES,
          {
            params: {
              worktype_id: formData.workType,
              status: true,
              limit: 200,
              company_id: formData.companyId || undefined,
            },
          }
        );
        if (cancelled) return;
        const jobs = (res.data?.data ?? []) as JobTypeBE[];
        setJobTypeOpts(
          jobs.map((j) => ({
            value: String(j.jobtype_id),
            label: String(j.jobtype_name ?? ''),
          }))
        );
      } catch (e) {
        console.error('Failed to load job types for work type', e);
      } finally {
        if (!cancelled) setJobTypeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.workType, formData.companyId]);

  const selectedClientLabel = useMemo(
    () => clientOpts.find((o) => o.value === formData.client)?.label || '',
    [clientOpts, formData.client]
  );

  /** --------- Search technicians (scoped) --------- */
  const onSearchTechnicians = async () => {
    try {
      setTechLoading(true);
      setHasSearchedTechs(false);
      setTechnicians([]);

      const params: Record<string, string | undefined> = {
        supervisor_id: formData.supervisor,
      };
      if (formData.companyId) params.company_id = formData.companyId;

      const res = await api.get<ApiEnvelope<UserBE[]>>('/admin/users', {
        params,
      });

      const raw = (res.data?.data ?? []) as UserBE[];
      setTechnicians(
        raw.map((u) => ({
          user_id: String(u.user_id),
          name: String(u.name ?? u.email ?? u.user_id),
          assigned_jobs:
            typeof u.assigned_jobs === 'number' ? u.assigned_jobs : 0,
          can_assign:
            typeof u.can_assign === 'boolean'
              ? u.can_assign
              : typeof u.available_slots === 'number'
              ? u.available_slots > 0
              : true,
          available_time_label:
            u.available_time_label ??
            (typeof u.available_slots === 'number'
              ? String(u.available_slots)
              : '—'),
        }))
      );

      setHasSearchedTechs(true);
    } catch (e) {
      console.error('Failed to search technicians', e);
      setHasSearchedTechs(true);
    } finally {
      setTechLoading(false);
    }
  };

  const showTechTable = hasSearchedTechs && technicians.length > 0;

  /** --------- Save (PUT/PATCH job) --------- */
  const actionsDisabled =
    saving ||
    !formData.client ||
    !formData.workType ||
    !formData.scheduleDate ||
    !formData.supervisor;

  const handleSave = async () => {
    try {
      setSaving(true);

      const estimated_days = Number(
        clampNumStr(formData.durationDays || '0', 0, 365)
      );
      const estimated_hours = Number(
        clampNumStr(formData.durationHours || '0', 0, 24)
      );
      const estimated_minutes = Number(
        clampNumStr(formData.durationMinutes || '0', 0, 59)
      );

      const scheduledISO = mergeDateAndTime(
        formData.scheduleDate!,
        formData.scheduleTime
      ).toISOString();

      const payload = {
        company_id: formData.companyId || undefined,
        client_id: formData.client,
        technician_id: formData.technician || null,
        supervisor_id: formData.supervisor,
        worktype_id: formData.workType,
        jobtype_id: formData.jobType || null,
        now_id: formData.natureOfWork || null,
        estimated_days,
        estimated_hours,
        estimated_minutes,
        scheduledDateAndTime: scheduledISO,
        job_description: formData.jobDescription || '',
        reference_number: formData.referenceNumber || '',
        job_status_id: formData.jobStatusId || undefined,
      };

      // Prefer dedicated UPDATE URL if available
      const updateUrl = urlMap.UPDATE_JOB
        ? `${urlMap.UPDATE_JOB}/${jobId}`
        : `/jobs/${jobId}`;

      if (jobPhotoFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          fd.append(key, typeof value === 'string' ? value : String(value));
        });
        fd.append('job_photo', jobPhotoFile);
        await api.put(updateUrl, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const jsonPayload = jobPhotoRemoved
          ? { ...payload, remove_job_photo: true }
          : payload;
        await api.put(updateUrl, jsonPayload);
      }

      router.push('/jobs');
    } catch (e) {
      console.error('Failed to update job', e);
    } finally {
      setSaving(false);
    }
  };

  // ---- Status update with optional extra payload (e.g., remarks) ----
  const onStatusChange = async (
    nextStatusId: string,
    successMessage?: string,
    extra?: Record<string, any>
  ) => {
    if (!jobId || statusUpdating || formData.jobStatusId === nextStatusId)
      return;
    if (isTerminalStatus) return;
    const prev = formData.jobStatusId;

    try {
      setStatusUpdating(true);
      // optimistic update
      setFormData((p) => ({ ...p, jobStatusId: nextStatusId }));
      // update the current status label to the chosen option, for gating
      const chosen = jobStatusOpts.find(
        (s) => String(s.value) === String(nextStatusId)
      );
      if (chosen) setCurrentStatusLabel(chosen.label);

      const updateUrl = urlMap.UPDATE_JOB
        ? `${urlMap.UPDATE_JOB}/${jobId}`
        : `/jobs/${jobId}`;
      await api.put(updateUrl, {
        job_status_id: nextStatusId,
        ...(extra || {}),
      });
      toast.success(successMessage ?? 'Job status updated');
    } catch (e) {
      console.error('Failed to update job status', e);
      // revert on failure
      setFormData((p) => ({ ...p, jobStatusId: prev }));
      // revert the label if we changed it
      const cur = jobStatusOpts.find((s) => String(s.value) === String(prev));
      if (cur) setCurrentStatusLabel(cur.label);
      toast.error('Failed to update job status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Latest history item by "at" timestamp (or last in array)
  const latestHistory = useMemo(() => {
    if (!statusHistory || statusHistory.length === 0) return null;
    // If the backend already returns chronological, last is fine; otherwise sort for safety
    const sorted = [...statusHistory].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );
    return sorted[sorted.length - 1];
  }, [statusHistory]);

  const onsiteWarning = useMemo(() => {
    if (!latestHistory) return { show: false, text: '' };
    const key = canonicalKey(latestHistory.job_status_title || '');
    const text = (latestHistory.remarks || '').trim();
    return { show: key === 'onsite' && !!text, text };
  }, [latestHistory, canonicalKey]);

  /** --------- UI --------- */
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 className="animate-spin" /> Loading job…
      </div>
    );
  }
  if (error) return <div className="text-red-600 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb / back */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
          Edit Job
        </h1>
        <Button
          variant="outline"
          onClick={() => router.push('/jobs')}
          className="button-click-effect"
        >
          ← Back to Manage Jobs
        </Button>
      </div>

      {/* Status selector */}
      <Card className="p-4 md:p-6 space-y-6">
        <div>
          <h2 className="font-medium text-gray-800 mb-2">Update Job Status</h2>
          {(() => {
            const selectedIdx = jobStatusOpts.findIndex(
              (s) => String(s.value) === String(formData.jobStatusId)
            );

            // Build full list with completed flags for visual progression
            const allStatuses = jobStatusOpts.map((s, idx) => ({
              name: s.label,
              value: s.value,
              color: s.color ?? '#CBD5E1',
              completed: selectedIdx >= 0 && idx <= selectedIdx,
              key: canonicalKey(s.label),
            }));

            // Status gating logic
            const key = currentStatusKey;

            const pickByKeys = (keys: string[]) => {
              const out: typeof allStatuses = [] as any;
              for (const k of keys) {
                let m = allStatuses.find((st) => st.key === k);
                if (!m) {
                  const rx = new RegExp(k.replace(/_/g, ' '), 'i');
                  m = allStatuses.find((st) => rx.test(st.name));
                }
                if (m && !out.some((o) => o.value === m!.value)) out.push(m);
              }
              return out;
            };

            const buildAcceptRejectStatuses = () => {
              const assigned =
                allStatuses.find((s) => s.key === 'assigned') ||
                allStatuses.find((s) => /assign/i.test(s.name));
              const rejected =
                allStatuses.find((s) => s.key === 'rejected') ||
                allStatuses.find((s) => /reject/i.test(s.name));
              const custom: typeof allStatuses = [];
              if (assigned)
                custom.push({
                  ...assigned,
                  name: 'Accept',
                  completed: false,
                });
              if (rejected)
                custom.push({
                  ...rejected,
                  name: 'Reject',
                  completed: false,
                });
              return custom;
            };

            const buildAssignedStatuses = () => {
              const base = ['enroute', 'onsite', 'completed', 'unresolved'];
              const extra =
                key === 'onhold' || key === 'hold' || /hold/.test(key)
                  ? ['resume']
                  : ['onhold'];
              const opts = pickByKeys([...base, ...extra]);
              const dedup = new Set<string>();
              return opts.filter((s) =>
                dedup.has(s.value) ? false : (dedup.add(s.value), true)
              );
            };

            let statuses = allStatuses;

            if (key === 'not_started') {
              statuses = buildAcceptRejectStatuses();
            } else if (key === 'assigned') {
              statuses = buildAssignedStatuses();
            } else if (
              availableActions &&
              availableActions.length > 0 &&
              allStatuses.length > 0
            ) {
              const allow = new Set(
                availableActions.map((a) => String(a.job_status_id))
              );
              statuses = allStatuses.filter((s) => allow.has(String(s.value)));
            } else {
              const inAssignPhase = [
                'approved',
                'assigned',
                'enroute',
                'onsite',
                'onhold',
                'resume',
                'hold',
              ].includes(key);
              if (inAssignPhase) {
                statuses = buildAssignedStatuses();
              }
            }

            const waitingStatus =
              allStatuses.find((s) => s.key === 'waiting_for_approval') || null;
            const completedReference =
              allStatuses.find((s) => s.key === 'completed') || null;

            if (key === 'waiting_for_approval') {
              if (waitingStatus) {
                statuses = [
                  {
                    ...waitingStatus,
                    name: waitingStatus.name || 'Waiting For Approval',
                    color: completedReference?.color || waitingStatus.color,
                    key: 'waiting_for_approval',
                  },
                ];
              } else if (completedReference) {
                statuses = [
                  {
                    ...completedReference,
                    name: 'Waiting For Approval',
                    key: 'waiting_for_approval',
                  },
                ];
              }
            } else if (waitingStatus) {
              statuses = statuses
                .filter((s) => s.key !== 'waiting_for_approval')
                .map((s) => {
                  if (s.key === 'completed') {
                    return {
                      ...s,
                      value: waitingStatus.value,
                    };
                  }
                  return s;
                });
            }

            // Final safety: if nothing matched (e.g., mismatched ids), show the unfiltered list
            if (!statuses || statuses.length === 0) {
              statuses = allStatuses;
            }

            const onStatusChangeLocal = async (
              nextStatusId: string,
              successMessage?: string
            ) => onStatusChange(nextStatusId, successMessage);

            const showSupervisorApprovalUI =
              isSupervisorUser && key === 'waiting_for_approval';

            const handleSupervisorDecision = async (
              targetKey: 'completed' | 'onsite'
            ) => {
              const target = pickByKeys([targetKey])[0];
              if (!target) {
                toast.error('Status option not available yet');
                return;
              }
              await onStatusChange(
                target.value,
                targetKey === 'completed'
                  ? 'Job approved and marked as Completed.'
                  : 'Job moved back to On Site.'
              );
              if (targetKey === 'onsite') {
                toast.info('Technician needs to rework on the job.');
              }
            };

            const selectorDisabled =
              isTerminalStatus || key === 'waiting_for_approval';

            return (
              <>
                {showSupervisorApprovalUI && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    <Button
                      type="button"
                      className="button-click-effect text-white"
                      style={{ backgroundColor: primaryColor }}
                      disabled={statusUpdating || isTerminalStatus}
                      onClick={() => handleSupervisorDecision('completed')}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="button-click-effect"
                      disabled={statusUpdating || isTerminalStatus}
                      onClick={() => {
                        setRejectReason('');
                        setRejectError('');
                        setRejectOpen(true);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                <JobStatusSelector
                  statuses={statuses}
                  selectedStatus={formData.jobStatusId}
                  onChange={onStatusChangeLocal}
                  loading={statusUpdating}
                  disabled={selectorDisabled}
                />
              </>
            );
          })()}
        </div>
      </Card>
      {onsiteWarning.show && (
        <div className="mb-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-yellow-900">
          <div className="font-medium">Supervisor Note for On-Site Rework</div>
          <div className="text-sm mt-1">{onsiteWarning.text}</div>
        </div>
      )}

      <Card className="p-4 md:p-6">
        <div className="border-b">
          <h3
            className="font-medium border-b-3 rounded-xs inline-block pb-1"
            style={{ color: primaryColor, borderColor: primaryColor }}
          >
            Assign Job to Technician
          </h3>
        </div>

        <div
          className={
            'grid md:grid-cols-2 gap-4 ' +
            (formDisabled ? 'opacity-60 pointer-events-none select-none' : '')
          }
        >
          {/* Company (super_admin only) */}
          {isSuperAdmin && (
            <div className="w-full">
              <Label className="pb-2">Company</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) => handleChange('companyId', value)}
                disabled={formDisabled}
              >
                <SelectTrigger className="w-auto md:w-full">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companyOpts.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client */}
          <div className="w-full">
            <Label className="pb-2">Select Client</Label>
            <Select
              value={formData.client}
              onValueChange={(value) => handleChange('client', value)}
              disabled={formDisabled}
            >
              <SelectTrigger className="w-auto md:w-full">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clientOpts.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!!selectedClientLabel && (
              <p className="text-sm text-gray-500 mt-1">
                Selected: {selectedClientLabel}
              </p>
            )}
          </div>

          {/* Reference Number */}
          <div className="w-auto md:w-full">
            <Label className="pb-2">Reference Number</Label>
            <Input
              value={formData.referenceNumber}
              onChange={(e) => handleChange('referenceNumber', e.target.value)}
              placeholder="#ID34324342"
              disabled={formDisabled}
            />
          </div>

          {/* Work Type */}
          <div>
            <Label className="pb-2">Work Type</Label>
            <Select
              value={formData.workType}
              onValueChange={(value) => handleChange('workType', value)}
              disabled={formDisabled}
            >
              <SelectTrigger className="w-auto md:w-full">
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent>
                {workTypeOpts.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Type (filtered) */}
          <div>
            <Label className="pb-2">Job Type</Label>
            <Select
              value={formData.jobType}
              onValueChange={(value) => handleChange('jobType', value)}
              disabled={
                jobTypeLoading ||
                !formData.workType ||
                jobTypeOpts.length === 0 ||
                formDisabled
              }
            >
              <SelectTrigger className="w-auto md:w-full">
                <SelectValue
                  placeholder={
                    jobTypeLoading
                      ? 'Loading job types...'
                      : !formData.workType
                      ? 'Select a work type first'
                      : jobTypeOpts.length === 0
                      ? 'No job types found'
                      : 'Select job type'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {jobTypeOpts.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Description */}
          <div>
            <Label className="pb-2">Job Description</Label>
            <Textarea
              placeholder="Describe the job"
              rows={3}
              value={formData.jobDescription}
              onChange={(e) => handleChange('jobDescription', e.target.value)}
              disabled={formDisabled}
            />
          </div>

          {/* Job Photo */}
          <div>
            <Label className="pb-2">Job Photo (optional)</Label>
            <p className="text-xs text-gray-500 -mt-1 mb-2">
              Attach a reference photo for this job card.
            </p>
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="w-28 h-28 md:w-32 md:h-32 border border-gray-200 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                {jobPhotoPreview ? (
                  <img
                    src={jobPhotoPreview}
                    alt="Selected job"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No image</span>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerPhotoPicker}
                  disabled={formDisabled}
                  className="button-click-effect w-full md:w-48"
                >
                  {jobPhotoFile
                    ? 'Change Photo'
                    : jobPhotoPreview
                    ? 'Replace Photo'
                    : 'Upload Photo'}
                </Button>
                {(jobPhotoFile || jobPhotoUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRemovePhoto}
                    disabled={formDisabled}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 button-click-effect w-full md:w-48"
                  >
                    {jobPhotoFile ? 'Clear Selection' : 'Remove Photo'}
                  </Button>
                )}
                {jobPhotoFile && (
                  <p className="text-xs text-gray-500 break-all">
                    Selected file:{' '}
                    <span className="font-medium">{jobPhotoFile.name}</span>
                  </p>
                )}
                {!jobPhotoFile && jobPhotoUrl && !jobPhotoRemoved && (
                  <p className="text-xs text-gray-500 break-all">
                    Current photo on file
                  </p>
                )}
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoFileChange}
              disabled={formDisabled}
            />
          </div>

          {/* Estimated Duration */}
          <div>
            <Label className="pb-2">Estimated Duration</Label>
            <div className="flex gap-2">
              <div>
                <Label className="text-xs">Days</Label>
                <Input
                  type="number"
                  placeholder="00"
                  className="w-16"
                  value={formData.durationDays}
                  onChange={(e) => handleChange('durationDays', e.target.value)}
                  min={0}
                  disabled={formDisabled}
                />
              </div>
              <div>
                <Label className="text-xs">Hours (max 24)</Label>
                <Input
                  type="number"
                  placeholder="00"
                  className="w-16"
                  value={formData.durationHours}
                  onChange={(e) =>
                    handleChange('durationHours', e.target.value)
                  }
                  onBlur={onBlurHours}
                  min={0}
                  max={24}
                  disabled={formDisabled}
                />
              </div>
              <div>
                <Label className="text-xs">Minutes (max 59)</Label>
                <Input
                  type="number"
                  placeholder="00"
                  className="w-16"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    handleChange('durationMinutes', e.target.value)
                  }
                  onBlur={onBlurMinutes}
                  min={0}
                  max={59}
                  disabled={formDisabled}
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <Label className="pb-2">Schedule Date & Time</Label>
            <div className="flex flex-col gap-2">
              <div
                className={
                  formDisabled
                    ? 'opacity-60 pointer-events-none select-none'
                    : ''
                }
              >
                <DatePickerWithInput
                  date={formData.scheduleDate ?? undefined}
                  time={formData.scheduleTime}
                  onChange={(nextDate, nextTime) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheduleDate: nextDate ?? null,
                      scheduleTime: nextTime,
                    }))
                  }
                />
              </div>
              {formData.scheduleDate && (
                <p className="text-xs text-gray-500">
                  Scheduled at:{' '}
                  {fmtDateTime12(
                    mergeDateAndTime(
                      formData.scheduleDate,
                      formData.scheduleTime
                    )
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Supervisor */}
          <div>
            <Label className="pb-2">Select Supervisor</Label>
            <Select
              value={formData.supervisor}
              onValueChange={(value) => handleChange('supervisor', value)}
              onOpenChange={(open) => {
                if (open && !supervisorsLoaded) {
                  (async () => {
                    try {
                      const params: any = {
                        limit: 200,
                        company_id: formData.companyId || undefined,
                      };
                      if (supervisorRoleId) params.role_id = supervisorRoleId;
                      const res = await api.get<ApiEnvelope<UserBE[]>>(
                        URLS.GET_USERS,
                        { params }
                      );
                      const list = (res.data?.data ?? []) as UserBE[];
                      setSupervisorOpts(
                        list.map((u) => ({
                          value: String(u.user_id),
                          label: String(u.name ?? u.email ?? u.user_id),
                        }))
                      );
                      setSupervisorsLoaded(true);
                    } catch (e) {
                      // ignore
                    }
                  })();
                }
              }}
              disabled={formDisabled}
            >
              <SelectTrigger className="w-auto md:w-full">
                <SelectValue placeholder="Select supervisor" />
              </SelectTrigger>
              <SelectContent>
                {supervisorOpts.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nature of Work */}
          <div>
            <Label className="pb-2">Nature of Work</Label>
            <div className="flex justify-between flex-wrap gap-2">
              <RadioGroup
                value={formData.natureOfWork}
                onValueChange={(value) => handleChange('natureOfWork', value)}
                className={
                  'flex gap-6 mt-2 flex-wrap ' +
                  (formDisabled
                    ? 'opacity-60 pointer-events-none select-none'
                    : '')
                }
              >
                {natureList.map((n) => (
                  <div className="flex items-center space-x-2" key={n.id}>
                    <RadioGroupItem
                      value={n.id}
                      id={`now-${n.id}`}
                      className="data-[state=checked]:bg-[--primary]"
                      style={{ ['--primary']: primaryColor } as CSSVars}
                    />
                    <Label htmlFor={`now-${n.id}`}>{n.name}</Label>
                  </div>
                ))}
              </RadioGroup>

              {formData.supervisor && (
                <Button
                  type="button"
                  className="rounded-full button-click-effect cursor-pointer"
                  style={{ backgroundColor: primaryColor, color: 'white' }}
                  disabled={
                    techLoading ||
                    formDisabled ||
                    !formData.client ||
                    !formData.workType ||
                    !formData.scheduleDate ||
                    !formData.supervisor
                  }
                  onClick={onSearchTechnicians}
                >
                  {techLoading ? (
                    'Searching…'
                  ) : (
                    <>
                      Search Technicians{' '}
                      <Image
                        src="/assets/technician_icon.svg"
                        alt="Technician"
                        width={18}
                        height={18}
                      />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Technician results */}
        {showTechTable && (
          <>
            <div className="border-b mt-4">
              <h3
                className="font-medium border-b-3 rounded-xs inline-block pb-1"
                style={{ color: primaryColor, borderColor: primaryColor }}
              >
                Available Technician
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left"> </th>
                    <th className="p-2 text-left">Technician Name</th>
                    <th className="p-2 text-left">Assigned Jobs</th>
                    <th className="p-2 text-left">Can Assign?</th>
                    <th className="p-2 text-left">Available Time</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((tech) => (
                    <tr key={tech.user_id} className="border-t">
                      <td className="p-2">
                        <input
                          type="radio"
                          name="technician"
                          checked={formData.technician === tech.user_id}
                          onChange={() =>
                            handleChange('technician', tech.user_id)
                          }
                          style={{ accentColor: primaryColor }}
                        />
                      </td>
                      <td className="p-2">{tech.name}</td>
                      <td className="p-2">{tech.assigned_jobs}</td>
                      <td className="p-2">{tech.can_assign ? 'Yes' : 'No'}</td>
                      <td className="p-2">{tech.available_time_label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {hasSearchedTechs && !techLoading && technicians.length === 0 && (
          <p className="text-sm text-gray-500 mt-4">
            No technicians found for the selected supervisor.
          </p>
        )}

        {/* Technician snapshot (current) */}
        {formData.technician && (
          <div className="mt-6 rounded-md border p-3 flex items-center gap-3 text-sm">
            <Image
              src="/assets/dev.png"
              alt="Technician"
              width={36}
              height={36}
              className="rounded-full"
            />
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-medium">
                Selected Technician
                {selectedTechDetails?.name
                  ? `: ${selectedTechDetails.name}`
                  : ''}
              </span>
              {selectedTechDetails?.phone && (
                <span className="opacity-70 flex items-center gap-1">
                  <Phone size={14} /> {selectedTechDetails.phone}
                </span>
              )}
              {selectedTechDetails?.email && (
                <span className="opacity-70 flex items-center gap-1">
                  <Mail size={14} /> {selectedTechDetails.email}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => router.push('/jobs')}
            className="button-click-effect"
            type="button"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="text-white button-click-effect"
            style={{ backgroundColor: primaryColor }}
            type="button"
            disabled={actionsDisabled || formDisabled}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject job – provide a reason</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError('');
              }}
              placeholder="Describe why you’re rejecting and what needs rework…"
              rows={4}
            />
            {!!rejectError && (
              <p className="text-sm text-red-600">{rejectError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={rejectSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="text-white button-click-effect"
              style={{ backgroundColor: primaryColor }}
              disabled={rejectSubmitting}
              onClick={async () => {
                const reason = rejectReason.trim();
                if (!reason) {
                  setRejectError('Please enter a reason.');
                  return;
                }

                // find On Site status as the reject target
                const onsite =
                  jobStatusOpts.find(
                    (s) => canonicalKey(s.label) === 'onsite'
                  ) ??
                  jobStatusOpts.find((s) => /on\s*-?\s*site/i.test(s.label));

                if (!onsite) {
                  toast.error('On Site status is not available.');
                  return;
                }

                try {
                  setRejectSubmitting(true);
                  await onStatusChange(
                    onsite.value,
                    'Job moved back to On Site.',
                    { remarks: reason } // send remark to backend
                  );

                  // ⬇️ NEW: add to local status history so warning shows right away
                  const id =
                    typeof crypto !== 'undefined' && 'randomUUID' in crypto
                      ? (crypto as any).randomUUID()
                      : Math.random().toString(36).slice(2);

                  setStatusHistory((prev) => [
                    ...prev,
                    {
                      id,
                      job_status_id: String(onsite.value),
                      job_status_title: onsite.label || 'OnSite',
                      job_status_color_code: onsite.color,
                      is_completed: false,
                      remarks: reason,
                      completed: false,
                      at: new Date().toISOString(),
                    },
                  ]);

                  setRejectOpen(false);
                  toast.info('Technician needs to rework on the job.');
                } finally {
                  setRejectSubmitting(false);
                }
              }}
            >
              {rejectSubmitting ? 'Submitting…' : 'Submit & Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
