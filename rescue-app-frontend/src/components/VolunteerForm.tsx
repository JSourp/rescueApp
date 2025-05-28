"use client";
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { InformationCircleIcon, SuccessCheckmarkIcon } from "@/components/Icons";

const VOLUNTEER_WAIVER_TEXT = `
Volunteer Agreement, Code of Conduct, & Waiver of Liability

I, the undersigned ("Volunteer"), wish to offer my services as a volunteer to Second Chance Animal Rescue & Sanctuary ("SCARS"), a non-profit animal welfare organization located in Arizona. I understand that my services are provided on a voluntary basis, without pay or compensation, and with a commitment to supporting SCARS's mission.

In consideration of being allowed to participate as a volunteer, I understand and agree to the following terms and conditions:

**1. Volunteer Role & Responsibilities:**
    a.  I agree to perform my volunteer duties to the best of my ability and to follow the guidance, policies, and procedures set forth by SCARS staff and designated representatives.
    b.  I understand that volunteer activities may include, but are not limited to: animal care (feeding, grooming, cleaning enclosures), animal socialization and enrichment, dog walking, assisting with adoption events, fundraising activities, administrative tasks, facility maintenance, and other duties as assigned.
    c.  I will attend any required orientation and training sessions related to my volunteer role(s) and will ask for clarification if I am unsure about any task or procedure.

**2. Code of Conduct:**
    a.  I will conduct myself in a professional, courteous, and respectful manner at all times when representing SCARS, interacting with staff, other volunteers, potential adopters, and the public.
    b.  I will treat all animals in SCARS's care with kindness, patience, and respect, adhering to humane handling techniques as instructed.
    c.  I will maintain the confidentiality of sensitive information I may become privy to regarding animals, adopters, donors, staff, other volunteers, or SCARS operations.
    d.  I will adhere to my agreed-upon volunteer schedule and notify my SCARS contact in a timely manner if I am unable to fulfill a commitment.

**3. Assumption of Risk:**
    a.  I understand that working with and around animals involves inherent risks, regardless of the animal's known temperament or training. These risks include, but are not limited to: bites, scratches, kicks, stings, allergic reactions, slips, trips, falls, and potential exposure to zoonotic diseases (diseases transmissible from animals to humans).
    b.  I acknowledge that SCARS will make reasonable efforts to provide a safe environment and disclose known risks associated with specific animals or tasks, but cannot guarantee that no injury or illness will occur.
    c.  I knowingly and voluntarily assume all risks associated with my participation in volunteer activities for SCARS.

**4. Waiver of Liability & Indemnification:**
    a.  To the fullest extent permitted by law, I hereby release, discharge, and agree to hold harmless SCARS, its directors, officers, employees, other volunteers, and agents from any and all claims, demands, actions, causes of action, losses, damages, liabilities, costs, and expenses (including but not limited to attorney's fees and medical expenses) of any kind or nature whatsoever, whether known or unknown, which may arise from or be connected in any way with my volunteer activities, including any personal injury, illness, or property damage I may sustain. This release applies even if such injury or damage is caused by the negligence of SCARS (unless due to its gross negligence or willful misconduct).
    b.  I agree to indemnify, defend, and hold SCARS harmless from and against any and all third-party claims, lawsuits, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising out of or related to my actions or omissions as a volunteer.

**5. Emergency Medical Treatment:**
    In the event of an injury or medical emergency while I am performing volunteer duties, if I am unable to consent, I authorize SCARS to seek and obtain necessary emergency medical treatment on my behalf. I understand that I am solely responsible for any and all medical expenses incurred as a result of such treatment.

**6. Photo/Media Release (Optional Clause - Include if desired):**
    I grant SCARS permission to use my likeness in photographs, video recordings, or other media taken during my volunteer activities for SCARS's promotional, fundraising, or educational purposes, without payment or other consideration. (You may want a separate checkbox for this if you want it to be truly optional).

**7. Termination of Volunteer Relationship:**
    I understand that my volunteer relationship with SCARS is "at-will," meaning that either I or SCARS may terminate the relationship at any time, with or without cause or notice.
`;

// Reusable Tooltip Trigger
const TooltipButton = ({ content, label }: { content: string, label: string }) => (
  <Tippy content={content} placement="top" animation="shift-away-subtle" interactive={true}>
    <button type="button" aria-label={label} className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none align-middle">
      <InformationCircleIcon />
    </button>
  </Tippy>
);

