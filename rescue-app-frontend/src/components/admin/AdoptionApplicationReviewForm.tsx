'use client';
import React, { useState } from 'react';
import { getAuth0AccessToken } from '@/utils/auth';

export default function AdoptionApplicationReviewForm({ applicationId, currentStatus, onUpdate, onClose }: any) {
    const [newStatus, setNewStatus] = useState(currentStatus);
    const [internalNotes, setInternalNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = await getAuth0AccessToken();
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/adoption-applications/${applicationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ newStatus, internalNotes }),
        });
        onUpdate();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full p-2 border rounded">
                {['Pending Review', 'Approved', 'Rejected', 'On Hold', 'Withdrawn'].map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
            <textarea
                className="w-full p-2 border rounded"
                placeholder="Internal notes..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
            />
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded">Save Update</button>
        </form>
    );
}
