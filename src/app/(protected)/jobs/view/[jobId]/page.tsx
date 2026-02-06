'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  BadgeCheck,
  Mail,
  Phone,
  Printer,
  Route,
  MapPinHouse,
  PackageCheck,
  Ban,
  MapPin,
  Map,
  Loader2,
  Clock3,
  MoveLeft,
  MessageCircleMore,
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
const JobStatusTimeline = dynamic(
  () => import('../../components/JobStatusTimeline'),
  { ssr: false }
);
import api from '@/utils/api';
import { URLS } from '@/utils/urls';

/** ---------- Types (same as before) ---------- */
type StatusHistoryItem = {
  id: string;
  job_status_id: string;
  job_status_title: string;
  job_status_color_code?: string;
  is_completed: boolean;
  at: string;
  remarks: string;
};
type Client = {
  client_id: string;
  company_id: string;
  photo?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address_1?: string;
  city?: string;
  postal_code?: string;
  lat?: string;
  lng?: string;
};
type Person = {
  user_id: string;
  company_id: string;
  photo?: string;
  name?: string;
  email?: string;
  phone?: string;
};
type WorkType = {
  worktype_id: string;
  worktype_name?: string;
  worktype_description?: string;
};
type JobType = {
  jobtype_id: string;
  worktype_id: string;
  jobtype_name?: string;
  description?: string;
  estimated_duration?: number;
  status?: boolean;
};
type NatureOfWork = { now_id: string; now_name?: string; now_status?: boolean };
type JobStatus = {
  job_status_id: string;
  job_status_title: string;
  job_status_color_code?: string;
  status?: boolean;
};
type JobDetails = {
  job_id: string;
  company_id: string;
  client_id: string;
  reference_number?: string;
  worktype_id?: string;
  jobtype_id?: string;
  job_description?: string;
  job_photo?: string;
  estimated_duration?: number;
  scheduledDateAndTime?: string;
  supervisor_id?: string;
  now_id?: string;
  technician_id?: string;
  job_status_id?: string;
  job_assigned?: boolean;
  createdAt?: string;
  updatedAt?: string;
  estimated_days?: number;
  estimated_hours?: number;
  estimated_minutes?: number;
  client?: Client;
  technician?: Person;
  supervisor?: Person;
  work_type?: WorkType;
  job_type?: JobType;
  nature_of_work?: NatureOfWork;
  job_status?: JobStatus;
  status_history?: StatusHistoryItem[];
};

type StepStatus = 'done' | 'pending';
type Step = {
  name: string;
  time: string;
  icon: React.ReactNode;
  color: string;
  status: StepStatus;
};

const fmtTime = (iso?: string) => {
  if (!iso) return '—';
  const s = new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return s.replace(/\bam\b/i, 'AM').replace(/\bpm\b/i, 'PM');
};
const fmtDateTime = (iso?: string) => {
  if (!iso) return '—';
  const s = new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return s.replace(/\bam\b/i, 'AM').replace(/\bpm\b/i, 'PM');
};
const fullName = (f?: string, l?: string) =>
  [f, l].filter(Boolean).join(' ') || undefined;
const deriveDuration = (
  days?: number,
  hours?: number,
  minutes?: number,
  totalMinutes?: number
) => {
  if ([days, hours, minutes].some((v) => typeof v === 'number')) {
    return { days: days ?? 0, hours: hours ?? 0, minutes: minutes ?? 0 };
  }
  const tm = totalMinutes ?? 0;
  const d = Math.floor(tm / (24 * 60));
  const h = Math.floor((tm % (24 * 60)) / 60);
  const m = tm % 60;
  return { days: d, hours: h, minutes: m };
};
const iconColorForStatus = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('route'))
    return { icon: <Route size={18} />, color: '#2563eb' };
  if (t.includes('site'))
    return { icon: <MapPinHouse size={18} />, color: '#f97316' };
  if (t.includes('complet'))
    return { icon: <PackageCheck size={18} />, color: '#10b981' };
  if (t.includes('reject'))
    return { icon: <Ban size={18} />, color: '#ef4444' };
  if (t.includes('approve'))
    return { icon: <BadgeCheck size={18} />, color: '#22c55e' };
  if (t.includes('start'))
    return { icon: <Clock3 size={18} />, color: '#6b7280' };
  return { icon: <Clock3 size={18} />, color: '#6b7280' };
};