// Updated Form Data Interface
interface VolunteerFormData {
  // Contact Info
  first_name: string;
  last_name: string;
  spouse_partner_roommate?: string;
  street_address: string;
  apt_unit?: string;
  city: string;
  state_province: string;
  zip_postal_code: string;
  primary_phone: string;
  primary_phone_type: 'Cell' | 'Home' | 'Work' | '';
  secondary_phone?: string;
  secondary_phone_type?: 'Cell' | 'Home' | 'Work' | '';
  primary_email: string;
  secondary_email?: string;
  how_heard?: string;

  // Volunteer Specific
  age_confirmation: 'Yes' | 'No' | ''; // Required Yes/No
  previous_volunteer_experience: 'Yes' | 'No' | '';
  previous_experience_details?: string; // Conditional
  comfort_level_special_needs: 'Yes' | 'Maybe' | 'No' | '';
  areas_of_interest?: string[];
  other_skills?: string;
  location_acknowledgement: boolean | string;
  volunteer_reason?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  crime_conviction_check: 'Yes' | 'No' | ''; // Required Yes/No
  policy_acknowledgement: boolean; // Required Checkbox

  // Waiver
  waiver_agreed: boolean;
  e_signature_name: string;

  // Submission related
  subject: string;
  botcheck?: string;
}

interface VolunteerFormProps {
  onClose: () => void;
}

