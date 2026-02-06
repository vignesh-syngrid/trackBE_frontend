'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/utils/api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type Option = { value: string; label: string };

type AsyncSearchSelectProps = {
  placeholder?: string;
  fetchUrl: string; // relative API path, e.g., "/admin/clients"
  mapResponse: (resData: any) => Option[]; // maps axios res.data to options
  value: string;
  onChange: (label: string, option?: Option) => void;
  debounceMs?: number;
};

export default function AsyncSearchSelect({
  placeholder,
  fetchUrl,
  mapResponse,
  value,
  onChange,
  debounceMs = 250,
}: AsyncSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const debounceRef = useRef<number | null>(null);

  const triggerFetch = useCallback(
    async (q: string) => {
      try {
        setLoading(true);
        const res = await api.get(fetchUrl, { params: { searchParam: q } });
        const opts = mapResponse(res.data);
        setOptions(opts);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchUrl, mapResponse]
  );

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      triggerFetch(query.trim());
    }, debounceMs);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open, debounceMs, triggerFetch]);

  useEffect(() => {
    if (open && !query) triggerFetch('');
  }, [open, query, triggerFetch]);

  const onSelect = (opt: Option) => {
    onChange(opt.label, opt);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-64 justify-start">
          {value || placeholder || 'Select'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <Input
          autoFocus
          placeholder={placeholder || 'Search...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-2">
          <ScrollArea className="h-56">
            {loading ? (
              <div className="text-sm text-gray-500 p-2">Loading...</div>
            ) : options.length ? (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSelect(opt)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-gray-100"
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="text-sm text-gray-500 p-2">No results</div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
