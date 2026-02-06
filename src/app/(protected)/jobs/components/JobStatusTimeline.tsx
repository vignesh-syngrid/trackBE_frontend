// components/JobStatusTimeline.tsx
'use client';

import * as React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

type Step = {
  name: string;
  time: string;
  icon: React.ReactNode;
  color: string;
  status: 'done' | 'pending';
  remarks?: string;
};

export default function JobStatusTimeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative ms-3">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const isDone = s.status === 'done';

        return (
          <li
            key={`${s.name}-${i}`}
            className={[
              // spacing + left padding for marker
              'relative pl-8 pb-6',
              // draw the connector AFTER the icon using ::before,
              // only when this step is done and not the last
              !isLast && isDone
                ? "before:content-[''] before:absolute before:left-[5px] before:top-6 before:h-[calc(100%-1.5rem)] before:w-px before:border-l-2 before:border-dashed before:border-gray-300"
                : '',
            ].join(' ')}
          >
            {/* Status dot/check (positioned over the list rail) */}
            <span className="absolute -start-1 top-0 flex h-5 w-5 items-center justify-center bg-white">
              {isDone ? (
                <CheckCircle2 className="text-green-500" size={20} />
              ) : (
                <Circle className="text-gray-300" size={20} />
              )}
            </span>

            {/* Step content */}
            <div
              className="inline-flex items-center gap-3 rounded-xl px-3 py-2"
              style={{
                backgroundColor: isDone ? `${s.color}1A` : '#F5F7FA', // light tint
              }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${s.color}1A`, color: s.color }}
              >
                {s.icon}
              </span>
              <div className="leading-tight">
                <div
                  className={`flex flex-col text-base font-semibold ${
                    isDone ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {s.name}
                  <span className="text-sm text-300 font-normal">
                    {s.remarks}
                  </span>
                </div>
                <div
                  className={`text-sm ${
                    isDone ? 'text-gray-600' : 'text-gray-300'
                  }`}
                >
                  {s.time}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
