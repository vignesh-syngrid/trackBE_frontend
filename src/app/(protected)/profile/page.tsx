'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Role = { id: string; name: string; slug: string };

type UserProfile = {
  user_id: string;
  company_id: string | null;
  photo: string | null;
  name: string;
  email: string;
  phone: string;
  emergency_contact?: string | null;
  address_1?: string | null;
  country_id?: number | null;
  state_id?: string | null;
  city?: string | null;
  postal_code?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type User = {
  type: 'user';
  role: Role;
  company_id: string | null;
  profile: UserProfile;
  brandColor: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
  };

  if (!user) return <p>Loading profile...</p>;

  const { profile, role } = user;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">My Profile</h1>
        <Button onClick={() => router.push('/')}>Back</Button>
      </div>

      {/* Photo & Name */}
      <Card className="p-6 flex flex-col items-center gap-4">
        {profile.photo ? (
          <img
            src={getImageUrl(profile.photo)}
            alt="Profile Photo"
            className="w-32 h-32 object-contain border rounded-lg"
          />
        ) : (
          <div className="w-32 h-32 flex items-center justify-center text-gray-400 border border-dashed rounded-lg">
            No Photo
          </div>
        )}
        <h2 className="text-xl font-semibold">{profile.name}</h2>
        <span className="rounded-full bg-blue-100 text-blue-600 px-4 py-1 text-sm">
          {role.name}
        </span>
      </Card>

      {/* Two-column layout */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 gap-3 text-sm mt-4">
                <p><span className="font-semibold">Email:</span> {profile.email}</p>
                <p><span className="font-semibold">Phone:</span> {profile.phone}</p>
                <p><span className="font-semibold">Emergency Contact:</span> {profile.emergency_contact || '-'}</p>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold border-b pb-2">Address</h3>
              <div className="text-sm mt-2 space-y-1">
                <p>{profile.address_1 || '-'}</p>
                <p>{profile.city || '-'}, {profile.state_id || '-'}, {profile.country_id || '-'}</p>
                <p>Postal Code: {profile.postal_code || '-'}</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Role & Company */}
            <div>
              <h3 className="text-lg font-semibold border-b pb-2">Role & Company</h3>
              <div className="text-sm mt-2 space-y-1">
                <p><span className="font-semibold">Role:</span> {role.name}</p>
                <p><span className="font-semibold">Company ID:</span> {profile.company_id || '-'}</p>
              </div>
            </div>

            {/* Dates */}
            <div>
              <h3 className="text-lg font-semibold border-b pb-2">Other Details</h3>
              <div className="text-sm mt-4 space-y-1">
                <p><span className="font-semibold">Created At:</span> {new Date(profile.createdAt || '').toLocaleString() || '-'}</p>
                <p><span className="font-semibold">Updated At:</span> {new Date(profile.updatedAt || '').toLocaleString() || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
