
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { getPatientById, type Patient } from '@/lib/actions';

export function usePatient() {
  const { profile, loading: userLoading } = useUser();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatientData() {
      if (userLoading) return;

      if (profile?.patientId) {
        try {
          const patientData = await getPatientById(profile.patientId);
          setPatient(patientData);
        } catch (error) {
          console.error("Failed to fetch patient data:", error);
          setPatient(null);
        }
      } else {
        setPatient(null);
      }
      setLoading(false);
    }

    fetchPatientData();
  }, [profile, userLoading]);

  return { patient, loading };
}
