'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { UserProfile } from '@/types/userProfile';

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
  // Add state for form handling (e.g., using react-hook-form) when implementing edit

  // TODO: Implement handleSave function using react-hook-form and PUT /api/users/me


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
          {profileData.lastLoginDate && (
					  <ProfileDetail label="Last Login" value={profileData.lastLoginDate} isDate />
          )}
          {/* Add other details from profileData */}

          <div className="pt-6 text-right">
              <button
                  onClick={() => setIsEditing(true)}
                  className="bg-sc-asparagus-500 hover:bg-sc-asparagus-600 text-white font-medium py-2 px-5 rounded-md transition duration-300"
              >
                  Edit Profile
              </button>
          </div>
        </dl>
      ) : (
        <div> {/* Edit Form Section */}
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Profile</h2>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
                Update your contact information below. (Email and Role cannot be changed here).
            </p>
            {/* --- TODO: Implement React Hook Form here --- */}
            {/* Example: Input for First Name */}
            {/* <label htmlFor="firstName">First Name</label> */}
            {/* <input id="firstName" defaultValue={profileData.firstName} {...register("firstName")} /> */}
            {/* --- End Form Placeholder --- */}

            <div className="flex justify-end gap-3 mt-6 border-t pt-4 dark:border-gray-700">
                 <button
                     type="button"
                     onClick={() => setIsEditing(false)} // Cancel edits
                     className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 font-medium py-2 px-5 rounded-md transition duration-300"
                 >
                     Cancel
                 </button>
                  <button
                     type="submit" // This would be the submit button for the form
                     disabled // Disable until form is implemented
                     className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50"
                 >
                     Save Changes
                 </button>
            </div>
        </div>
      )}
    </div>
  );
}
