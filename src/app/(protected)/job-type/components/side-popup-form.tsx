// side-popup-form.tsx
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Check } from 'lucide-react';

export type FormField =
  | { key: string; label: string; type: 'text'; required?: boolean }
  | { key: string; label: string; type: 'textarea'; required?: boolean }
  | { key: string; label: string; type: 'toggle'; required?: boolean }
  | { key: string; label: string; type: 'select'; required?: boolean }
  | { key: string; label: string; type: 'duration'; required?: boolean };

interface SidePopupFormProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  fields: FormField[];
  defaultValues?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void;
  companies?: { company_id: string; name: string }[];
  worktypes?: { worktype_id: string; worktype_name: string }[]; 
}

export function SidePopupForm({
  isOpen,
  onClose,
  title = 'Add New Entry',
  fields,
  defaultValues,
  onSubmit,
  companies = [],
  worktypes = [],  
}: SidePopupFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    const initialData: Record<string, any> = {};
    fields.forEach((field) => {
      if (field.type === 'toggle') initialData[field.key] = 'active';
      else initialData[field.key] = '';
    });
    if (defaultValues) {
      Object.keys(defaultValues).forEach((k) => { initialData[k] = defaultValues[k]; });
    }
    setFormData(initialData);
  }, [defaultValues, fields, isOpen]);

  const handleChange = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));
  const toggleField = (key: string) => setFormData(prev => ({ ...prev, [key]: prev[key] === 'active' ? 'inactive' : 'active' }));
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit && onSubmit(formData); };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-card border-l border-border z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header (sticky) */}
          <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
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

          {/* Form (scrollable) */}
          <form
            className="flex-1 overflow-auto p-6 space-y-6"
            onSubmit={handleSubmit}
          >
            {fields.map((field) => (
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
                    value={typeof formData[field.key] === 'string' || typeof formData[field.key] === 'number' ? String(formData[field.key]) : ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full"
                    required={field.required}
                  />
                )}
                {field.type === 'duration' && (
                  <Input
                    id={field.key}
                    type="number"
                    min={0}
                    step={1}
                    value={typeof formData[field.key] === 'number' || typeof formData[field.key] === 'string' ? String(formData[field.key]) : ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full"
                    required={field.required}
                  />
                )}
                {field.type === 'textarea' && (
                  <Textarea
                    id={field.key}
                    value={typeof formData[field.key] === 'string' || typeof formData[field.key] === 'number' ? String(formData[field.key]) : ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full min-h-24 resize-none"
                    rows={4}
                  />
                )}
                {field.type === 'toggle' && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleField(field.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (formData[field.key] as boolean) ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          (formData[field.key] as boolean) ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-card-foreground font-medium">
                      {(formData[field.key] as boolean) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}
               {field.type === 'select' && (
    <select
      id={field.key}
      value={formData[field.key] || ''}
      onChange={(e) => handleChange(field.key, e.target.value)}
      className="w-full border rounded px-2 py-1"
      required={field.required}
    >
      <option value="">Select {field.label}</option>

      {/* ✅ Decide which options to show */}
      {field.key === "company_id" &&
        companies.map((c) => (
          <option key={c.company_id} value={c.company_id}>
            {c.name}
          </option>
        ))
      }
      {field.key === "worktype_id" &&
        worktypes.map((w) => (
          <option key={w.worktype_id} value={w.worktype_id}>
            {w.worktype_name}
          </option>
        ))
      }
    </select>
  )}
 {field.type === "duration" && (
  <div className="flex items-center gap-2">
     <Label htmlFor={`${field.key}-hours`} className="text-xs font-medium">Hours</Label>
    <Input
      type="number"
      min="0"
      placeholder="HH"
      value={Math.floor((formData[field.key] || 0) / 60)} // derive hours from total minutes
      onChange={(e) => {
        const hours = parseInt(e.target.value || "0", 10);
        const minutes = (formData[field.key] || 0) % 60;
        handleChange(field.key, hours * 60 + minutes); // store total minutes
      }}
      className="w-20"
      required={field.required}
    />
    <span className="text-lg font-bold">:</span>
    <Label htmlFor={`${field.key}-minutes`} className="text-xs font-medium">Minutes</Label>
    <Input
      type="number"
      min="0"
      max="59"
      placeholder="MM"
      value={(formData[field.key] || 0) % 60} // derive minutes
      onChange={(e) => {
        const minutes = parseInt(e.target.value || "0", 10);
        const hours = Math.floor((formData[field.key] || 0) / 60);
        handleChange(field.key, hours * 60 + minutes); // store total minutes
      }}
      className="w-20"
      required={field.required}
    />
  </div>
)}



              </div>
            ))}
          </form>
        </div>
      </div>
    </>
  );
}
