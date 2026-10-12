import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { indiaToday } from '@/lib/india-date.ts';
import { useCreateActivity } from '../hooks/use-activity.ts';

type ActivityAddFormProps = {
  projectId: string;
};

export function ActivityAddForm({ projectId }: ActivityAddFormProps) {
  const add = useCreateActivity(projectId);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [activityDate, setActivityDate] = useState(indiaToday());

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate(
          { title, activityDate, ...(detail === '' ? {} : { detail }) },
          {
            onSuccess: () => {
              setTitle('');
              setDetail('');
            },
          },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="activity-title">Entry</Label>
          <Input
            id="activity-title"
            required
            maxLength={120}
            placeholder="Second round of de-suckering"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-date">Date</Label>
          <Input
            id="activity-date"
            type="date"
            required
            max={indiaToday()}
            value={activityDate}
            onChange={(event) => {
              setActivityDate(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-detail">Detail</Label>
        <Textarea
          id="activity-detail"
          rows={2}
          value={detail}
          onChange={(event) => {
            setDetail(event.target.value);
          }}
        />
      </div>

      {add.error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {add.error.message}
        </p>
      )}

      <Button type="submit" disabled={add.isPending}>
        {add.isPending ? 'Adding…' : 'Add entry'}
      </Button>
    </form>
  );
}
