'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendHorizonal } from 'lucide-react';
import api from '@/utils/api';
import { URLS } from '@/utils/urls';

type ChatMessage = {
  id: string;
  user_id: string;
  user_name: string;
  user_photo: string | null;
  message: string;
  sent_at: string;
};

type JobDetails = {
  job_id: string;
  company_id: string;
  client_id: string;
  reference_number?: string;
  worktype_id?: string;
  jobtype_id?: string;
  job_description?: string;
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
  job_type?: {
    jobtype_id: string;
    jobtype_name: string;
  };
};

export default function ViewJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const primaryColor = useSelector((s: RootState) => s.ui.primaryColor);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [job, setJob] = useState<JobDetails | null>(null);

  const currentUserId = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return undefined;
      const u = JSON.parse(raw);
      return u?.profile?.user_id;
    } catch {
      return undefined;
    }
  }, []);

  const unwrapArray = (data: any): ChatMessage[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const fetchMessages = async () => {
    try {
      setError(null);
      const { data } = await api.get(`/jobs/${jobId}/chats`);
      const arr = unwrapArray(data);
      arr.sort((a, b) => +new Date(a.sent_at) - +new Date(b.sent_at));
      setMessages(arr);
    } catch (e) {
      console.error(e);
      setError('Failed to load messages.');
      setMessages([]);
    } finally {
      setInitialLoading(false);
    }
  };

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

  console.log('Job details:', job);

  useEffect(() => {
    if (jobId) fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sendMessage = async () => {
    const text = newMsg.trim();
    if (!text) return;
    setLoading(true);
    try {
      await api.post(`/jobs/${jobId}/chats`, { message: text });
      setNewMsg('');
      await fetchMessages();
      inputRef.current?.focus();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-50 rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <h1 className="text-lg font-semibold text-gray-800">
          {job?.job_type?.jobtype_name}
        </h1>
        <Button
          style={{ backgroundColor: primaryColor, color: '#fff' }}
          className="rounded-full px-5 cursor-pointer"
          onClick={() => router.back()}
        >
          Close
        </Button>
      </div>

      {/* Chat list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EBF4FF]"
      >
        {initialLoading ? (
          <div className="text-center text-sm text-gray-500 mt-10">
            Loading…
          </div>
        ) : error ? (
          <div className="text-center text-sm text-red-600 mt-10">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex w-full ${
                  isOwn ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex max-w-[92%] sm:max-w-[80%] items-start gap-3 ${
                    isOwn ? 'flex-row-reverse text-right' : 'flex-row'
                  }`}
                >
                  <Avatar className="w-9 h-9 mt-[2px]">
                    {msg.user_photo ? (
                      <AvatarImage src={msg.user_photo} alt={msg.user_name} />
                    ) : (
                      <AvatarFallback>
                        {getInitials(msg.user_name)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <Card
                    className={`px-3 py-2 border shadow-sm ${
                      isOwn ? 'bg-indigo-50 border-indigo-200' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`flex flex-col items-baseline gap-2 ${
                        isOwn ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className="flex gap-2 items-baseline">
                        <span className="font-medium text-gray-800">
                          {msg.user_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.sent_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-800 break-words">
                        {msg.message}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 p-4 border-t bg-white">
        <input
          ref={inputRef}
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a message..."
          className="flex-1 px-4 py-2 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <Button
          onClick={sendMessage}
          disabled={loading || !newMsg.trim()}
          style={{ backgroundColor: primaryColor, color: '#fff' }}
          className="rounded-full p-3"
          title="Send"
        >
          <SendHorizonal size={18} />
        </Button>
      </div>
    </div>
  );
}
