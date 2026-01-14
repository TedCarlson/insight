// apps/web/src/app/(prod)/person/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import PersonOverlay from './PersonOverlay';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Person = {
  person_id: string;
  full_name: string;
  role: string;
  org_id: string;
};

export default function PersonPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | undefined>(
    undefined
  );

  const supabase = createClientComponentClient();

  const fetchPeople = async () => {
    const { data, error } = await supabase
      .from('person')
      .select('*')
      .order('full_name', { ascending: true });

    if (!error) {
      setPeople(data || []);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleAdd = () => {
    setEditingPersonId(undefined);
    setOverlayOpen(true);
  };

  const handleEdit = (personId: string) => {
    setEditingPersonId(personId);
    setOverlayOpen(true);
  };

  const handleSaved = () => {
    setOverlayOpen(false);
    fetchPeople();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">People</h1>
        <Button onClick={handleAdd}>Add Person</Button>
      </div>

      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left px-4 py-2">Full Name</th>
            <th className="text-left px-4 py-2">Role</th>
            <th className="text-left px-4 py-2">Org</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.person_id} className="border-t">
              <td className="px-4 py-2">{person.full_name}</td>
              <td className="px-4 py-2">{person.role}</td>
              <td className="px-4 py-2">{person.org_id}</td>
              <td className="px-4 py-2 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(person.person_id)}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <PersonOverlay
        personId={editingPersonId}
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