export default function VolunteerForm({ onClose }: VolunteerFormProps) {
  const prefilledSubject = `Volunteer Application`;

  const {
    register,
    handleSubmit,
    reset,
    watch, // Watch for conditional fields
    formState: { errors, isSubmitting },
  } = useForm<VolunteerFormData>({
    mode: "onTouched",
    defaultValues: { // Add defaults for new fields
      subject: prefilledSubject,
      primary_phone_type: '', secondary_phone_type: '', how_heard: '',
      age_confirmation: '', previous_volunteer_experience: '',
      comfort_level_special_needs: '', areas_of_interest: [], other_skills: '',
      location_acknowledgement: false, volunteer_reason: '',
      emergency_contact_name: '', emergency_contact_phone: '',
      crime_conviction_check: '', policy_acknowledgement: false,
      waiver_agreed: false,
      e_signature_name: '',
    }
  });

  // Watch values for conditional rendering
  const watchPreviousExperience = watch("previous_volunteer_experience");

  const [isSuccess, setIsSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  // onSubmit logic remains largely the same, ensure new fields are in payload if needed
  const onSubmit = async (data: VolunteerFormData) => {
    setIsSuccess(false);
    setSubmitMessage("");
    console.log("Volunteer Form Data:", data);

    if (data.location_acknowledgement !== true && data.location_acknowledgement !== 'accepted') {
      setSubmitMessage("Please acknowledge the location information.");
      return;
    }
    if (!data.policy_acknowledgement) {
      setSubmitMessage("Please acknowledge the volunteer agreement.");
      return;
    }
    if (data.age_confirmation !== 'Yes') {
      setSubmitMessage("Volunteers must be 18 years or older.");
      return;
    }
    if (data.crime_conviction_check !== 'No') {
      // Handle this sensitively - may require follow up rather than form rejection
      setSubmitMessage("Thank you for your honesty. Please note we may need to discuss this further.");
    }

    // --- Client-side validation for waiver ---
    if (!data.waiver_agreed) {
      setSubmitMessage("You must agree to the waiver terms to submit the application.");
      document.getElementById("waiver_agreed")?.focus();
      return;
    }
    if (data.waiver_agreed && (!data.e_signature_name || data.e_signature_name.trim() === '')) {
      setSubmitMessage("Please type your full name as your electronic signature to agree to the waiver.");
      document.getElementById("e_signature_name")?.focus();
      return;
    }

    try {
      if (data.botcheck) {
        console.warn("Bot submission detected. Ignoring.");
        setSubmitMessage("Submission ignored due to bot detection.");
        return;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        throw new Error("API base URL is not configured.");
      }

      // --- Step 1: Save application to the database ---
      // Map snake_case FosterFormData to camelCase for the backend DTO
      const dbPayload = {
        // Contact Info
        firstName: data.first_name,
        lastName: data.last_name,
        spousePartnerRoommate: data.spouse_partner_roommate,
        streetAddress: data.street_address,
        aptUnit: data.apt_unit,
        city: data.city,
        stateProvince: data.state_province,
        zipPostalCode: data.zip_postal_code,
        primaryPhone: data.primary_phone,
        primaryPhoneType: data.primary_phone_type,
        secondaryPhone: data.secondary_phone,
        secondaryPhoneType: data.secondary_phone_type,
        primaryEmail: data.primary_email,
        secondaryEmail: data.secondary_email,
        howHeard: data.how_heard,

        // Volunteer Specific
        ageConfirmation: data.age_confirmation,
        previousVolunteerExperience: data.previous_volunteer_experience,
        previousExperienceDetails: data.previous_experience_details,
        comfortLevelSpecialNeeds: data.comfort_level_special_needs,
        areasOfInterest: data.areas_of_interest?.join(', '),
        otherSkills: data.other_skills,
        locationAcknowledgement: data.location_acknowledgement,
        volunteerReason: data.volunteer_reason,
        emergencyContactName: data.emergency_contact_name,
        emergencyContactPhone: data.emergency_contact_phone,
        crimeConvictionCheck: data.crime_conviction_check,
        policyAcknowledgement: data.policy_acknowledgement,

        // Waiver
        waiverAgreed: data.waiver_agreed,
        eSignatureName: data.e_signature_name,

        // Submission related
        subject: data.subject,
      }

      console.log("Submitting Volunteer Application to backend:", dbPayload);

      const dbResponse = await fetch(`${apiBaseUrl}/volunteer-applications`, { // New endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" }, // No Auth token for public submission
        body: JSON.stringify(dbPayload), // Send camelCase payload
      });

      const dbResult = await dbResponse.json(); // Get dbResponse body

      if (!dbResponse.ok) {
        throw new Error(dbResult.error?.message || dbResult.message || "Failed to submit application to our database.");
      }
      console.log("Application successfully saved to database:", dbResult);

      // --- Step 2: Send email notification via Web3Forms (only if DB save was successful) ---
      try {
        const web3formsPayload = {
          ...data, // Send original snake_case form data to web3forms
          areas_of_interest: data.areas_of_interest?.join(', '),
          location_acknowledgement: data.location_acknowledgement ? 'Yes' : 'No',
          policy_acknowledgement: data.policy_acknowledgement ? 'Yes' : 'No',
          waiver_agreed: data.waiver_agreed ? 'Yes' : 'No',
          access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
          from_name: "Second Chance Volunteer Application",
          subject: `New Volunteer Application: ${data.first_name} ${data.last_name}`,
          botcheck: undefined, // Don't send honeypot data in email
        };

        console.log("Sending notification email via web3forms...");
        const emailResponse = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(web3formsPayload),
        });

        const emailResult = await emailResponse.json();
        if (emailResult.success) {
          console.log("Notification email sent successfully via web3forms.");
        } else {
          // Log the error but don't overwrite the primary success message for the user
          console.error("Failed to send notification email via web3forms:", emailResult.message || "Unknown web3forms error");
          // Optionally, you could inform admins through another channel if email fails
        }
      } catch (emailError) {
        // Log the error but don't overwrite the primary success message
        console.error("Error sending notification email via web3forms:", emailError);
      }

      // --- Overall Success (based on DB save) ---
      setIsSuccess(true);
      setSubmitMessage("Thank you! Your volunteer application has been submitted. A team member will be in touch soon!");
      reset(); // Reset form fields

      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error: any) {
      setIsSuccess(false);
      setSubmitMessage(error.message || "An unexpected error occurred. Please try again.");
      console.error("Form Submission Error:", error);
    }
  };

  // --- Base styling classes (Orange theme) ---
  const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-gray-100 dark:focus:ring-gray-900 focus:border-gray-500 dark:focus:border-gray-500";
  const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
  const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
  const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";
  const sectionTitleClasses = "text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center";
  const subSectionTitleClasses = "text-md font-medium mt-4 mb-2 text-gray-700 dark:text-gray-300 flex items-center";
  const radioLabelClasses = "ml-2 text-sm text-gray-700 dark:text-gray-300";
  const radioInputClasses = "form-radio h-4 w-4 text-gray-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600";
  const checkboxLabelClasses = "ml-2 text-sm text-gray-700 dark:text-gray-300";
  const checkboxInputClasses = "form-checkbox h-4 w-4 text-gray-600 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-500 dark:bg-gray-700";

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex-shrink-0 p-5 bg-gray-500 dark:bg-gray-600">
        <h3 className="text-lg text-white text-center font-semibold">
          Volunteer Application
        </h3>
      </div>

      {/* Form Area - Scrollable */}
      <div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
        {!isSuccess ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ... Honeypot & Hidden Subject ... */}
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
              <input type="email" id="secondary_email" className={`${inputBaseClasses} `} />
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

            {/* --- Household & Home Environment Section --- */}
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
            <h4 className={sectionTitleClasses}>
              Home & Household
              <TooltipButton content="Helps us understand the potential foster environment to ensure it's safe and suitable for temporary care." label="More info about home and household questions" />
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

            {/* --- Volunteer Information Section --- */}
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
            <h4 className={sectionTitleClasses}>
              Volunteering Details
              <TooltipButton content="Helps us match your interests, skills, experience, and suitability with our current volunteer needs." label="More info about volunteering details" />
            </h4>

            {/* Age Confirmation */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Are you 18 years of age or older? *
                <TooltipButton content="Required for liability and safety purposes." label="More info about age requirement" />
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                <label className="inline-flex items-center">
                  <input type="radio" value="Yes" {...register("age_confirmation", { required: "Please confirm age eligibility" })} className={radioInputClasses} />
                  <span className={radioLabelClasses}>Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="No" {...register("age_confirmation", { required: "Please confirm age eligibility" })} className={radioInputClasses} />
                  <span className={radioLabelClasses}>No</span>
                </label>
              </div>
              {errors.age_confirmation && <p className={errorTextClasses}>{errors.age_confirmation.message}</p>}
              {watch("age_confirmation") === 'No' && <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">Note: Volunteers generally must be 18+. Limited opportunities may exist for younger volunteers with parental supervision - please contact us directly.</p>}
            </div>

            {/* Previous Experience */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Have you volunteered with animals or at a shelter/rescue before?</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                <label className="inline-flex items-center">
                  <input type="radio" value="Yes" {...register("previous_volunteer_experience")} className={radioInputClasses} />
                  <span className={radioLabelClasses}>Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="No" {...register("previous_volunteer_experience")} className={radioInputClasses} />
                  <span className={radioLabelClasses}>No</span>
                </label>
              </div>
            </div>
            {/* Previous Experience Details (Conditional) */}
            {watchPreviousExperience === 'Yes' && (
              <div className="mb-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                <label htmlFor="previous_experience_details" className={labelBaseClasses}>If Yes, please briefly describe where and your role(s).</label>
                <textarea id="previous_experience_details" rows={2} {...register("previous_experience_details")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.previous_experience_details)} h-auto`} />
              </div>
            )}

            {/* Comfort with Special Needs */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Comfortable working with animals needing special support? *
                <TooltipButton content="Some animals may be very shy, need medication, or require specific behaviour protocols. Training provided!" label="More info about special needs animals" />
              </label>
              <select {...register("comfort_level_special_needs", { required: "Please select your comfort level" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.comfort_level_special_needs)}`}>
                <option value="">Select...</option>
                <option value="Yes">Yes, I&lsquo;m comfortable</option>
                <option value="Maybe">Maybe, I&lsquo;m willing to learn</option>
                <option value="No">No, I&lsquo;d prefer not to initially</option>
              </select>
              {errors.comfort_level_special_needs && <p className={errorTextClasses}>{errors.comfort_level_special_needs.message}</p>}
            </div>

            {/* Areas of Interest */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Areas of Interest (Check all that apply) *
                <TooltipButton content="Select any roles you might like to learn more about. Training is provided!" label="More info about areas of interest" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-1">
                {['Dog Walking', 'Cat Care / Socialization', 'Shelter Cleaning / Support', 'Adoption Events', 'Fundraising', 'Transport', 'Admin / Office Help', 'Photography/Videography', 'Grounds/Facility Maintenance'].map((interest) => (
                  <div key={interest} className="flex items-center">
                    <input type="checkbox" id={`interest-${interest.replace(/\W+/g, '-')}`} value={interest} {...register("areas_of_interest", { required: "Please select at least one area" })} className={checkboxInputClasses} />
                    <label htmlFor={`interest-${interest.replace(/\W+/g, '-')}`} className={checkboxLabelClasses}>{interest}</label>
                  </div>
                ))}
              </div>
              {errors.areas_of_interest && <p className={errorTextClasses}>{errors.areas_of_interest.message}</p>}
            </div>

            {/* Other Skills */}
            <div className="mb-4">
              <label htmlFor="other_skills" className={labelBaseClasses}>Other Skills or Talents? (Optional)
                <TooltipButton content="Let us know if you have professional skills (marketing, finance, trades, graphic design, etc.) that could also benefit the rescue!" label="More info about other skills" />
              </label>
              <textarea id="other_skills" rows={3} {...register("other_skills")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.other_skills)} h-auto`} placeholder="e.g., Graphic design, plumbing, bookkeeping..." />
            </div>

            {/* Location Acknowledgement */}
            <div className="mb-4 p-3 bg-accent-100 dark:bg-accent-900 border border-accent-300 dark:border-accent-700 rounded">
              <p className="text-sm font-semibold text-accent-800 dark:text-accent-200 mb-2">Location Note:</p>
              <p className="text-sm text-accent-700 dark:text-accent-300 mb-3">
                The Second Chance shelter facility is located in the west valley (Glendale, AZ) near the intersection of Cactus Rd and 67th Ave. Please confirm this location is feasible for you to volunteer at regularly.
              </p>
              {/* Using a single required checkbox for simplicity */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="location_acknowledgement"
                  {...register("location_acknowledgement", { required: "Please acknowledge the location information" })}
                  className={`h-4 w-4 text-orange-600 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 dark:bg-gray-700 ${errors.location_acknowledgement ? 'border-red-500' : ''}`}
                />
                <label htmlFor="location_acknowledgement" className={checkboxLabelClasses}>I understand and the location works for me.</label>
              </div>
              {errors.location_acknowledgement && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.location_acknowledgement.message}</p>}
            </div>

            {/* Reason for Volunteering */}
            <div className="mb-4">
              <label htmlFor="volunteer_reason" className={labelBaseClasses}>Primary reason for volunteering? (Optional)
                <TooltipButton content="Helps us understand your motivation and track hours if needed for school/court." label="More info about reason for volunteering" />
              </label>
              <select id="volunteer_reason" {...register("volunteer_reason")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.volunteer_reason)}`}>
                <option value="">Select if applicable...</option>
                <option value="General Interest">General Interest / Love for Animals</option>
                <option value="School Credit">School Credit / Project</option>
                <option value="Court Ordered">Court Ordered Community Service</option>
                <option value="Group Activity">Group / Company Activity</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* --- Safety & Emergency Contact Section --- */}
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
            <h4 className={sectionTitleClasses}>
              Safety & Emergency Information
              <TooltipButton content="Standard questions to ensure a safe environment for everyone." label="More info about safety questions" />
            </h4>

            {/* Crime Conviction Check */}
            <div className="mb-4">
              <label className={labelBaseClasses}>Have you ever been convicted of a crime involving animal cruelty, neglect, or violence? *</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                <label className="inline-flex items-center">
                  <input type="radio" value="Yes" {...register("crime_conviction_check", { required: "Please answer this question" })} className={radioInputClasses} />
                  <span className={radioLabelClasses}>Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="No" {...register("crime_conviction_check", { required: "Please answer this question" })} className={radioInputClasses} />
                  <span className={radioLabelClasses}>No</span>
                </label>
              </div>
              {errors.crime_conviction_check && <p className={errorTextClasses}>{errors.crime_conviction_check.message}</p>}
              {watch("crime_conviction_check") === 'Yes' && <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">Please note: A conviction may not necessarily disqualify you, but requires discussion.</p>}
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="emergency_contact_name" className={labelBaseClasses}>Emergency Contact Name *
                  <TooltipButton content="Who should we contact in case of an emergency while you are volunteering?" label="More info about emergency contact" />
                </label>
                <input type="text" id="emergency_contact_name" {...register("emergency_contact_name", { required: "Emergency contact name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.emergency_contact_name)}`} />
                {errors.emergency_contact_name && <p className={errorTextClasses}>{errors.emergency_contact_name.message}</p>}
              </div>
              <div>
                <label htmlFor="emergency_contact_phone" className={labelBaseClasses}>Emergency Contact Phone *</label>
                <input type="tel" id="emergency_contact_phone" {...register("emergency_contact_phone", { required: "Emergency contact phone is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.emergency_contact_phone)}`} />
                {errors.emergency_contact_phone && <p className={errorTextClasses}>{errors.emergency_contact_phone.message}</p>}
              </div>
            </div>

            {/* Policy Acknowledgement */}
            <div className="mb-4 mt-6">
              <label className={`${labelBaseClasses} flex items-start cursor-pointer`}>
                <input type="checkbox" id="policy_acknowledgement" {...register("policy_acknowledgement", { required: "You must acknowledge understanding" })} className={`${checkboxInputClasses} mt-1 mr-2 flex-shrink-0 ${errors.policy_acknowledgement ? 'border-red-500' : ''}`} />
                <span className={checkboxLabelClasses}>
                  I understand that volunteering with animals involves inherent risks and requires following safety protocols. I agree to adhere to all Second Chance Animal Rescue & Sanctuary policies and procedures. *
                </span>
              </label>
              {errors.policy_acknowledgement && <p className={errorTextClasses}>{errors.policy_acknowledgement.message}</p>}
            </div>

            {/* How Heard About Us */}
            <div className="mb-4">
              <label htmlFor="how_heard" className={labelBaseClasses}>How did you hear about us? (Optional)</label>
              <input type="text" id="how_heard" {...register("how_heard")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.how_heard)}`} />
            </div>

            {/* --- Waiver Section --- */}
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
            <h4 className={sectionTitleClasses}>
              Volunteer Agreement & Waiver
              <TooltipButton content="Please read and agree to the terms to become a volunteer." label="More info about volunteer agreement" />
            </h4>
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">
              <h5 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Waiver and Liability Agreement:</h5>
              <div className="prose prose-sm dark:prose-invert max-h-60 overflow-y-auto p-2 border dark:border-gray-500 rounded bg-white dark:bg-gray-700/50 mb-3">
                <pre className="whitespace-pre-wrap font-sans">{VOLUNTEER_WAIVER_TEXT}</pre>
              </div>

              <div className="mb-4">
                <label htmlFor="waiver_agreed" className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="waiver_agreed"
                    {...register("waiver_agreed", { required: "You must agree to the terms." })}
                    className={`${checkboxInputClasses} ${errors.waiver_agreed ? 'border-red-500' : ''}`}
                  />
                  <span className={`${checkboxLabelClasses} ml-2`}>
                    I have read, understand, and agree to the Volunteer Agreement and Waiver of Liability terms stated above. *
                  </span>
                </label>
                {errors.waiver_agreed && <p className={errorTextClasses}>{errors.waiver_agreed.message}</p>}
              </div>

              <div>
                <label htmlFor="e_signature_name" className={labelBaseClasses}>
                  Electronic Signature (Type Full Name) *
                  <TooltipButton content="Typing your full name here acts as your electronic signature, confirming your agreement." label="More info about electronic signature" />
                </label>
                <input
                  type="text"
                  id="e_signature_name"
                  {...register("e_signature_name", {
                    required: "Please type your full name as your signature.",
                    validate: (value, formValues) => {
                      if (formValues.waiver_agreed && (!value || value.trim() === '')) {
                        return "Signature is required if waiver is agreed.";
                      }
                      return true;
                    }
                  })}
                  className={`${inputBaseClasses} ${inputBorderClasses(!!errors.e_signature_name)}`}
                  placeholder="Type your full legal name"
                />
                {errors.e_signature_name && <p className={errorTextClasses}>{errors.e_signature_name.message}</p>}
              </div>
            </div>

            {/* Submit/Cancel Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-8">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800">Cancel</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-700 focus:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 disabled:opacity-50">
                {isSubmitting ? "Submitting..." : "Submit Volunteer Application"}
              </button>
            </div>
          </form>
        ) : (
          // Success Message Area
          <div className="flex flex-col items-center justify-center text-center min-h-[200px]">
            <SuccessCheckmarkIcon />
            <h3 className="py-5 text-xl text-green-600 dark:text-green-400">Application Submitted!</h3>
            <p className="text-gray-700 dark:text-gray-300 md:px-3">{submitMessage}</p>
            <button type="button" className="mt-6 text-orange-600 dark:text-orange-400 hover:underline focus:outline-none" onClick={onClose}>Close</button>
          </div>
        )}
        {/* Display submission error message */}
        {!isSuccess && submitMessage && (
          <p className="mt-4 text-center text-red-500 dark:text-red-400">
            {submitMessage}
          </p>
        )}
      </div>
    </div>
  );
}
