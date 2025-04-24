'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { UserProfile } from '@/types/userProfile'; // Adjust path
import { useForm, SubmitHandler } from 'react-hook-form'; // Import RHF

// Define the shape of the form data (only editable fields)
interface ProfileFormData {
  firstName: string;
  lastName: string;
  // Add corresponding fields here if you make more fields editable
}

// Helper component
const ProfileDetail = ({ label, value, isDate }: { label: string; value: string | undefined | null | boolean; isDate?: boolean }) => {
  let displayValue: string | null = null;

  if (typeof value === 'boolean') {
    displayValue = value ? 'Active' : 'Inactive';
  } else if (isDate && value) {
    // Format the date with date-fns and include the timezone
    const date = new Date(value);
    const formattedDate = format(date, 'MMMM do, yyyy');
    const formattedTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    }).format(date); // e.g., 5:49 PM PDT
    displayValue = `${formattedDate} at ${formattedTime}`;
  } else {
    displayValue = value as string;
  }

  if (!displayValue) return null;

  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">{displayValue}</dd>
    </div>
  );
};

interface ProfileDisplayProps {
  initialProfileData: UserProfile;
}

export default function ProfileDisplay({ initialProfileData }: ProfileDisplayProps) {
  const [profileData, setProfileData] = useState<UserProfile>(initialProfileData);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null); // For save errors

  // --- React Hook Form Setup ---
  const {
    register,
    handleSubmit,
    reset, // To reset form state
    formState: { errors, isSubmitting, isDirty } // Get form state (isDirty tells if form values changed)
  } = useForm<ProfileFormData>({
    // Default values are set using useEffect below to ensure they use fetched data
  });

  // Set form defaults when editing starts or initial data changes
  useEffect(() => {
    if (profileData) {
      reset({ // reset updates the form's default values AND current values
        firstName: profileData.firstName,
        lastName: profileData.lastName,
      });
    }
  }, [profileData, reset, isEditing]); // Rerun if isEditing changes


  // --- Handle Save/Submit ---
  const handleSave: SubmitHandler<ProfileFormData> = async (formData) => {
    setApiError(null);
    console.log("Submitting profile update:", formData);

    // --- Fetch Access Token ---
    async function getAuth0AccessToken(): Promise<string | null> {
      try {
        // Fetch from the internal Next.js API route
        const response = await fetch('/api/auth/token'); // Relative URL to our new endpoint

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to get access token: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.accessToken) {
          throw new Error("Access token not found in response from /api/auth/token");
        }
        return data.accessToken;

      } catch (error) {
        console.error("Error fetching access token:", error);
        // Return null or re-throw, depending on how you want handleSave to react
        return null;
      }
    }

    const accessToken = await getAuth0AccessToken();
    if (!accessToken) {
      setApiError("Could not get authentication token. Please try logging in again.");
      return;
    }
    // --- End Token Fetch ---

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData) // Send edited fields
      });

      if (!response.ok) {
        let errorMsg = `Error ${response.status}: Failed to update profile.`;
        try { const errorBody = await response.json(); errorMsg = errorBody.message || errorMsg; }
        catch (_) { /* Ignore if body isn't JSON */ }
        throw new Error(errorMsg);
      }

      // Update local state with the successfully saved data
      setProfileData(prev => ({ ...prev, ...formData }));
      setIsEditing(false); // Exit edit mode on success
      // Optionally show a success toast/message

    } catch (error) {
      console.error("Profile update error:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred while saving.");
    }
  };

  // Input/Select/Textarea base classes (use your theme colors)
  const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-500 dark:focus:border-indigo-500";
  const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
  const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
  const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 md:p-8 max-w-2xl mx-auto">
      {!isEditing ? (
        <dl className="divide-y divide-gray-200 dark:divide-gray-700">
          <ProfileDetail label="First Name" value={profileData.firstName} />
          <ProfileDetail label="Last Name" value={profileData.lastName} />
          <ProfileDetail label="Email" value={profileData.email} />
          <ProfileDetail label="Role" value={profileData.role} />
          <ProfileDetail label="Account Status" value={profileData.isActive} />
          <ProfileDetail label="Member Since" value={format(new Date(profileData.dateCreated), 'MMMM do, yyyy')} />
          {/* Add other details from profileData */}

          <div className="pt-6 text-right">
            <button
              onClick={() => { setApiError(null); setIsEditing(true); }}
              className="bg-sc-asparagus-500 hover:bg-sc-asparagus-600 text-white font-medium py-2 px-5 rounded-md transition duration-300"
            >
              Edit Profile
            </button>
          </div>
        </dl>
      ) : (
          // --- Edit Mode ---
          <form onSubmit={handleSubmit(handleSave)}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Profile</h2>
            {apiError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">Save Error: {apiError}</p>}
            <div className="space-y-4">
              {/* First Name Input */}
              <div>
                <label htmlFor="firstName" className={labelBaseClasses}>First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  className={`${inputBaseClasses} ${inputBorderClasses(!!errors.firstName)}`}
                  {...register("firstName", { required: "First name is required" })}
                />
                {errors.firstName && <p className={errorTextClasses}>{errors.firstName.message}</p>}
              </div>

              {/* Last Name Input */}
              <div>
                <label htmlFor="lastName" className={labelBaseClasses}>Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  className={`${inputBaseClasses} ${inputBorderClasses(!!errors.lastName)}`}
                  {...register("lastName", { required: "Last name is required" })}
                />
                {errors.lastName && <p className={errorTextClasses}>{errors.lastName.message}</p>}
              </div>

              {/* Add inputs for other editable fields here (e.g., phone) */}

              {/* Non-Editable fields can be displayed as text */}
              <ProfileDetail label="Email" value={profileData.email} />
              <ProfileDetail label="Role" value={profileData.role} />

            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 mt-6 border-t pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={() => { setIsEditing(false); reset(); setApiError(null); }} // Cancel edits & reset form
                className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 font-medium py-2 px-5 rounded-md transition duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                // Disable if submitting OR if form hasn't changed from original values
                disabled={isSubmitting || !isDirty}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
      )}
    </div>
  );
}
