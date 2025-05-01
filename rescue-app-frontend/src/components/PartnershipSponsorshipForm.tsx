"use client";
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from "react-hook-form";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { SuccessCheckmarkIcon, InformationCircleIcon } from "@/components/Icons";

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

	// Submission related (hidden/internal)
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

	// Input/Select/Textarea base classes for consistency
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
					Partnership/Sponsorship Application
				</h3>
			</div>

			{/* Form Area - Make scrollable */}
			<div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
				{!isSuccess ? (
					<form onSubmit={handleSubmit(onSubmit)} noValidate>
						{/* Honeypot & Hidden Subject */}
						<input type="checkbox" className="hidden" style={{ display: "none" }} {...register("botcheck")} />
						<input type="hidden" {...register("subject")} />

						{/* --- Inquiry About Partnership/Sponsorship Section --- */}
						<h4 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
							Inquiry About Partnership/Sponsorship
							<TooltipButton content="Basic contact details allow us to follow up on your inquiry." label="More info about applicant information" />
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

						{/* How Heard About Us */}
						<div className="mb-4">
							<label htmlFor="how_heard" className={labelBaseClasses}>How did you hear about us? (Optional)</label>
							<input type="text" id="how_heard" {...register("how_heard")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.how_heard)}`} />
						</div>

						{/* --- Partnership/Sponsorship Specific Section --- */}
						{/* Details of Interest */}
						<div className="mb-4">
							<label htmlFor="details_of_interest" className={labelBaseClasses}>Please tell us a bit more about your interest or how you envision supporting us.</label>
							<textarea
								id="details_of_interest"
								rows={5}
								{...register("details_of_interest")}
								className={`${inputBaseClasses} ${inputBorderClasses(!!errors.details_of_interest)}`}
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
								className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-700 focus:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 disabled:opacity-50">
								{isSubmitting ? "Submitting..." : "Submit Application"}
							</button>
						</div>
					</form>
				) : (
					// Success Message Area
					<div className="flex flex-col items-center justify-center text-center min-h-[200px]">
						{/* Success Icon */}
						<SuccessCheckmarkIcon />
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
