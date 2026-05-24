'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '@/components/Container';
import Modal from '@/components/Modal';
import { LoadingSpinner } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth';
import { format } from 'date-fns';
import AdoptionApplicationReviewForm from '@/components/admin/AdoptionApplicationReviewForm';

export default function AdminAdoptionApplicationsPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any | null>(null);

    const loadApplications = useCallback(async () => {
        const token = await getAuth0AccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/adoption-applications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setApplications(await res.json());
        setIsLoading(false);
    }, []);

    useEffect(() => { loadApplications(); }, [loadApplications]);

    return (
        <Container className="py-10">
            <h1 className="text-3xl font-bold mb-6">Manage Adoption Applications</h1>
            {isLoading ? <LoadingSpinner /> : (
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {applications.map(app => (
                                <tr key={app.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {app.firstName} {app.lastName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{app.status}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => { setSelectedApp(app); setIsModalOpen(true); }} className="text-primary hover:underline">
                                            View/Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && selectedApp && (
                <Modal onClose={() => setIsModalOpen(false)}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4">Review: {selectedApp.firstName} {selectedApp.lastName}</h2>
                        <div className="space-y-2 mb-6">
                            <p><strong>Email:</strong> {selectedApp.primaryEmail}</p>
                            <p><strong>Phone:</strong> {selectedApp.primaryPhone}</p>
                            <p><strong>Address:</strong> {selectedApp.streetAddress}, {selectedApp.city}</p>
                        </div>
                        <AdoptionApplicationReviewForm
                            applicationId={selectedApp.id}
                            currentStatus={selectedApp.status}
                            onUpdate={loadApplications}
                            onClose={() => setIsModalOpen(false)}
                        />
                    </div>
                </Modal>
            )}
        </Container>
    );
}
