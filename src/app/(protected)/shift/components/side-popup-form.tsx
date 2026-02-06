// side-popup-form.tsx
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FormField =
  | { key: string; label: string; type: 'text'; required?: boolean }
  | { key: string; label: string; type: 'textarea'; required?: boolean }
  | { key: string; label: string; type: 'toggle'; required?: boolean }
  | { key: string; label: string; type: 'select'; required?: boolean }
  | { key: string; label: string; type: 'time'; required?: boolean };

interface SidePopupFormProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  fields: FormField[];
  defaultValues?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void;
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
  const normalizeDefaults = (vals?: Record<string, unknown>) => {
    if (!vals) return {} as Record<string, any>;
    const out: Record<string, any> = {};
    Object.keys(vals).forEach((k) => {
      const v = vals[k];
      if (v === 'active' || v === 'true' || v === 1 || v === '1') out[k] = true;
      else if (v === 'inactive' || v === 'false' || v === 0 || v === '0') out[k] = false;
      else out[k] = v;
    });
    return out;
  };

  const [formValues, setFormValues] = useState<Record<string, any>>(normalizeDefaults(defaultValues));

  useEffect(() => {
    if (isOpen) setFormValues(normalizeDefaults(defaultValues));
  }, [isOpen, defaultValues]);

  const handleChange = (key: string, value: any) =>
    setFormValues((prev) => ({ ...prev, [key]: value }));

  const toggleField = (key: string) =>
    setFormValues((prev) => ({
      ...prev,
      [key]: prev[key] === 'active' ? 'inactive' : 'active',
    }));

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit && onSubmit(formValues);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed -inset-6 bg-black/50 z-100" onClick={onClose} />

      {/* Side Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-card border-l border-border z-100 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
            <h2 className="text-lg font-semibold text-card-foreground">
              {title}
            </h2>
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
                <Check />
              </Button>
            </div>
          </div>

          {/* Body */}
          <form
            className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto"
            onSubmit={handleFormSubmit}
          >
            {fields.map((field) => {
              // Special case: render start & end time side by side
              if (
                field.key === 'shift_startTime' ||
                field.key === 'shift_endTime'
              ) {
                return null; // handled together below
              }

              return (
                <div key={field.key} className="space-y-2">
                  <Label
                    htmlFor={field.key}
                    className="text-sm font-medium text-card-foreground"
                  >
                    {field.label}
                  </Label>

                  {field.type === 'text' && (
                    <Input
                      id={field.key}
                      type="text"
                      value={formValues[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full"
                      required={field.required}
                    />
                  )}

                  {field.type === 'textarea' && (
                    <Textarea
                      id={field.key}
                      value={formValues[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full min-h-24 resize-none"
                      rows={4}
                    />
                  )}

                  {field.type === 'toggle' && (
                    <div
                      onClick={() => handleChange(field.key, !Boolean(formValues[field.key]))}
                      className={cn(
                        'w-12 h-6 flex items-center rounded-full p-1 cursor-pointer',
                        Boolean(formValues[field.key]) ? 'bg-green-500' : 'bg-gray-300'
                      )}
                    >
                      <div
                        className={cn(
                          'bg-white w-4 h-4 rounded-full shadow-md transform duration-300',
                          Boolean(formValues[field.key]) ? 'translate-x-6' : ''
                        )}
                      />
                    </div>
                  )}

                  {field.type === 'select' && (
                    <select
                      id={field.key}
                      value={formValues[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full border rounded px-2 py-1"
                      required={field.required}
                    >
                      <option value="">Select {field.label}</option>
                      {field.key === 'company_id' &&
                        companies.map((c) => (
                          <option key={c.company_id} value={c.company_id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              );
            })}

            {/* Start & End Time side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="shift_startTime"
                  className="text-sm font-medium text-card-foreground"
                >
                  Start Time
                </Label>
                <Input
                  type="time"
                  id="shift_startTime"
                  value={formValues['shift_startTime'] || ''}
                  onChange={(e) => handleChange('shift_startTime', e.target.value)}
                  className="w-full"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="shift_endTime"
                  className="text-sm font-medium text-card-foreground"
                >
                  End Time
                </Label>
                <Input
                  type="time"
                  id="shift_endTime"
                  value={formValues['shift_endTime'] || ''}
                  onChange={(e) => handleChange('shift_endTime', e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
