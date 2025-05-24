'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { UserProfile } from '@/types/userProfile';
import { useForm, SubmitHandler } from 'react-hook-form';
import { getAuth0AccessToken } from '@/utils/auth';

// Define the shape of the form data (only editable fields)
interface ProfileFormData {
  firstName: string;
  lastName: string;
  primaryPhone: string;
  primaryPhoneType: string;
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
    formState: { errors, isSubmitting, isDirty } // Get form state
  } = useForm<ProfileFormData>({
  });

  // Set form defaults when editing starts or initial data changes
  useEffect(() => {
    if (profileData) {
      reset({ // reset updates the form's default values AND current values
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        primaryPhone: profileData.primaryPhone,
        primaryPhoneType: profileData.primaryPhoneType,
      });
    }
  }, [profileData, reset, isEditing]); // Rerun if isEditing changes


  // --- Handle Save/Submit ---
  const handleSave: SubmitHandler<ProfileFormData> = async (formData) => {
    setApiError(null);
    console.log("Submitting profile update:", formData);

    // --- Get Access Token INSIDE the handler ---
    const accessToken = await getAuth0AccessToken(); // Use imported helper
    if (!accessToken) {
      setApiError("Authentication error. Could not get token.");
      return; // Stop submission if token fails
    }

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

    } catch (error) {
      console.error("Profile update error:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred while saving.");
    }
  };

  // Input/Select/Textarea base classes (use your theme colors)
  const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-gray-100 dark:focus:ring-gray-900 focus:border-gray-500 dark:focus:border-gray-500";
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
          <ProfileDetail label="Phone" value={`${profileData.primaryPhone} (${profileData.primaryPhoneType})`} />
          <ProfileDetail label="Role" value={profileData.role} />
          <ProfileDetail label="Account Status" value={profileData.isActive} />
          <ProfileDetail label="Member Since" value={format(new Date(profileData.dateCreated), 'MMMM do, yyyy')} />

          <div className="pt-6 text-right">
            <button
              onClick={() => { setApiError(null); setIsEditing(true); }}
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-5 rounded-md transition duration-300">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Phone Input */}
                <div>
                  <label htmlFor="primaryPhone" className={labelBaseClasses}>Phone *</label>
                  <input type="tel" id="primaryPhone" {...register("primaryPhone", { required: "Primary phone is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primaryPhone)}`} />
                  {errors.primaryPhone && <p className={errorTextClasses}>{errors.primaryPhone.message}</p>}
                </div>
                {/* Phone Type Select */}
                <div>
                  <label htmlFor="primaryPhoneType" className={labelBaseClasses}>Phone Type *</label>
                  <select id="primaryPhoneType" {...register("primaryPhoneType", { required: "Select phone type" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primaryPhoneType)}`}>
                    <option value="">Select Type...</option>
                    <option value="Cell">Cell</option>
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                  </select>
                  {errors.primaryPhoneType && <p className={errorTextClasses}>{errors.primaryPhoneType.message}</p>}
                </div>
              </div>

              {/* Non-Editable fields can be displayed as text */}
              <ProfileDetail label="Email" value={profileData.email} />
              <ProfileDetail label="Role" value={profileData.role} />

            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 mt-6 border-t pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={() => { setIsEditing(false); reset(); setApiError(null); }} // Cancel edits & reset form
                className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 font-medium py-2 px-5 rounded-md transition duration-300">
                Cancel
              </button>
              <button
                type="submit"
                // Disable if submitting OR if form hasn't changed from original values
                disabled={isSubmitting || !isDirty}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
      )}
    </div>
  );
}
