"use client";
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { InformationCircleIcon, SuccessCheckmarkIcon } from "@/components/Icons";

// Define the shape of your form data
interface AdoptionFormData {
  // Applicant Information
  first_name: string;
  last_name: string;
  spouse_partner_roommate?: string;
  primary_email: string;
  secondary_email?: string;
  primary_phone: string;
  primary_phone_type: 'Cell' | 'Home' | 'Work' | '';
  secondary_phone?: string;
  secondary_phone_type?: 'Cell' | 'Home' | 'Work' | '';

  // Animal Information
  which_animal: string;

  // Home & Household
  street_address: string;
  apt_unit?: string;
  city: string;
  state_province: string;
  zip_postal_code: string;
  dwelling_type: 'House' | 'Apartment' | 'Condo/Townhouse' | 'Mobile Home' | 'Other' | '';
  rent_or_own: 'Rent' | 'Own' | '';
  landlord_permission?: boolean;
  yard_type?: 'Fenced' | 'Unfenced' | 'Patio/Balcony Only' | 'None' | '';
  adults_in_home: string;
  children_in_home?: string;
  has_allergies?: 'Yes' | 'No' | 'Unsure' | '';
  household_aware: 'Yes' | 'No' | '';

  // Pet Experience
  has_current_pets: 'Yes' | 'No' | '';
  current_pets_details?: string;
  current_pets_spayed_neutered?: 'Yes' | 'No' | 'N/A' | '';
  current_pets_vaccinations?: 'Yes' | 'No' | 'N/A' | '';
  has_previous_pets?: 'Yes' | 'No' | '';
  previous_pets_details?: string;
  vet_clinic_name?: string;
  vet_phone?: string;

  // Lifestyle & Care Plan
  why_adopt?: string;
  primary_caregiver: string;
  hours_alone_per_day: '<4 hours' | '4-6 hours' | '6-8 hours' | '8+ hours' | '';
  pet_alone_location: string;
  pet_sleep_location: string;
  moving_plan?: string;
  prepared_for_costs: 'Yes' | 'No' | '';

  // Additional Information
  how_heard?: string;

  // Submission related
  subject: string;
  botcheck?: string;
}

// Tooltip Trigger Button Component
const TooltipButton = ({ content, label }: { content: string, label: string }) => (
  <Tippy content={content} placement="top" animation="shift-away-subtle">
    <button type="button" aria-label={label} className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none align-middle">
      <InformationCircleIcon />
    </button>
  </Tippy>
);


interface AdoptionFormProps {
  animalName?: string;
  animal_id?: number | string;
  onClose: () => void;
}

