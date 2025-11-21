'use client';

import { useState, useEffect } from 'react';
import { getPatientById, type Patient } from '@/lib/actions';

export function usePatient(patientId?: string) {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!patientId) {
            setLoading(false);
            return;
        };

        const fetchPatient = async () => {
            setLoading(true);
            try {
                const fetchedPatient = await getPatientById(patientId);
                setPatient(fetchedPatient);
            } catch (error) {
                console.error("Failed to fetch patient:", error);
                setPatient(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPatient();
    }, [patientId]);

    return { patient, loading };
}
