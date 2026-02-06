// side-popup-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { Textarea } from '@/components/ui/textarea';

export type FormField =
  | { key: string; label: string; type: 'text'; required?: boolean; disabled?: boolean; readonly?: boolean }
  | { key: string; label: string; type: 'textarea'; required?: boolean; disabled?: boolean; readonly?: boolean }
  | { key: string; label: string; type: 'toggle'; required?: boolean; disabled?: boolean; readonly?: boolean }
  | { key: string; label: string; type: 'select'; required?: boolean; disabled?: boolean; readonly?: boolean };

interface SidePopupFormProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  fields: FormField[];
  defaultValues?: Record<string, unknown>;
  onSubmit?: (data: Record<string, unknown>) => void;
  companies?: { company_id: string; name: string }[];
}

export function SidePopupForm({
  isOpen,
  onClose,
  title = 'Add New Entry',
  fields,
  defaultValues,
  onSubmit,
  companies = [],
}: SidePopupFormProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>(defaultValues ?? {});

  useEffect(() => {
    if (isOpen) setFormValues(defaultValues ?? {});
  }, [isOpen, defaultValues]);

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit && onSubmit(formValues);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex justify-end bg-black/30">
      <div className="relative w-96 h-full bg-white shadow-xl flex flex-col ">
        {/* Header with buttons */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full border-2 hover:bg-red-50 hover:border-red-300 bg-transparent"
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={handleFormSubmit}
              className="h-8 w-8 p-0 rounded-full bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Form Fields */}
        <form
          className="p-4 flex-1 overflow-y-auto space-y-4"
          onSubmit={handleFormSubmit}
        >
          {fields.map((field) => (
            <div key={field.key} className="flex flex-col">
              <Label htmlFor={field.key} className="mb-1">
                {field.label}
              </Label>

              {field.type === 'text' && (
                <Input
                  id={field.key}
                  type="text"
                  value={typeof formValues[field.key] === 'string' || typeof formValues[field.key] === 'number' ? String(formValues[field.key]) : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(field.key, e.target.value)}
                  className="w-full"
                  required={field.required}
                  disabled={field.disabled}
                  readOnly={field.readonly}
                />
              )}

              {field.type === 'textarea' && (
                <Textarea
                  id={field.key}
                  value={typeof formValues[field.key] === 'string' || typeof formValues[field.key] === 'number' ? String(formValues[field.key]) : ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(field.key, e.target.value)}
                  className="w-full min-h-24 resize-none"
                  rows={4}
                  disabled={field.disabled}
                  readOnly={field.readonly}
                />
              )}

              {field.type === 'toggle' && (
                <div
                  onClick={() =>
                    handleChange(field.key, !formValues[field.key])
                  }
                  className={cn(
                    'w-12 h-6 flex items-center rounded-full p-1 cursor-pointer',
                    formValues[field.key] ? 'bg-green-500' : 'bg-gray-300'
                  )}
                >
                  <div
                    className={cn(
                      'bg-white w-4 h-4 rounded-full shadow-md transform duration-300',
                      formValues[field.key] ? 'translate-x-6' : ''
                    )}
                  />
                </div>
              )}

              {field.type === 'select' && (
                <select
                  id={field.key}
                  value={typeof formValues[field.key] === 'string' || typeof formValues[field.key] === 'number' ? String(formValues[field.key]) : ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange(field.key, e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  required={field.required}
                  disabled={field.disabled}
                >
                  <option value="">Select {field.label}</option>
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </form>
      </div>
    </div>
  );
}
