// apps/web/src/components/prod/PersonList.tsx

'use client';
import { Button } from '@/components/ui/button';

interface Props {
  data: any[];
  onEdit: (personId: string) => void;
}

export default function PersonList({ data, onEdit }: Props) {
  return (
    <table className="min-w-full mt-2 text-sm border">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-3 py-2 border-b">Person ID</th>
          <th className="px-3 py-2 border-b">Full Name</th>
          <th className="px-3 py-2 border-b">Role</th>
          <th className="px-3 py-2 border-b">PC Org ID</th>
          <th className="px-3 py-2 border-b">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.person_id}>
            <td className="px-3 py-2 border-b">{p.person_id}</td>
            <td className="px-3 py-2 border-b">{p.full_name}</td>
            <td className="px-3 py-2 border-b">{p.role}</td>
            <td className="px-3 py-2 border-b">{p.org_id}</td>
            <td className="px-3 py-2 border-b space-x-2">
              <Button size="sm" onClick={() => onEdit(p.person_id)}>
                Edit
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
