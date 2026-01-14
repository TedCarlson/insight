'use client';

import { useEffect, useState } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DialogTitle } from '@radix-ui/react-dialog';

type Props = {
  personId?: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

type PersonForm = {
  full_name: string;
  role: string;
  org_id: string;
};

const EMPTY_FORM: PersonForm = {
  full_name: '',
  role: '',
  org_id: '',
};

export default function PersonOverlay({ personId, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<PersonForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personId) {
      setForm(EMPTY_FORM);
      return;
    }

    fetch(`/api/person?id=${personId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || typeof data !== 'object') {
          console.error('[PersonOverlay] Invalid response for personId:', data);
          return;
        }

        setForm({
          full_name: data.full_name ?? '',
          role: data.role ?? '',
          org_id: data.org_id ?? '',
        });
      })
      .catch((err) => {
        console.error('[PersonOverlay] Fetch failed:', err);
      });
  }, [personId]);

  function updateField<K extends keyof PersonForm>(field: K, value: PersonForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setLoading(true);

    const payload = {
      ...form,
      ...(personId ? { person_id: personId } : {}),
    };

    try {
      const res = await fetch('/api/person', {
        method: personId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('[PersonOverlay] Save failed:', err);
        return;
      }

      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} direction="right">
      <DrawerContent className="p-6 space-y-4 bg-white dark:bg-zinc-900 shadow-xl w-full max-w-md ml-auto h-full">
        <DialogTitle className="text-xl font-bold">
          {personId ? 'Edit Person' : 'Add Person'}
        </DialogTitle>

        {personId && (
          <div>
            <Label>Person ID</Label>
            <Input value={personId} readOnly disabled />
          </div>
        )}

        <div>
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} />
        </div>

        <div>
          <Label>Role</Label>
          <Input value={form.role} onChange={(e) => updateField('role', e.target.value)} />
        </div>

        <div>
          <Label>Org ID</Label>
          <Input value={form.org_id} onChange={(e) => updateField('org_id', e.target.value)} />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DrawerContent>
    </Drawer>
  );
}
