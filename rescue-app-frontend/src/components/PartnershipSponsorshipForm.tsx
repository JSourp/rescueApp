"use client";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";

interface PartnershipSponsorshipFormData {
  // Contact Info
  first_name: string;
  last_name: string;
  spouse_partner_roommate?: string; // Optional
  street_address: string;
  apt_unit?: string; // Optional
  city: string;
  state_province: string;
  zip_postal_code: string;
  primary_phone: string;
  primary_phone_type: 'Cell' | 'Home' | 'Work' | ''; // Enum-like type
  secondary_phone?: string; // Optional
  secondary_phone_type?: 'Cell' | 'Home' | 'Work' | ''; // Optional
  primary_email: string;
  secondary_email?: string; // Optional
  how_heard?: string; // Optional text/select

  // Partnership/Sponsorship Specific
  details_of_interest?: string; // Textarea
  /*

  */

  // Submission related (hidden/internal)
  subject: string;
  botcheck?: string;
}

interface PartnershipSponsorshipFormProps {
  onClose: () => void;
}

export default function PartnershipSponsorshipForm({ onClose }: PartnershipSponsorshipFormProps) {
  const prefilledSubject = `Partnership/Sponsorship Application`;

  const {
	register,
	handleSubmit,
	reset,
	control, // Needed for controlled components like radio groups if used
	formState: { errors, isSubmitting },
  } = useForm<PartnershipSponsorshipFormData>({
	mode: "onTouched",
	defaultValues: {
	  subject: prefilledSubject,
	  primary_phone_type: '', // Set initial default for selects
	  secondary_phone_type: '',
	}
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  // Re-use the onSubmit logic, adjusting the payload for web3forms
  const onSubmit = async (data: PartnershipSponsorshipFormData) => {
	setIsSuccess(false);
	setSubmitMessage("");
	console.log("Partnership/Sponsorship Form Data:", data);

	try {
	  if (data.botcheck) {
		console.warn("Bot submission detected. Ignoring.");
		setSubmitMessage("Submission ignored due to bot detection.");
		return;
	  }

	  // Prepare data for web3forms (flatten array, etc.)
	  const payload = {
		  ...data,
		  access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
		  from_name: "Rescue App Partnership/Sponsorship Application",
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
		setSubmitMessage("Thank you! Your partnership/sponsorship application has been submitted. Someone from our team will follow up with you shortly.");
		reset(); // Reset form fields after successful submission
	  } else {
		throw new Error(result.message || "Failed to send application.");
	  }
	} catch (error: any) {
	  setIsSuccess(false);
	  setSubmitMessage(error.message || "An unexpected error occurred. Please try again.");
	  console.error("Form Submission Error:", error);
	}
  };


  // --- FORM JSX ---
  // Use grid layout for address fields, etc.
  return (
	 <div className="flex flex-col max-h-[85vh]">
		{/* Header */}
		<div className="flex-shrink-0 p-5 bg-orange-600">
			 <h3 className="text-lg text-white text-center font-semibold">Partnership/Sponsorship Application</h3>
		</div>

		 {/* Form Area - Make scrollable */}
		<div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
			{!isSuccess ? (
				<form onSubmit={handleSubmit(onSubmit)} noValidate>
					{/* Honeypot & Hidden Subject */}
					<input type="checkbox" className="hidden" style={{ display: "none" }} {...register("botcheck")} />
					<input type="hidden" {...register("subject")} />

					{/* --- Contact Info Section --- */}
					<h4 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Contact Information</h4>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					   {/* First Name */}
						<div>
							<label htmlFor="first_name" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">First Name *</label>
							<input type="text" id="first_name" {...register("first_name", { required: "First name is required" })} className={`w-full p-2 border ${errors.first_name ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
							{errors.first_name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.first_name.message}</p>}
						</div>
						{/* Last Name */}
						 <div>
							<label htmlFor="last_name" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Last Name *</label>
							<input type="text" id="last_name" {...register("last_name", { required: "Last name is required" })} className={`w-full p-2 border ${errors.last_name ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
							{errors.last_name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.last_name.message}</p>}
						</div>
					</div>
					{/* Spouse/Partner (Optional) */}
					 <div className="mb-4">
						<label htmlFor="spouse_partner_roommate" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Spouse/Partner/Roommate (Optional)</label>
						<input type="text" id="spouse_partner_roommate" {...register("spouse_partner_roommate")} className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
					</div>
					{/* Street Address */}
					 <div className="mb-4">
						<label htmlFor="street_address" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Street Address *</label>
						<input type="text" id="street_address" {...register("street_address", { required: "Street address is required" })} className={`w-full p-2 border ${errors.street_address ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
						 {errors.street_address && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.street_address.message}</p>}
					</div>
					 {/* Apt/Unit (Optional) */}
					 <div className="mb-4">
						<label htmlFor="apt_unit" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Apt/Unit # (Optional)</label>
						<input type="text" id="apt_unit" {...register("apt_unit")} className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
					</div>
					 {/* City/State/Zip */}
					 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						 <div>
							<label htmlFor="city" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">City *</label>
							<input type="text" id="city" {...register("city", { required: "City is required" })} className={`w-full p-2 border ${errors.city ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
							{errors.city && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.city.message}</p>}
						 </div>
						  <div>
							<label htmlFor="state_province" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">State/Province *</label>
							<input type="text" id="state_province" {...register("state_province", { required: "State/Province is required" })} className={`w-full p-2 border ${errors.state_province ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
							 {errors.state_province && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.state_province.message}</p>}
						 </div>
						  <div>
							<label htmlFor="zip_postal_code" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Zip/Postal Code *</label>
							<input type="text" id="zip_postal_code" {...register("zip_postal_code", { required: "Zip/Postal Code is required" })} className={`w-full p-2 border ${errors.zip_postal_code ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
							 {errors.zip_postal_code && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.zip_postal_code.message}</p>}
						 </div>
					 </div>
					{/* Primary Phone */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label htmlFor="primary_phone" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Primary Phone *</label>
							<input type="tel" id="primary_phone" {...register("primary_phone", { required: "Primary phone is required" })} className={`w-full p-2 border ${errors.primary_phone ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
							{errors.primary_phone && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.primary_phone.message}</p>}
						</div>
						 <div>
							<label htmlFor="primary_phone_type" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Primary Phone Type *</label>
							<select id="primary_phone_type" {...register("primary_phone_type", { required: "Select phone type" })} className={`w-full p-2 border ${errors.primary_phone_type ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`}>
								<option value="">Select Type...</option>
								<option value="Cell">Cell</option>
								<option value="Home">Home</option>
								<option value="Work">Work</option>
							</select>
							{errors.primary_phone_type && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.primary_phone_type.message}</p>}
						 </div>
					</div>
					{/* Secondary Phone (Optional) */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label htmlFor="secondary_phone" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Secondary Phone (Optional)</label>
							<input type="tel" id="secondary_phone" {...register("secondary_phone")} className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
						</div>
						<div>
							<label htmlFor="secondary_phone_type" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Secondary Phone Type</label>
							 <select id="secondary_phone_type" {...register("secondary_phone_type")} className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`}>
								<option value="">Select Type...</option>
								<option value="Cell">Cell</option>
								<option value="Home">Home</option>
								<option value="Work">Work</option>
							</select>
						 </div>
					</div>
					 {/* Primary Email */}
					 <div className="mb-4">
						<label htmlFor="primary_email" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Primary Email *</label>
						<input type="email" id="primary_email" {...register("primary_email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email format"} })} className={`w-full p-2 border ${errors.primary_email ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
						{errors.primary_email && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.primary_email.message}</p>}
					</div>
					 {/* Secondary Email (Optional) */}
					  <div className="mb-4">
						<label htmlFor="secondary_email" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">Secondary Email (Optional)</label>
						<input type="email" id="secondary_email" {...register("secondary_email", { pattern: { value: /^\S+@\S+$/i, message: "Invalid email format"} })} className={`w-full p-2 border ${errors.secondary_email ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
						 {errors.secondary_email && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.secondary_email.message}</p>}
					</div>

					 {/* How Heard About Us */}
					 <div className="mb-4">
						<label htmlFor="how_heard" className="block mb-1 text-sm text-gray-600 dark:text-gray-400">How did you hear about us? (Optional)</label>
						 <input type="text" id="how_heard" {...register("how_heard")} className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`} />
					</div>

					{/* --- Partnership/Sponsorship Specific Section --- */}
					 {/* Details of Interest */}
					<div className="mb-4">
						<label htmlFor="details_of_interest" className="block mb-2 text-sm text-gray-600 dark:text-gray-400">Please tell us a bit more about your interest or how you envision supporting us.</label>
						<textarea
							id="details_of_interest"
							rows={5}
							{...register("details_of_interest")}
							className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-orange-100 dark:focus:ring-orange-900 focus:border-orange-500 dark:focus:border-orange-500`}
						 />
					</div>

					{/* Submit/Cancel Buttons */}
					<div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
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
							className="px-4 py-2 text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
						>
							{isSubmitting ? "Submitting..." : "Submit Application"}
						</button>
					</div>
				</form>
			) : (
				 // Success Message Area
				 <div className="flex flex-col items-center justify-center text-center min-h-[200px]">
					 {/* Success Icon */}
					 <svg width="60" height="60" className="text-green-500 dark:text-green-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26.6666 50L46.6666 66.6667L73.3333 33.3333M50 96.6667C43.8716 96.6667 37.8033 95.4596 32.1414 93.1144C26.4796 90.7692 21.3351 87.3317 17.0017 82.9983C12.6683 78.6649 9.23082 73.5204 6.8856 67.8586C4.54038 62.1967 3.33331 56.1283 3.33331 50C3.33331 43.8716 4.54038 37.8033 6.8856 32.1414C9.23082 26.4796 12.6683 21.3351 17.0017 17.0017C21.3351 12.6683 26.4796 9.23084 32.1414 6.88562C37.8033 4.5404 43.8716 3.33333 50 3.33333C62.3767 3.33333 74.2466 8.24998 82.9983 17.0017C91.75 25.7534 96.6666 37.6232 96.6666 50C96.6666 62.3768 91.75 74.2466 82.9983 82.9983C74.2466 91.75 62.3767 96.6667 50 96.6667Z" stroke="currentColor" strokeWidth="3" /></svg>
					 <h3 className="py-5 text-xl text-green-600 dark:text-green-400">Application Submitted!</h3>
					 <p className="text-gray-700 dark:text-gray-300 md:px-3">{submitMessage}</p>
					 <button type="button" className="mt-6 text-orange-600 dark:text-orange-400 hover:underline focus:outline-none" onClick={onClose}>Close</button>
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