import React from 'react';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect, useRouter } from 'next/navigation';
import { Container } from '@/components/Container';
import Link from 'next/link';
import { UserProfile } from '@/types/userProfile';
import { VolunteerApplicationDetail } from '@/types/volunteerApplicationDetail'; // Import the new type
import { format } from 'date-fns';
import { PencilSquareIcon } from '@/components/Icons';
import { DocumentTextIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/20/solid';
import { fetchUserProfileServerSide } from '@/utils/serverAppUtils';

// Placeholder for the client component that will handle status updates
// import VolunteerApplicationReviewForm from '@/components/admin/VolunteerApplicationReviewForm';

// --- Server-Side Fetch Function for Full Application Details ---
async function fetchSingleVolunteerApplication(
    applicationId: number,
    accessToken: string | undefined
): Promise<VolunteerApplicationDetail | null> {
    const apiBaseUrl = process.env.API_BASE_URL_SSR || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl || !accessToken) {
        console.error("fetchSingleVolunteerApplication: Missing API base URL or access token.");
        return null;
    }
    const url = `${apiBaseUrl}/volunteer-applications/${applicationId}`;
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store',
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error fetching volunteer application ${applicationId}: ${response.status}`, errorText.substring(0, 500));
            return null;
        }
        return await response.json() as VolunteerApplicationDetail;
    } catch (error) {
        console.error(`Error in fetchSingleVolunteerApplication for ID ${applicationId}:`, error);
        return null;
    }
}

// Detail Item Helper for structured display
const DetailItem = ({ label, children, isFullWidth = false, isTextArea = false, isBoolean = false }: {
    label: string;
    children: React.ReactNode;
    isFullWidth?: boolean;
    isTextArea?: boolean;
    isBoolean?: boolean;
}) => {
    let displayValue = children;
    if (children === null || children === undefined || (typeof children === 'string' && children.trim() === '')) {
        displayValue = <span className="italic text-gray-500 dark:text-gray-400">N/A</span>;
    } else if (isBoolean && typeof children === 'boolean') {
        displayValue = children ? <span className="text-green-600 dark:text-green-400">Yes</span> : <span className="text-red-600 dark:text-red-400">No</span>;
    }

    return (
        <div className={`py-3 sm:py-4 ${isFullWidth ? 'sm:col-span-2' : 'sm:grid sm:grid-cols-3 sm:gap-4'}`}>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${isFullWidth ? '' : 'sm:mt-0 sm:col-span-2'} ${isTextArea ? 'whitespace-pre-wrap' : ''}`}>
                {displayValue}
            </dd>
        </div>
    );
};

