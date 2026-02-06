'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Check } from 'lucide-react';

export type FormField =
  | { key: string; label: string; type: 'text'; required?: boolean }
  | { key: string; label: string; type: 'toggle'; required?: boolean }
  | { key: string; label: string; type: 'select'; required?: boolean };

interface SidePopupFormProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  fields: FormField[];
  defaultValues?: Record<string, unknown>;
  onSubmit?: (data: Record<string, unknown>) => void;
  countries?: { country_id: number; country_name: string }[];
  states?: { state_id: string; state_name: string; country_id: number }[];
  districts?: { district_id: string; district_name: string; state_id: string }[];
}

export function SidePopupForm({
  isOpen,
  onClose,
  title = 'Add New Entry',
  fields,
  defaultValues,
  onSubmit,
  countries = [],
  states = [],
  districts = []
}: SidePopupFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Initialize form data
  useEffect(() => {
    const initialData: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (field.type === 'toggle') initialData[field.key] = defaultValues?.[field.key] ?? true;
      else initialData[field.key] = defaultValues?.[field.key] ?? '';
    });
    setFormData(initialData);
  }, [defaultValues, fields, isOpen]);

  // Handle changes
  const handleChange = (key: string, value: unknown) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'country_id') {
        updated.state_id = '';
        updated.district_id = '';
      } else if (key === 'state_id') {
        updated.district_id = '';
      }
      return updated;
    });
  };

  const toggleField = (key: string) => setFormData(prev => ({ ...prev, [key]: !(prev[key] as boolean) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(formData);
  };

  if (!isOpen) return null;

  // Filter states/districts based on parent selection
  const filteredStates = states.filter(s => s.country_id === Number(formData.country_id));
  const filteredDistricts = districts.filter(d => d.state_id === formData.state_id);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-card border-l border-border z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
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
                onClick={handleSubmit}
                className="h-8 w-8 p-0 rounded-full bg-green-600 hover:bg-green-700"
              >
                <Check />
              </Button>
            </div>
          </div>

          {/* Form */}
          <form className="flex-1 flex flex-col relative p-6 space-y-6" onSubmit={handleSubmit}>
            {fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="text-sm font-medium text-card-foreground">
                  {field.label}
                </Label>

                {field.type === 'text' && (
                  <Input
                    id={field.key}
                    type="text"
                    value={typeof formData[field.key] === 'string' || typeof formData[field.key] === 'number' ? String(formData[field.key]) : ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    className="w-full"
                    required={field.required}
                  />
                )}

                {field.type === 'toggle' && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleField(field.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData[field.key] ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData[field.key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-card-foreground font-medium">
                      {formData[field.key] ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}

                {field.type === 'select' && (
                  <select
                    id={field.key}
                    value={typeof formData[field.key] === 'string' || typeof formData[field.key] === 'number' ? String(formData[field.key]) : ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    className="w-full border rounded px-2 py-1"
                    required={field.required}
                  >
                    <option value="">Select {field.label}</option>
                    {field.key === 'country_id' && countries.map(c => (
                      <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
                    ))}
                    {field.key === 'state_id' && filteredStates.map(s => (
                      <option key={s.state_id} value={s.state_id}>{s.state_name}</option>
                    ))}
                    {field.key === 'district_id' && filteredDistricts.map(d => (
                      <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </form>
        </div>
      </div>
    </>
  );
}