export default function AdoptionForm({ animalName, animal_id, onClose }: AdoptionFormProps) {

  const defaultSubject = animalName
    ? `Adoption Application for ${animalName} (ID: ${animal_id})`
    : `General Adoption Application`;

  const defaultWhichAnimal = animalName ? `${animalName}` : "";

  const {
    register,
    handleSubmit,
    reset,
    watch, // Watch form values if needed (e.g., for conditional logic)
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<AdoptionFormData>({
    mode: "onTouched",
    defaultValues: {
      subject: defaultSubject,
      which_animal: defaultWhichAnimal,
      primary_phone_type: '',
      secondary_phone_type: '',
      has_allergies: '',
      household_aware: '',
      dwelling_type: '',
      rent_or_own: '',
      landlord_permission: false,
      yard_type: '',
      has_current_pets: '',
      has_previous_pets: '',
      current_pets_spayed_neutered: '',
      current_pets_vaccinations: '',
      hours_alone_per_day: '',
      prepared_for_costs: '',
    }
  });

  // Watch rent_or_own to conditionally show landlord permission
  const rentOrOwnValue = watch("rent_or_own");
  const hasCurrentPetsValue = watch("has_current_pets");

  const [isSuccess, setIsSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const onSubmit = async (data: AdoptionFormData) => {
    setIsSuccess(false);
    setSubmitMessage("");
    console.log("Adoption Form Data:", data);

    // Add any additional frontend validation if needed
    if (data.rent_or_own === 'Rent' && !data.landlord_permission) {
      setSubmitMessage("Please confirm you have landlord permission if you are renting.");
      return;
    }

    try {
      if (data.botcheck) {
        console.warn("Bot submission detected. Ignoring.");
        setSubmitMessage("Submission ignored due to bot detection.");
        return;
      }

      const payload = {
        ...data,
        landlord_permission: data.rent_or_own === 'Rent' ? data.landlord_permission : undefined, // Only send if relevant
        access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
        from_name: "Rescue App Adoption Application",
        ...(animalName && { inquiry_for_animal_name: animalName }),
        ...(animal_id && { inquiry_for_animal_id: animal_id }),
        botcheck: undefined,
      }

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setIsSuccess(true);
        setSubmitMessage("Thank you! Your adoption application has been submitted. Someone from our team will follow up with you shortly.");

        // Delay the form closure to let the user see the success message
        setTimeout(() => {
          onClose(); // Close the form after a delay
          setIsSuccess(false); // Optionally reset the success state
          setSubmitMessage(""); // Clear the success message
        }, 5000); // Adjust the delay time (e.g., 5000ms = 5 seconds)
      } else {
        throw new Error(result.message || "Failed to send application.");
      }
    } catch (error: any) {
      setIsSuccess(false);
      setSubmitMessage(error.message || "An unexpected error occurred. Please try again.");
      console.error("Form Submission Error:", error);
    }
  };

  // Input/Select/Textarea base classes for consistency
  const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-500 dark:focus:border-indigo-500";
  const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
  const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
  const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";
  const sectionTitleClasses = "text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center";
  const subSectionTitleClasses = "text-md font-medium mt-4 mb-2 text-gray-700 dark:text-gray-300 flex items-center";

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex-shrink-0 p-5 bg-indigo-600">
        <h3 className="text-lg text-white text-center font-semibold">
          {animalName ? `Adoption Application for ${animalName}` : 'Adoption Application'}
        </h3>
      </div>

      {/* Form Area - Scrollable */}
      <div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
        {!isSuccess ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Honeypot & Hidden Subject */}
            <input type="checkbox" className="hidden" style={{ display: "none" }} {...register("botcheck")} />
            <input type="hidden" {...register("subject")} />

            {/* --- Applicant Information Section --- */}
            <h4 className={sectionTitleClasses}>
              Applicant Information
              <TooltipButton content="Basic contact details allow us to follow up on your application." label="More info about applicant information" />
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* First Name */}
              <div>
                <label htmlFor="first_name" className={labelBaseClasses}>First Name *</label>
                <input type="text" id="first_name" {...register("first_name", { required: "First name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.first_name)}`} />
                {errors.first_name && <p className={errorTextClasses}>{errors.first_name.message}</p>}
              </div>
              {/* Last Name */}
              <div>
                <label htmlFor="last_name" className={labelBaseClasses}>Last Name *</label>
                <input type="text" id="last_name" {...register("last_name", { required: "Last name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.last_name)}`} />
                {errors.last_name && <p className={errorTextClasses}>{errors.last_name.message}</p>}
              </div>
            </div>
            {/* Spouse/Partner (Optional) */}
            <div className="mb-4">
              <label htmlFor="spouse_partner_roommate" className={labelBaseClasses}>Spouse / Partner / Roommate Name(s) (Optional)</label>
              <input type="text" id="spouse_partner_roommate" {...register("spouse_partner_roommate")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.spouse_partner_roommate)}`} />
            </div>
            {/* Primary Email */}
            <div className="mb-4">
              <label htmlFor="primary_email" className={labelBaseClasses}>Primary Email *</label>
              <input type="email" id="primary_email" {...register("primary_email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_email)}`} />
              {errors.primary_email && <p className={errorTextClasses}>{errors.primary_email.message}</p>}
            </div>
            {/* Secondary Email (Optional) */}
            <div className="mb-4">
              <label htmlFor="secondary_email" className={labelBaseClasses}>Secondary Email (Optional)</label>
              <input type="email" id="secondary_email" {...register("secondary_email", { pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.secondary_email)}`} />
              {errors.secondary_email && <p className={errorTextClasses}>{errors.secondary_email.message}</p>}
            </div>
            {/* Primary Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="primary_phone" className={labelBaseClasses}>Primary Phone *</label>
                <input type="tel" id="primary_phone" {...register("primary_phone", { required: "Primary phone is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_phone)}`} />
                {errors.primary_phone && <p className={errorTextClasses}>{errors.primary_phone.message}</p>}
              </div>
              <div>
                <label htmlFor="primary_phone_type" className={labelBaseClasses}>Primary Phone Type *</label>
                <select id="primary_phone_type" {...register("primary_phone_type", { required: "Select phone type" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_phone_type)}`}>
                  <option value="">Select Type...</option>
                  <option value="Cell">Cell</option>
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                </select>
                {errors.primary_phone_type && <p className={errorTextClasses}>{errors.primary_phone_type.message}</p>}
              </div>
            </div>
            {/* Secondary Phone (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="secondary_phone" className={labelBaseClasses}>Secondary Phone (Optional)</label>
                <input type="tel" id="secondary_phone" {...register("secondary_phone")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.secondary_phone)}`} />
              </div>
              <div>
                <label htmlFor="secondary_phone_type" className={labelBaseClasses}>Secondary Phone Type</label>
                <select id="secondary_phone_type" {...register("secondary_phone_type")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.secondary_phone_type)}`}>
                  <option value="">Select Type...</option>
                  <option value="Cell">Cell</option>
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                </select>
              </div>
            </div>

            {/* --- Animal(s) of Interest Section --- */}
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
            <h4 className={sectionTitleClasses}>
              Animal(s) of Interest
              <TooltipButton content="Let us know who caught your eye, or describe the type of animal you're hoping to adopt." label="..." />
            </h4>
            <div className="mb-4"> {/* Keep margin consistent */}
              <label htmlFor="which_animal" className={labelBaseClasses}>
                Which animal(s) are you interested in? {!animalName && "(If applying generally, please describe)"} *
              </label>
              <textarea
                id="which_animal"
                rows={2}
                {...register("which_animal", { required: !animalName ? "Please list animal(s) or type 'Any appropriate'" : false })}
                placeholder={!animalName ? "Name(s) or type (e.g., 'Adult short-haired cat', 'Medium energy dog')" : ""}
                className={`${inputBaseClasses} ${inputBorderClasses(!!errors.which_animal)} h-auto`} // Adjusted height
              />
              {errors.which_animal && <p className={errorTextClasses}>{errors.which_animal.message}</p>}
            </div>

            {/* --- Household & Home Environment Section --- */}
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
            <h4 className={sectionTitleClasses}>
              Home & Household
              <TooltipButton content="Helps us understand the potential living environment to ensure it's safe and suitable for the animal's needs." label="More info about home and household questions" />
            </h4>
            {/* Street Address */}
            <div className="mb-4">
              <label htmlFor="street_address" className={labelBaseClasses}>Street Address *</label>
              <input type="text" id="street_address" {...register("street_address", { required: "Street address is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.street_address)}`} />
              {errors.street_address && <p className={errorTextClasses}>{errors.street_address.message}</p>}
            </div>
            {/* Apt/Unit (Optional) */}
            <div className="mb-4">
              <label htmlFor="apt_unit" className={labelBaseClasses}>Apt/Unit # (Optional)</label>
              <input type="text" id="apt_unit" {...register("apt_unit")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.apt_unit)}`} />
            </div>
            {/* City/State/Zip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="city" className={labelBaseClasses}>City *</label>
                <input type="text" id="city" {...register("city", { required: "City is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.city)}`} />
                {errors.city && <p className={errorTextClasses}>{errors.city.message}</p>}
              </div>
              <div>
                <label htmlFor="state_province" className={labelBaseClasses}>State/Province *</label>
                {/* Consider a dropdown for state if only serving specific areas */}
                <input type="text" id="state_province" {...register("state_province", { required: "State/Province is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.state_province)}`} />
                {errors.state_province && <p className={errorTextClasses}>{errors.state_province.message}</p>}
              </div>
              <div>
                <label htmlFor="zip_postal_code" className={labelBaseClasses}>Zip/Postal Code *</label>
                <input type="text" id="zip_postal_code" {...register("zip_postal_code", { required: "Zip/Postal Code is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.zip_postal_code)}`} />
                {errors.zip_postal_code && <p className={errorTextClasses}>{errors.zip_postal_code.message}</p>}
              </div>
            </div>
            {/* Dwelling Type */}
            <div className="mb-4">
              <label htmlFor="dwelling_type" className={labelBaseClasses}>Type of Dwelling *</label>
              <select id="dwelling_type" {...register("dwelling_type", { required: "Please select dwelling type" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.dwelling_type)}`}>
                <option value="">Select...</option>
                <option value="House">House</option>
                <option value="Apartment">Apartment</option>
                <option value="Condo/Townhouse">Condo/Townhouse</option>
                <option value="Mobile Home">Mobile Home</option>
                <option value="Other">Other</option>
              </select>
              {errors.dwelling_type && <p className={errorTextClasses}>{errors.dwelling_type.message}</p>}
            </div>
            {/* Rent or Own */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Do you Rent or Own? *</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                <label className="inline-flex items-center">
                  <input type="radio" value="Rent" {...register("rent_or_own", { required: "Please select Rent or Own" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Rent</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="Own" {...register("rent_or_own", { required: "Please select Rent or Own" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Own</span>
                </label>
              </div>
              {errors.rent_or_own && <p className={errorTextClasses}>{errors.rent_or_own.message}</p>}
            </div>
            {/* Conditional Landlord Permission */}
            {rentOrOwnValue === 'Rent' && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500 dark:border-blue-400 rounded-r-md">
                <label className={`${labelBaseClasses} flex items-center cursor-pointer`}>
                  <input type="checkbox" id="landlord_permission" {...register("landlord_permission", { required: "Landlord permission is required if renting" })} className={`form-checkbox h-5 w-5 text-indigo-600 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded mr-2 ${errors.landlord_permission ? 'border-red-500 dark:border-red-600' : ''}`} />
                  <span className="text-sm text-gray-800 dark:text-gray-200">I confirm I have my landlord&apos;s permission for a pet of this type/size.</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">We may need to verify this with your landlord later in the process.</p>
                {errors.landlord_permission && <p className={errorTextClasses}>{errors.landlord_permission.message}</p>}
              </div>
            )}
            {/* Yard Type */}
            <div className="mb-4">
              <label htmlFor="yard_type" className={labelBaseClasses}>Yard Type (If applicable)</label>
              <select id="yard_type" {...register("yard_type")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.yard_type)}`}>
                <option value="">Select...</option>
                <option value="Fenced">Fenced Yard</option>
                <option value="Unfenced">Unfenced Yard</option>
                <option value="Patio/Balcony Only">Patio/Balcony Only</option>
                <option value="None">No Yard/Access</option>
              </select>
            </div>
            {/* Adults & Children */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="adults_in_home" className={labelBaseClasses}>Number of Adults in Household (18+)? *</label>
                <input type="number" min="1" step="1" id="adults_in_home" {...register("adults_in_home", { required: "Number of adults is required", min: { value: 1, message: "Must be at least 1 adult" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adults_in_home)}`} />
                {errors.adults_in_home && <p className={errorTextClasses}>{errors.adults_in_home.message}</p>}
              </div>
              <div>
                <label htmlFor="children_in_home" className={labelBaseClasses}>Number & Ages of Children (&lt;18)?</label>
                <input type="text" id="children_in_home" {...register("children_in_home")} placeholder="e.g., 1 child, age 8" className={`${inputBaseClasses} ${inputBorderClasses(!!errors.children_in_home)}`} />
                {/* Optional: Add validation if needed */}
              </div>
            </div>
            {/* Allergies */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Does anyone in the home have known pet allergies? *</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                <label className="inline-flex items-center">
                  <input type="radio" value="Yes" {...register("has_allergies", { required: "Please select an option" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="No" {...register("has_allergies", { required: "Please select an option" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="Unsure" {...register("has_allergies", { required: "Please select an option" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Unsure</span>
                </label>
              </div>
              {errors.has_allergies && <p className={errorTextClasses}>{errors.has_allergies.message}</p>}
            </div>
            {/* Household Aware */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Is everyone in the household aware & supportive of adoption? *</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                <label className="inline-flex items-center">
                  <input type="radio" value="Yes" {...register("household_aware", { required: "Please confirm household agreement" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="No" {...register("household_aware", { required: "Please confirm household agreement" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
              </div>
              {errors.household_aware && <p className={errorTextClasses}>{errors.household_aware.message}</p>}
            </div>


            {/* --- Pet Experience Section --- */}
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
            <h4 className={sectionTitleClasses}>
              Pet Experience & Current Pets
              <TooltipButton content="Helps ensure compatibility with existing pets and matches animal needs to your experience." label="More info about pet experience" />
            </h4>
            {/* Current Pets */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Do you currently have other pets? *</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                <label className="inline-flex items-center">
                  <input type="radio" value="Yes" {...register("has_current_pets", { required: "Please answer about current pets" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="No" {...register("has_current_pets", { required: "Please answer about current pets" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
              </div>
              {errors.has_current_pets && <p className={errorTextClasses}>{errors.has_current_pets.message}</p>}
            </div>
            {/* Current Pet Details (Conditional) */}
            {hasCurrentPetsValue === 'Yes' && (
              <div className="mb-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                <label htmlFor="current_pets_details" className={labelBaseClasses}>Please list their species, breed (if known), age and if spayed/neutered. *</label>
                <textarea id="current_pets_details" rows={3} {...register("current_pets_details", { required: "Details required if you have current pets" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.current_pets_details)} h-auto`} />
                {errors.current_pets_details && <p className={errorTextClasses}>{errors.current_pets_details.message}</p>}

                <div className="mt-4">
                  <label className={labelBaseClasses}>Are your current pets UTD on vaccinations? *</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                    <label className="inline-flex items-center">
                      <input type="radio" value="Yes" {...register("current_pets_vaccinations", { required: "Vaccination status required" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" value="No" {...register("current_pets_vaccinations", { required: "Vaccination status required" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
                    </label>
                  </div>
                  {errors.current_pets_vaccinations && <p className={errorTextClasses}>{errors.current_pets_vaccinations.message}</p>}
                </div>
                <div className="mt-4">
                  <label className={labelBaseClasses}>Are your current pets spayed/neutered? *</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                    <label className="inline-flex items-center">
                      <input type="radio" value="Yes" {...register("current_pets_spayed_neutered", { required: "Spay/neuter status required" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes, all</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" value="Some" {...register("current_pets_spayed_neutered", { required: "Spay/neuter status required" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Some are</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" value="No" {...register("current_pets_spayed_neutered", { required: "Spay/neuter status required" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
                    </label>
                  </div>
                  {errors.current_pets_spayed_neutered && <p className={errorTextClasses}>{errors.current_pets_spayed_neutered.message}</p>}
                </div>
              </div>
            )}
            {/* Previous Pets (Conditional) */}
            {hasCurrentPetsValue === 'No' && (
              <div className="mb-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                <label className={labelBaseClasses}>Have you owned pets before? *</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                  <label className="inline-flex items-center">
                    <input type="radio" value="Yes" {...register("has_previous_pets", { required: "Please answer about previous pets" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input type="radio" value="No" {...register("has_previous_pets", { required: "Please answer about previous pets" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
                  </label>
                </div>
                {errors.has_previous_pets && <p className={errorTextClasses}>{errors.has_previous_pets.message}</p>}

                {/* Ask for details only if they answered Yes to previous pets */}
                {watch("has_previous_pets") === 'Yes' && (
                  <div className="mt-4">
                    <label htmlFor="previous_pets_details" className={labelBaseClasses}>Please briefly describe the type of pet(s) and their story. *</label>
                    <textarea id="previous_pets_details" rows={3} {...register("previous_pets_details", { required: "Details required if you had previous pets" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.previous_pets_details)} h-auto`} />
                    {errors.previous_pets_details && <p className={errorTextClasses}>{errors.previous_pets_details.message}</p>}
                  </div>
                )}
              </div>
            )}
            {/* Veterinarian Info (Optional) */}
            <div className="mb-4">
              <h5 className={subSectionTitleClasses}>Veterinarian Information (Optional)</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vet_clinic_name" className={labelBaseClasses}>Clinic Name</label>
                  <input type="text" id="vet_clinic_name" {...register("vet_clinic_name")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.vet_clinic_name)}`} />
                </div>
                <div>
                  <label htmlFor="vet_phone" className={labelBaseClasses}>Clinic Phone</label>
                  <input type="tel" id="vet_phone" {...register("vet_phone")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.vet_phone)}`} />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Providing veterinarian information (current or previous) helps us better understand your pet care experience. This step is optional at this stage.
              </p>
            </div>

            {/* --- Lifestyle & Care Plan Section --- */}
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
            <h4 className={sectionTitleClasses}>
              Lifestyle & Care Plan
              <TooltipButton content="These questions help us ensure a good match and that you're ready for the joys and responsibilities of adoption." label="More info about lifestyle and care questions" />
            </h4>
            {/* Why Adopt? */}
            <div className="mb-4">
              <label htmlFor="why_adopt" className={labelBaseClasses}>Briefly, why are you looking to adopt at this time? (Optional)</label>
              <textarea id="why_adopt" rows={3} {...register("why_adopt")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.why_adopt)} h-auto`} />
            </div>
            {/* Primary Caregiver */}
            <div className="mb-4">
              <label htmlFor="primary_caregiver" className={labelBaseClasses}>Who will be the primary caregiver? *</label>
              <input type="text" id="primary_caregiver" {...register("primary_caregiver", { required: "Primary caregiver is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_caregiver)}`} />
              {errors.primary_caregiver && <p className={errorTextClasses}>{errors.primary_caregiver.message}</p>}
            </div>
            {/* Hours Alone */}
            <div className="mb-4">
              <label htmlFor="hours_alone_per_day" className={labelBaseClasses}>On average, how many hours per day will the pet be left alone? *</label>
              <select id="hours_alone_per_day" {...register("hours_alone_per_day", { required: "Please estimate hours alone" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.hours_alone_per_day)}`}>
                <option value="">Select hours...</option>
                <option value="<4 hours">Less than 4 hours</option>
                <option value="4-6 hours">4-6 hours</option>
                <option value="6-8 hours">6-8 hours</option>
                <option value="8+ hours">8+ hours</option>
              </select>
              {errors.hours_alone_per_day && <p className={errorTextClasses}>{errors.hours_alone_per_day.message}</p>}
            </div>
            {/* Location When Alone */}
            <div className="mb-4">
              <label htmlFor="pet_alone_location" className={labelBaseClasses}>Where will the pet stay when left alone? *</label>
              <input type="text" id="pet_alone_location" placeholder="e.g., Crated, free roam indoors, specific room" {...register("pet_alone_location", { required: "Please specify location when alone" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.pet_alone_location)}`} />
              {errors.pet_alone_location && <p className={errorTextClasses}>{errors.pet_alone_location.message}</p>}
            </div>
            {/* Sleeping Location */}
            <div className="mb-4">
              <label htmlFor="pet_sleep_location" className={labelBaseClasses}>Where will the pet primarily sleep? *</label>
              <input type="text" id="pet_sleep_location" placeholder="e.g., Crate, dog bed in bedroom, couch" {...register("pet_sleep_location", { required: "Please specify sleeping location" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.pet_sleep_location)}`} />
              {errors.pet_sleep_location && <p className={errorTextClasses}>{errors.pet_sleep_location.message}</p>}
            </div>
            {/* Moving Plan */}
            <div className="mb-4">
              <label htmlFor="moving_plan" className={labelBaseClasses}>What would happen to the pet if you had to move? *</label>
              <textarea id="moving_plan" rows={3} {...register("moving_plan", { required: "This question helps assess long-term commitment." })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.moving_plan)} h-auto`} />
              {errors.moving_plan && <p className={errorTextClasses}>{errors.moving_plan.message}</p>}
            </div>
            {/* Financial Prep */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Are you prepared for the financial commitments of pet ownership? *</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">(Includes food, supplies, routine & emergency vet care, etc.)</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                <label className="inline-flex items-center">
                  <input type="radio" value="Yes" {...register("prepared_for_costs", { required: "Please confirm financial preparedness" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="No" {...register("prepared_for_costs", { required: "Please confirm financial preparedness" })} className="form-radio h-4 w-4 text-indigo-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
              </div>
              {errors.prepared_for_costs && <p className={errorTextClasses}>{errors.prepared_for_costs.message}</p>}
            </div>

            {/* How Heard About Us */}
            <div className="mb-4">
              <label htmlFor="how_heard" className={labelBaseClasses}>How did you hear about us? (Optional)</label>
              <input type="text" id="how_heard" {...register("how_heard")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.how_heard)}`} />
            </div>

            {/* Submit/Cancel Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-indigo-500 rounded-md hover:bg-indigo-600 focus:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        ) : (
          // Success Message Area
            <div className="flex flex-col items-center justify-center text-center min-h-[200px]">
              <SuccessCheckmarkIcon />
            <h3 className="py-5 text-xl text-green-600 dark:text-green-400">Application Submitted!</h3>
            <p className="text-gray-700 dark:text-gray-300 md:px-3">{submitMessage}</p>
            <button type="button" className="mt-6 text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none" onClick={onClose}>Close</button>
          </div>
        )}
        {/* Display submission error message if not successful */}
        {!isSuccess && submitMessage && (
          <p className="mt-4 text-center text-red-500 dark:text-red-400">{submitMessage}</p>
        )}
      </div>
    </div>
  );
}