export default async function AdminVolunteerApplicationReviewPage({ params }: { params: { applicationId: string } }) {
    const applicationId = parseInt(params.applicationId, 10);
    if (isNaN(applicationId)) {
        return <Container className="py-10 text-center text-red-500">Invalid Application ID.</Container>;
    }

    const session = await getSession();
    if (!session?.user || !session.accessToken) {
        redirect(`/admin-login?returnTo=/admin/volunteer-applications/review/${applicationId}`);
    }

    const userProfile = await fetchUserProfileServerSide(session.accessToken);
    if (!userProfile) { redirect(`/admin-login?error=profile_fetch_failed&returnTo=/admin/volunteer-applications/review/${applicationId}`); }

    const allowedRoles = ['Admin', 'Staff'];
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
        redirect('/admin?error=unauthorized_volunteer_review');
    }

    const application = await fetchSingleVolunteerApplication(applicationId, session.accessToken);

    if (!application) {
        return (
            <Container className="py-10 text-center">
                <h1 className="text-2xl font-bold text-red-600">Volunteer Application Not Found</h1>
                <p className="mt-4">Could not find details for application ID: {applicationId}</p>
                <Link href="/admin/volunteer-applications" className="mt-6 inline-block text-indigo-600 hover:underline">
                    Back to Volunteer Applications List
                </Link>
            </Container>
        );
    }

    const getStatusColor = (status: string) => {
        status = status.toLowerCase();
        if (status === 'approved') return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
        if (status === 'rejected' || status === 'withdrawn') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
        if (status === 'on hold' || status === 'contacted') return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'; // Pending Review
    };

    return (
        <Container className="py-10">
            <div className="mb-6">
                <Link href="/admin/volunteer-applications" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                    &larr; Back to Volunteer Applications List
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg">
                {/* Header Section */}
                <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <DocumentTextIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                Volunteer Application Review
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Applicant: {application.firstName} {application.lastName} (App ID: {application.id})
                            </p>
                        </div>
                        <span className={`mt-2 sm:mt-0 px-3 py-1 inline-block text-sm leading-5 font-semibold rounded-full ${getStatusColor(application.status)}`}>
                            Status: {application.status}
                        </span>
                    </div>
                </div>

                {/* Application Details Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
                    <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
                        <DetailItem label="Submission Date">{format(new Date(application.submissionDate), 'PPP p')}</DetailItem>

                        <div className="py-3 sm:col-span-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">Applicant Information</h4></div>
                        <DetailItem label="Name">{application.firstName} {application.lastName}</DetailItem>
                        <DetailItem label="Spouse/Partner/Roommate">{application.spousePartnerRoommate}</DetailItem>
                        <DetailItem label="Address" isFullWidth>{`${application.streetAddress}${application.aptUnit ? `, ${application.aptUnit}` : ''}, ${application.city}, ${application.stateProvince} ${application.zipPostalCode}`}</DetailItem>
                        <DetailItem label="Primary Email">{application.primaryEmail}</DetailItem>
                        <DetailItem label="Primary Phone">{application.primaryPhone} ({application.primaryPhoneType})</DetailItem>
                        {application.secondaryEmail && <DetailItem label="Secondary Email">{application.secondaryEmail}</DetailItem>}
                        {application.secondaryPhone && <DetailItem label="Secondary Phone">{application.secondaryPhone} ({application.secondaryPhoneType})</DetailItem>}
                        <DetailItem label="Heard Via">{application.howHeard}</DetailItem>

                        <div className="py-3 sm:col-span-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 pt-2">Volunteering Details</h4></div>
                        <DetailItem label="18+ Years Old?">{application.ageConfirmation}</DetailItem>
                        <DetailItem label="Previous Volunteer Experience?">{application.previousVolunteerExperience}</DetailItem>
                        {application.previousVolunteerExperience?.toLowerCase() === 'yes' && <DetailItem label="Experience Details" isTextArea>{application.previousExperienceDetails}</DetailItem>}
                        <DetailItem label="Comfort with Special Needs">{application.comfortLevelSpecialNeeds}</DetailItem>
                        <DetailItem label="Areas of Interest" isTextArea>{application.areasOfInterest}</DetailItem>
                        <DetailItem label="Other Skills" isTextArea>{application.otherSkills}</DetailItem>
                        <DetailItem label="Location Acknowledged" isBoolean>{application.locationAcknowledgement}</DetailItem>
                        <DetailItem label="Reason for Volunteering">{application.volunteerReason}</DetailItem>
                        <DetailItem label="Emergency Contact">{application.emergencyContactName} - {application.emergencyContactPhone}</DetailItem>
                        <DetailItem label="Crime Conviction Check">{application.crimeConvictionCheck}</DetailItem>
                        <DetailItem label="Policy Acknowledged" isBoolean>{application.policyAcknowledgement}</DetailItem>

                        <div className="py-3 sm:col-span-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 pt-2">Waiver Agreement</h4></div>
                        <DetailItem label="Waiver Agreed" isBoolean>{application.waiverAgreed}</DetailItem>
                        <DetailItem label="E-Signature Name">{application.eSignatureName}</DetailItem>
                        <DetailItem label="Agreement Timestamp">{application.waiverAgreementTimestamp ? format(new Date(application.waiverAgreementTimestamp), 'PPP p') : 'N/A'}</DetailItem>

                        <div className="py-3 sm:col-span-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 pt-2">Admin Review</h4></div>
                        <DetailItem label="Reviewed By">{application.reviewedByName}</DetailItem>
                        <DetailItem label="Review Date">{application.reviewDate ? format(new Date(application.reviewDate), 'PPP p') : 'N/A'}</DetailItem>
                        <DetailItem label="Internal Notes (All)" isTextArea>{application.internalNotes}</DetailItem>
                    </dl>
                </div>

                {/* Placeholder for Client Component for Status Update Form */}
                {/* <div className="px-4 py-5 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                    <VolunteerApplicationReviewForm
                        applicationId={application.id}
                        currentStatus={application.status}
                        // onUpdateSuccess will trigger router.refresh() inside the client component
                    />
                </div>*/}
            </div>
        </Container>
    );
}
