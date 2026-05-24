'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '@/components/Container';
import Modal from '@/components/Modal';
import { LoadingSpinner } from '@/components/Icons';
import { UserGroupIcon } from '@heroicons/react/20/solid';
import { UserProfile } from '@/types/userProfile';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getAuth0AccessToken } from '@/utils/auth';
import { format } from 'date-fns';

// Define the type for the filters object
interface AdoptionAppFilters {
    status: string;
}

// Define the type for data needed for the update DTO
interface UpdateApplicationData {
    newStatus: string;
    internalNotes?: string;
}

// Minimal types for the frontend to prevent TS errors
interface AdoptionApplicationListItem {
    id: number;
    submissionDate: string;
    applicantName: string;
    primaryEmail: string;
    primaryPhone: string;
    status: string;
    whichAnimal?: string;
    reviewedBy?: string;
    reviewDate?: string;
}

interface AdoptionApplicationDetail {
    id: number;
    submissionDate: string;
    status: string;
    firstName: string;
    lastName: string;
    primaryEmail: string;
    primaryPhone: string;
    primaryPhoneType: string;
    streetAddress: string;
    city: string;
    stateProvince: string;
    zipPostalCode: string;
    whichAnimalText?: string;
    whyAdopt?: string;
    internalNotes?: string;
    reviewedByName?: string;
    reviewDate?: string;
}

// Fetch function for applications
async function fetchAdoptionApplications(
    filters: AdoptionAppFilters,
    sortBy: string,
    accessToken: string
): Promise<AdoptionApplicationListItem[]> {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
        throw new Error("API Base URL is not configured. Please check environment variables.");
    }
    const endpoint = `${apiBaseUrl}/adoption-applications`;
    const queryParams = new URLSearchParams();

    if (filters.status) queryParams.append('status', filters.status);
    if (sortBy) queryParams.append('sortBy', sortBy);

    const url = `${endpoint}?${queryParams.toString()}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store'
        });

        if (!response.ok) {
            let errorBodyText = await response.text().catch(() => "Could not read error body.");
            throw new Error(`API Error: ${response.status} - ${response.statusText}. Body: ${errorBodyText.substring(0, 100)}`);
        }

        return await response.json() as AdoptionApplicationListItem[];
    } catch (error) {
        console.error('Error fetching adoption applications:', error);
        throw error;
    }
}

// --- Fetch function for a single application's full details ---
async function fetchAdoptionApplicationDetail(
    applicationId: number,
    accessToken: string
): Promise<AdoptionApplicationDetail | null> {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const endpoint = `${apiBaseUrl}/adoption-applications/${applicationId}`;

    try {
        const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store'
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `API Error: ${response.status}`);
        }
        return await response.json() as AdoptionApplicationDetail;
    } catch (error) {
        console.error(`Error fetching detail for application ${applicationId}:`, error);
        throw error;
    }
}

async function fetchCurrentUserProfile(accessToken: string | null): Promise<UserProfile | null> {
    if (!accessToken) return null;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
        const response = await fetch(`${apiBaseUrl}/users/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store'
        });
        if (!response.ok) return null;
        return await response.json() as UserProfile;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

// Possible statuses for filtering and updating
const applicationStatuses = ['Pending Review', 'Approved', 'Rejected', 'On Hold', 'Withdrawn'];

