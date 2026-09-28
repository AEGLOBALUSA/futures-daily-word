import { useEffect, useState } from 'react';
import { restoreStaffSession, STAFF_SESSION_EVENT } from '../utils/staffIdentity';
import type { StaffRecord } from '../utils/staffIdentity';

export function useAlphaStaff(): StaffRecord | null {
  const [staff, setStaff] = useState<StaffRecord | null>(null);

  useEffect(() => {
    let mounted = true;
    const restore = () => {
      restoreStaffSession().then(next => {
        if (mounted) setStaff(next);
      });
    };
    restore();
    window.addEventListener(STAFF_SESSION_EVENT, restore);
    return () => {
      mounted = false;
      window.removeEventListener(STAFF_SESSION_EVENT, restore);
    };
  }, []);

  return staff;
}
