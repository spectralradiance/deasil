// Date/time picker dialog; syncs its internal value to the caller's current time each time it opens.

'use client';
import { useState, useEffect } from 'react';
import { Box, Dialog, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
import { PickersActionBar, PickersActionBarProps } from '@mui/x-date-pickers/PickersActionBar';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/en-gb';

interface FormatActionBarProps extends PickersActionBarProps {
  use24h: boolean;
  useDMY: boolean;
  onUse24hChange: (value: boolean) => void;
  onUseDMYChange: (value: boolean) => void;
}

function FormatActionBar({
  use24h, useDMY, onUse24hChange, onUseDMYChange, className, ...actionBarProps
}: FormatActionBarProps) {
  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', gap: 1.5, px: 2, pb: 1.5 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Time</InputLabel>
          <Select
            value={use24h ? '24h' : '12h'}
            label="Time"
            onChange={e => onUse24hChange(e.target.value === '24h')}
          >
            <MenuItem value="12h">AM/PM</MenuItem>
            <MenuItem value="24h">24-hour</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Date</InputLabel>
          <Select
            value={useDMY ? 'dmy' : 'mdy'}
            label="Date"
            onChange={e => onUseDMYChange(e.target.value === 'dmy')}
          >
            <MenuItem value="mdy">Month/Day</MenuItem>
            <MenuItem value="dmy">Day/Month</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <PickersActionBar {...actionBarProps} />
    </Box>
  );
}

interface Props {
  open: boolean;
  initialTime: Date;
  use24h: boolean;
  useDMY: boolean;
  onUse24hChange: (value: boolean) => void;
  onUseDMYChange: (value: boolean) => void;
  onAccept: (date: Date) => void;
  onClose: () => void;
}

export default function CalendarDialog({
  open, initialTime, use24h, useDMY,
  onUse24hChange, onUseDMYChange, onAccept, onClose,
}: Props) {
  const [pickedDayjs, setPickedDayjs] = useState<Dayjs | null>(null);

  // Sync picker to current time whenever the dialog opens
  useEffect(() => {
    if (open) setPickedDayjs(dayjs(initialTime));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose}
      PaperProps={{ sx: { bgcolor: '#000', backgroundImage: 'none' } }}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={useDMY ? 'en-gb' : 'en'}>
        <StaticDateTimePicker
          value={pickedDayjs}
          onChange={setPickedDayjs}
          ampm={!use24h}
          onAccept={(val) => {
            if (val) onAccept(val.second(0).millisecond(0).toDate());
            onClose();
          }}
          onClose={onClose}
          slots={{ actionBar: FormatActionBar }}
          slotProps={{
            actionBar: {
              actions: ['cancel', 'accept'],
              use24h,
              useDMY,
              onUse24hChange,
              onUseDMYChange,
            } as PickersActionBarProps,
          }}
        />
      </LocalizationProvider>
    </Dialog>
  );
}
