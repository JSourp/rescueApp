import React from 'react';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import { Container } from '@/components/Container';
import Link from 'next/link';
import { format } from 'date-fns';
import { DocumentTextIcon } from '@heroicons/react/20/solid';
import { fetchUserProfileServerSide } from '@/utils/serverAppUtils';
import AdoptionApplicationReviewForm from '@/components/admin/AdoptionApplicationReviewForm';

// Fetch function specifically for Adoption Application
async function fetchSingleAdoptionApplication(applicationId: number, accessToken: string | undefined) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const response = await fetch(`${apiBaseUrl}/adoption-applications/${applicationId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store',
    });
    return response.ok ? await response.json() : null;
}

const DetailItem = ({ label, children, isTextArea = false }: { label: string; children: React.ReactNode; isTextArea?: boolean }) => (
    <div className="sm:grid sm:grid-cols-3 sm:gap-4 py-3">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className={`mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 ${isTextArea ? 'whitespace-pre-wrap' : ''}`}>
            {children || <span className="italic text-gray-400">N/A</span>}
        </dd>
    </div>
);

export default async function AdminAdoptionApplicationReviewPage({ params }: { params: { applicationId: string } }) {
    const applicationId = parseInt(params.applicationId, 10);
    const session = await getSession();
    if (!session?.user || !session.accessToken) redirect('/admin-login');

    const userProfile = await fetchUserProfileServerSide(session.accessToken);
    if (!userProfile || !['Admin', 'Staff'].includes(userProfile.role)) redirect('/');

    const application = await fetchSingleAdoptionApplication(applicationId, session.accessToken);

    if (!application) return <Container className="py-10 text-center">Application not found.</Container>;

    return (
        <Container className="py-10">
            <Link href="/admin/adoption-applications" className="text-text-link hover:underline">&larr; Back to Applications</Link>

            <div className="bg-white shadow-xl rounded-lg mt-6 overflow-hidden">
                <div className="px-6 py-5 bg-gray-50 border-b">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <DocumentTextIcon className="w-8 h-8 text-primary" />
                        Adoption Application Review
                    </h1>
                    <p className="text-sm text-gray-600">Applicant: {application.firstName} {application.lastName}</p>
                </div>

                <div className="p-6">
					<dl className="divide-y divide-gray-200">
						<DetailItem label="Submission Date">{format(new Date(application.submissionDate), 'PPP p')}</DetailItem>
						<DetailItem label="Email">{application.primaryEmail}</DetailItem>
						<DetailItem label="Phone">{application.primaryPhone} ({application.primaryPhoneType})</DetailItem>
						<DetailItem label="Address">{`${application.streetAddress}, ${application.city}, ${application.stateProvince} ${application.zipPostalCode}`}</DetailItem>
						<DetailItem label="Which Animal" isTextArea>{application.whichAnimalText}</DetailItem>
						<DetailItem label="Internal Notes" isTextArea>{application.internalNotes}</DetailItem>
					</dl>
				</div>

                <div className="p-6 border-t bg-gray-50">
                    <AdoptionApplicationReviewForm
                        applicationId={application.id}
                        currentStatus={application.status}
                    />
                </div>
            </div>
        </Container>
    );
}
