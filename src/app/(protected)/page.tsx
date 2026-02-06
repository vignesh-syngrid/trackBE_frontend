'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function ResponsivePanel() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Overview</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">360</div>
            <div className="text-sm text-gray-500">Total Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">150</div>
            <div className="text-sm text-gray-500">Total Technicians</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">30</div>
            <div className="text-sm text-gray-500">Total Jobs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">235</div>
            <div className="text-sm text-gray-500">Total Completed Jobs</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