export default function AdminAdoptionApplicationsPage() {
    const { user: auth0User, isLoading: isAuthLoading } = useUser();
    const [applications, setApplications] = useState<AdoptionApplicationListItem[]>([]);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [errorData, setErrorData] = useState<string | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [isLoadingRole, setIsLoadingRole] = useState<boolean>(true);

    const [statusFilter, setStatusFilter] = useState<string>('Pending Review');
    const [sortBy, setSortBy] = useState('submissionDate_desc');
    const sortingOptions = [
        { value: 'submissionDate_desc', label: 'Submission Date (Newest)' },
        { value: 'submissionDate_asc', label: 'Submission Date (Oldest)' },
        { value: 'applicantName_asc', label: 'Applicant Name (A-Z)' },
        { value: 'applicantName_desc', label: 'Applicant Name (Z-A)' },
        { value: 'status_asc', label: 'Status (A-Z)' },
    ];

    // --- State for Review Modal ---
    const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
    const [selectedApplicationSummary, setSelectedApplicationSummary] = useState<AdoptionApplicationListItem | null>(null);
    const [applicationDetail, setApplicationDetail] = useState<AdoptionApplicationDetail | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
    const [newStatus, setNewStatus] = useState<string>('');
    const [internalNotes, setInternalNotes] = useState<string>('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Fetch User Role Effect
    useEffect(() => {
        const loadUserRole = async () => {
            if (isAuthLoading || !auth0User) {
                setIsLoadingRole(isAuthLoading);
                if (!isAuthLoading && !auth0User) setCurrentUserRole("Guest");
                return;
            }
            setIsLoadingRole(true);
            const token = await getAuth0AccessToken();
            const profile = await fetchCurrentUserProfile(token);
            setCurrentUserRole(profile?.role ?? "Guest");
            setCurrentUserProfile(profile);
            setIsLoadingRole(false);
        };
        loadUserRole();
    }, [auth0User, isAuthLoading]);

    // Fetch Applications Data
    const loadApplications = useCallback(async () => {
        if (isAuthLoading || isLoadingRole || !currentUserProfile || !['Admin', 'Staff'].includes(currentUserProfile.role ?? '')) {
            if (!isAuthLoading && !isLoadingRole) setIsLoadingData(false);
            return;
        }
        setIsLoadingData(true); setErrorData(null);
        const token = await getAuth0AccessToken();
        if (!token) {
            setErrorData("Authentication token missing.");
            setIsLoadingData(false);
            return;
        }
        try {
            const filters = { status: statusFilter };
            const fetchedApps = await fetchAdoptionApplications(filters, sortBy, token);
            setApplications(fetchedApps);
        } catch (err) {
            setErrorData(err instanceof Error ? err.message : 'Failed to load applications');
        }
        finally { setIsLoadingData(false); }
    }, [statusFilter, sortBy, isAuthLoading, isLoadingRole, currentUserProfile]);

    useEffect(() => { loadApplications(); }, [loadApplications]);

    // --- Handlers ---
    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value);
    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value);

    const handleReviewClick = async (appSummary: AdoptionApplicationListItem) => {
        setSelectedApplicationSummary(appSummary);
        setApplicationDetail(null);
        setIsLoadingDetail(true);
        setNewStatus(appSummary.status);
        setInternalNotes('');
        setUpdateError(null);
        setIsReviewModalOpen(true);

        const token = await getAuth0AccessToken();
        if (!token) {
            setUpdateError("Authentication token missing to fetch details.");
            setIsLoadingDetail(false);
            return;
        }
        try {
            const detail = await fetchAdoptionApplicationDetail(appSummary.id, token);
            setApplicationDetail(detail);
        } catch (err) {
            setUpdateError(err instanceof Error ? err.message : "Failed to load application details.");
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleCloseReviewModal = () => {
        setIsReviewModalOpen(false);
        setSelectedApplicationSummary(null);
    };

    const handleStatusUpdate = async () => {
        if (!applicationDetail || !newStatus) return;

        setIsUpdatingStatus(true);
        setUpdateError(null);
        const token = await getAuth0AccessToken();
        if (!token) {
            setUpdateError("Authentication token missing.");
            setIsUpdatingStatus(false); return;
        }

        const payload: UpdateApplicationData = {
            newStatus: newStatus,
            internalNotes: internalNotes || undefined,
        };

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            const response = await fetch(`${apiBaseUrl}/adoption-applications/${applicationDetail.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error?.message || result.message || "Failed to update status.");
            }
            loadApplications();
            handleCloseReviewModal();
        } catch (err) {
            setUpdateError(err instanceof Error ? err.message : "Failed to update application.");
            console.error("Status update error:", err);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Styling classes
    const thClasses = "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800";
    const tdClasses = "px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700";

    // --- Render Logic ---
    if (isAuthLoading || isLoadingRole) return (
        <Container className="text-center py-10">
            <div className="flex flex-col items-center">
                <LoadingSpinner className="mb-4" />
                <span>Loading Access...</span>
            </div>
        </Container>
    );

    if (!currentUserRole || !['Admin', 'Staff'].includes(currentUserRole ?? '')) {
        return <Container className="text-center py-10 text-red-500">Access Denied. You must be an Admin or Staff to view this page.</Container>;
    }

    return (
        <>
            <Container className="py-10">
                {/* Main Title - Centered */}
                <div className="text-center mb-4">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Manage Adoption Applications
                    </h1>
                </div>

                {/* Filters and Sorting */}
                <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow flex flex-wrap gap-4 items-end">
                    <div>
                        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status</label>
                        <select id="statusFilter" value={statusFilter} onChange={handleStatusFilterChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
                            <option value="">All Statuses</option>
                            {applicationStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                        <select id="sortBy" value={sortBy} onChange={handleSortChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
                            {sortingOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Loading / Error for Data */}
                {isLoadingData && <div className="text-center py-10"><LoadingSpinner /> Loading applications...</div>}
                {errorData && <div className="text-center py-10 text-red-500">Error: {errorData}</div>}

                {/* Applications Table */}
                {!isLoadingData && !errorData && (
                    <div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                                <tr>
                                    <th className={thClasses}>Applicant</th>
                                    <th className={thClasses}>Animal</th>
                                    <th className={thClasses}>Submitted</th>
                                    <th className={thClasses}>Status</th>
                                    <th className={thClasses}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                {applications.length > 0 ? applications.map((app, index) => (
                                    <tr key={app.id} className={index % 2 === 0 ? "bg-white dark:bg-gray-800/50" : "bg-gray-50 dark:bg-gray-900/50"}>
                                        <td className={tdClasses}>
                                            <div className="font-semibold">{app.applicantName}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{app.primaryEmail}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{app.primaryPhone}</div>
                                        </td>
                                        <td className={tdClasses}>
                                            {app.whichAnimal}
                                        </td>
                                        <td className={tdClasses}>{format(new Date(app.submissionDate), 'P p')}</td>
                                        <td className={tdClasses}>
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${app.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : app.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className={tdClasses}>
                                            <button onClick={() => handleReviewClick(app)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold">
                                                View / Review
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No applications match current filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Container>

            {/* Review/Update Application Modal */}
            {isReviewModalOpen && selectedApplicationSummary && (
                <Modal onClose={handleCloseReviewModal} preventBackdropClickClose={true}>
                    <div className="flex flex-col max-h-[85vh] w-[600px] max-w-full">
                        <div className="flex-shrink-0 p-6 bg-gray-600">
                            <h3 className="text-xl font-semibold mb-0 text-white text-center">
                                Review Adoption Application: {selectedApplicationSummary.applicantName}
                            </h3>
                        </div>

                        <div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
                            {isLoadingDetail && <div className="text-center py-4"><LoadingSpinner /> Loading details...</div>}
                            {updateError && !isLoadingDetail && <p className="text-sm text-red-500 mb-3">Error loading details: {updateError}</p>}

                            {!isLoadingDetail && applicationDetail && (
                                <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
                                    <p><strong>Submission Date:</strong> {format(new Date(applicationDetail.submissionDate), 'PPP p')}</p>
                                    <p><strong>Email:</strong> {applicationDetail.primaryEmail}</p>
                                    <p><strong>Phone:</strong> {applicationDetail.primaryPhone} ({applicationDetail.primaryPhoneType})</p>

                                    <h4 className="font-semibold mt-4 pt-3 border-t dark:border-gray-600 text-base">Applicant Info</h4>
                                    <p><strong>Name:</strong> {applicationDetail.firstName} {applicationDetail.lastName}</p>
                                    <p><strong>Address:</strong> {applicationDetail.streetAddress}, {applicationDetail.city}, {applicationDetail.stateProvince} {applicationDetail.zipPostalCode}</p>

                                    <h4 className="font-semibold mt-4 pt-3 border-t dark:border-gray-600 text-base">Adoption Interest</h4>
                                    <p><strong>Specific Animal Interest:</strong> {applicationDetail.whichAnimalText || <span className="italic">N/A</span>}</p>
                                    <p className="whitespace-pre-wrap"><strong>Why Adopt:</strong> <br />{applicationDetail.whyAdopt || <span className="italic">N/A</span>}</p>

                                    <h4 className="font-semibold mt-4 pt-3 border-t dark:border-gray-600 text-base">Admin Review</h4>
                                    <p><strong>Status:</strong> {applicationDetail.status}</p>
                                    <p><strong>Reviewed By:</strong> {applicationDetail.reviewedByName || 'N/A'}</p>
                                    {applicationDetail.reviewDate && <p><strong>Review Date:</strong> {format(new Date(applicationDetail.reviewDate), 'PPP p')}</p>}
                                    <p className="whitespace-pre-wrap"><strong>Internal Notes (All):</strong> <br />{applicationDetail.internalNotes || <span className="italic text-gray-500">None</span>}</p>
                                </div>
                            )}
                        </div>

                        {/* Status Update Section */}
                        {!isLoadingDetail && applicationDetail && (
                            <div className="flex-shrink-0 p-6 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                                <div className="mb-4">
                                    <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Update Status *</label>
                                    <select
                                        id="newStatus"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
                                        {applicationStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                                    </select>
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes (Admin/Staff only)</label>
                                    <textarea
                                        id="internalNotes"
                                        rows={3}
                                        value={internalNotes}
                                        onChange={(e) => setInternalNotes(e.target.value)}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                                        placeholder="Add notes about the review or decision..." />
                                </div>
                                {updateError && <p className="text-sm text-red-500 mb-3">Error during update: {updateError}</p>}
                                <div className="flex justify-end gap-3">
                                    <button onClick={handleCloseReviewModal} disabled={isUpdatingStatus} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                                    <button onClick={handleStatusUpdate} disabled={isUpdatingStatus || newStatus === selectedApplicationSummary.status} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-2">
                                        {isUpdatingStatus && <LoadingSpinner className="w-4 h-4" />}
                                        Save Update
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
}