export default function ViewJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const primaryColor = useSelector((state: RootState) => state.ui.primaryColor);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const endpoint = URLS?.GET_JOB_DETAILS
          ? `${URLS.GET_JOB_DETAILS}/${jobId}`
          : `/jobs/${jobId}`;
        const res = await api.get<JobDetails>(endpoint);
        if (cancelled) return;
        const data = res.data;
        if (!data?.job_id) {
          setError('No job data found.');
          setJob(null);
        } else {
          setJob(data);
        }
      } catch (e) {
        console.error('Failed to load job details', e);
        setError('Failed to load job details.');
        setJob(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  /** ------------- MOVE HOOKS ABOVE EARLY RETURNS ------------- */
  const jobStatusTimeline: Step[] = useMemo(() => {
    const hist = job?.status_history ?? [];
    if (hist.length === 0) {
      return [
        {
          name: 'Not Started',
          time: '—',
          ...iconColorForStatus('Not Started'),
          status: 'pending',
        },
        {
          name: 'En Route',
          time: '—',
          ...iconColorForStatus('En Route'),
          status: 'pending',
        },
        {
          name: 'On Site',
          time: '—',
          ...iconColorForStatus('On Site'),
          status: 'pending',
        },
        {
          name: 'Completed',
          time: '—',
          ...iconColorForStatus('Completed'),
          status: 'pending',
        },
      ];
    }
    const steps = hist.map<Step>((h) => {
      const { icon, color } = iconColorForStatus(h.job_status_title);
      return {
        name: h.job_status_title,
        time: fmtTime(h.at),
        icon,
        color: h.job_status_color_code || color,
        status: h.is_completed || !!h.at ? 'done' : 'pending',
        remarks: h.remarks || '',
      };
    });
    // ensure typical milestones exist (pending if missing)
    const ensure = (needle: string, label: string) => {
      const has = steps.some((s) => s.name.toLowerCase().includes(needle));
      if (!has) {
        const { icon, color } = iconColorForStatus(label);
        steps.push({ name: label, time: '—', icon, color, status: 'pending' });
      }
    };
    ensure('route', 'En Route');
    ensure('site', 'On Site');
    ensure('complet', 'Completed');
    return steps;
  }, [job]);

  /** ------------------- EARLY RETURNS AFTER HOOKS ------------------- */
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 className="animate-spin" /> Loading job…
      </div>
    );
  }
  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!job) return <div className="text-gray-600 text-sm">Job not found.</div>;

  // Derived values (no hooks)
  const refNo = job.reference_number || job.job_id;
  const scheduledAt = job.scheduledDateAndTime;
  const statusTitle = job.job_status?.job_status_title || '—';
  const statusColor = job.job_status?.job_status_color_code || '#6b7280';

  const workTypeName = job.work_type?.worktype_name || '—';
  const jobTypeName = job.job_type?.jobtype_name || '—';
  const jobPhotoUrl = (job.job_photo || '').trim();

  const clientAddr = [
    job.client?.address_1,
    job.client?.city,
    job.client?.postal_code,
  ]
    .filter(Boolean)
    .join(', ');
  const region = job.client?.address_1 || '—';

  const tech = job.technician;
  const techName = tech?.name || '—';
  const techPhone = tech?.phone || '—';
  const techEmail = tech?.email || '—';
  const techPhoto =
    tech?.photo && tech.photo !== 'string' ? tech.photo : '/assets/dev.png';

  const { days, hours, minutes } = deriveDuration(
    job.estimated_days,
    job.estimated_hours,
    job.estimated_minutes,
    job.estimated_duration
  );

  return (
    <div className="space-y-4">
      <div className="flex cursor-pointer" onClick={() => router.push('/jobs')}>
        <MoveLeft className="mr-2" /> Back to Jobs
      </div>
      <div className="flex flex-wrap items-center justify-between">
        <h1 className="text-lg md:text-xl font-semibold text-[#4a4a4a]">
          View Job -{' '}
          <span style={{ color: primaryColor }} className="font-bold">
            #{refNo}
          </span>
        </h1>

        <div className="flex flex-wrap justify-start md:justify-end gap-2">
          <Button
            className="bg-[#8000FF] hover:bg-[#a454f5] text-white button-click-effect cursor-pointer"
            onClick={() => router.push(`/jobs/chat/${jobId}`)}
          >
            <MessageCircleMore className="w-4 h-4 mr-1" /> Chat
          </Button>
          <Button
            className="bg-slate-600 hover:bg-slate-700 text-white button-click-effect"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-1" /> PRINT
          </Button>
        </div>
      </div>
      <Card className="p-4 grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2 text-gray-700">Job Status</h3>
          <div className="relative pl-6 rounded-xl border bg-white">
            <div className="flex flex-col p-4">
              <JobStatusTimeline steps={jobStatusTimeline} />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between flex-wrap">
            <h3 className="font-semibold mb-2 text-gray-700">Job Tracking</h3>
            <p className="text-sm text-right text-gray-600 mt-1">
              Estimated duration{' '}
              <strong>
                {days}d {hours}h {minutes}m
              </strong>
            </p>
          </div>
          <Image
            src="/assets/maps.png"
            alt="Map"
            width={600}
            height={300}
            className="w-full rounded-md"
            unoptimized
          />
        </div>
      </Card>
      <Card className="p-4 gap-4">
        <div className="flex flex-wrap items-center">
          <h1 className="text-lg font-semibold">Assigned Technician</h1>
          <span
            className="text-sm px-2 py-1 rounded-full w-auto ml-4"
            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
          >
            {statusTitle}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-12">
          <div className="flex items-center gap-2">
            <Image
              src={techPhoto}
              alt="Technician"
              width={48}
              height={48}
              className="rounded-full"
              unoptimized
            />
            <div>
              <p className="font-semibold">{techName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-700">
            <Phone className="w-4 h-4" /> <span>{techPhone}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-700">
            <Mail className="w-4 h-4" /> <span>{techEmail}</span>
          </div>
        </div>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4 gap-0">
          <div className="text-blue-600 font-medium">#{refNo}</div>
          <div className="flex flex-wrap items-center justify-between mt-0">
            <div className="text-gray-700 font-semibold">
              {fullName(job.client?.firstName, job.client?.lastName) ||
                job.client?.email ||
                '—'}
            </div>
            <div className="text-gray-500 text-sm">
              {fmtDateTime(scheduledAt)}
            </div>
          </div>

          <div className="flex gap-2 items-start mt-2">
            {jobPhotoUrl ? (
              <Image
                src={jobPhotoUrl}
                alt="Job photo"
                width={64}
                height={64}
                className="rounded object-cover border border-gray-200"
                unoptimized
              />
            ) : (
              <Image
                src="/assets/job-image.png"
                alt="job"
                width={60}
                height={60}
                className="rounded"
                unoptimized
              />
            )}
            <div>
              <p className="font-semibold">{workTypeName}</p>
              <p className="text-xs font-medium" style={{ color: statusColor }}>
                {statusTitle}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 mt-2 border-b border-dashed">
            <b>Remarks:</b>
            <p className="text-sm text-gray-600">
              {job.job_description || '—'}
            </p>
          </div>

          <div className="grid gap-y-1 mt-4 text-sm">
            <div className="flex flex-1 flex-wrap items-center justify-between border-b border-dashed">
              <p className="text-gray-500">Work Type</p>
              <p>{workTypeName}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between border-b border-dashed">
              <p className="text-gray-500">Job Type</p>
              <p>{jobTypeName}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between border-b border-dashed">
              <p className="text-gray-500">Job Description</p>
              <p>{job.job_description || '—'}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between border-b border-dashed">
              <p className="text-gray-500">Technician</p>
              <p>{techName}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between border-b border-dashed">
              <p className="text-gray-500">Estimated</p>
              <p>
                {days}d {hours}h {minutes}m
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between border-b border-dashed">
              <p className="text-gray-500">Nature of Work</p>
              <p>{job.nature_of_work?.now_name || '—'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-2 gap-0">
          <h3 className="font-semibold text-gray-700">Customer Details</h3>
          <div className="flex items-start gap-3">
            <div>
              <MapPin size={14} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Customer Address</p>
              <p className="text-sm">{clientAddr || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div>
              <Phone size={14} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-sm">{job.client?.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div>
              <Mail size={14} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-sm">{job.client?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div>
              <Map size={14} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Region</p>
              <p className="text-sm">{region}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
