// Date/time picker dialog; syncs its internal value to the caller's current time each time it opens.

'use client';
import { useState, useEffect } from 'react';
import { Dialog } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
import dayjs, { Dayjs } from 'dayjs';

interface Props {
  open: boolean;
  initialTime: Date;
  onAccept: (date: Date) => void;
  onClose: () => void;
}

export default function CalendarDialog({ open, initialTime, onAccept, onClose }: Props) {
  const [pickedDayjs, setPickedDayjs] = useState<Dayjs | null>(null);

  // Sync picker to current time whenever the dialog opens
  useEffect(() => {
    if (open) setPickedDayjs(dayjs(initialTime));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose}
      PaperProps={{ sx: { bgcolor: '#000', backgroundImage: 'none' } }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <StaticDateTimePicker
          value={pickedDayjs}
          onChange={setPickedDayjs}
          onAccept={(val) => {
            if (val) onAccept(val.second(0).millisecond(0).toDate());
            onClose();
          }}
          onClose={onClose}
          slotProps={{ actionBar: { actions: ['cancel', 'accept'] } }}
        />
      </LocalizationProvider>
    </Dialog>
  );
}
