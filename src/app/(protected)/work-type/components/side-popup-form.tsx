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
  | { key: string; label: string; type: 'select'; required?: boolean };

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
      <div className="fixed -inset-6 bg-black/50 z-100" onClick={onClose} />
      <div className={`fixed right-0 top-0 h-full w-96 bg-card border-l border-border z-100 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}  className="h-8 w-8 p-0 rounded-full border-2 hover:bg-red-50 hover:border-red-300 bg-transparent">
                <X  className="h-4 w-4 text-red-600" />
                </Button>
              <Button type="submit" size="sm" onClick={handleSubmit} className="h-8 w-8 p-0 rounded-full bg-green-600 hover:bg-green-700">
                <Check />
              </Button>
            </div>
          </div>
          <form className="flex-1 flex flex-col relative p-6 space-y-6" onSubmit={handleSubmit}>
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="text-sm font-medium text-card-foreground">{field.label}</Label>

                {field.type === 'text' && (
                  <Input id={field.key} type="text" value={formData[field.key] || ''} onChange={(e) => handleChange(field.key, e.target.value)} className="w-full" required={field.required} />
                )}
                {field.type === 'textarea' && (
                  <Textarea id={field.key} value={formData[field.key] || ''} onChange={(e) => handleChange(field.key, e.target.value)} className="w-full min-h-24 resize-none" rows={4} />
                )}
                {field.type === 'toggle' && (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => toggleField(field.key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData[field.key] === 'active' ? 'bg-green-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData[field.key] === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-card-foreground font-medium">{formData[field.key] === 'active' ? 'Active' : 'Inactive'}</span>
                  </div>
                )}
                {field.type === 'select' && (
                  <select id={field.key} value={formData[field.key] || ''} onChange={(e) => handleChange(field.key, e.target.value)} className="w-full border rounded px-2 py-1" required={field.required}>
                    <option value="">Select {field.label}</option>
                    {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
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
