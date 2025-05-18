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
	organization_name?: string; // Optional
	contact_title?: string; // Optional
	website_url?: string; // Optional
	primary_phone: string;
	primary_phone_type: 'Cell' | 'Home' | 'Work' | ''; // Enum-like type
	primary_email: string;
	how_heard?: string; // Optional text/select

	// Partnership/Sponsorship Specific
	interest_type?: string; // Optional select
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
		}
	});

	const [isSuccess, setIsSuccess] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

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

			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			if (!apiBaseUrl) {
				throw new Error("API base URL is not configured.");
			}

			// --- Step 1: Save application to the database ---
			const dbPayload = {
				// Contact Info
				firstName: data.first_name,
				lastName: data.last_name,
				organizationName: data.organization_name,
				contactTitle: data.contact_title,
				primaryPhone: data.primary_phone,
				primaryPhoneType: data.primary_phone_type,
				primaryEmail: data.primary_email,
				websiteUrl: data.website_url,
				howHeard: data.how_heard,
				interestType: data.interest_type,
				detailsOfInterest: data.details_of_interest,

				// Submission related
				subject: data.subject,
			}

			console.log("Submitting Partnership/Sponsorship Application to backend:", dbPayload);

			const dbResponse = await fetch(`${apiBaseUrl}/partnership-sponsorship-applications`, {
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
					access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
					from_name: "Rescue App Partnership/Sponsorship Application", // Customize as needed
					subject: `New Partnership/Sponsorship Application: ${data.first_name} ${data.last_name} of ${data.organization_name || "N/A"}`,
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
			setSubmitMessage("Thank you! Your application has been submitted. We will be in touch soon!");
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
						<h4 className={sectionTitleClasses}>
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
						{/* Organization Name (Optional) */}
						<div className="mb-4">
							<label htmlFor="organization_name" className={labelBaseClasses}>Organization Name (Optional)</label>
							<input type="text" id="organization_name" {...register("organization_name")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.organization_name)}`} />
						</div>
						{/* Contact Title (Optional) */}
						<div className="mb-4">
							<label htmlFor="contact_title" className={labelBaseClasses}>Contact Title (Optional)</label>
							<input type="text" id="contact_title" {...register("contact_title")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.contact_title)}`} />
						</div>
						{/* Website (Optional) */}
						<div className="mb-4">
							<label htmlFor="website_url" className={labelBaseClasses}>Website (Optional)</label>
							<input type="text" id="website_url" {...register("website_url")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.website_url)}`} />
						</div>
						{/* Primary Email */}
						<div className="mb-4">
							<label htmlFor="primary_email" className={labelBaseClasses}>Email *</label>
							<input type="email" id="primary_email" {...register("primary_email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_email)}`} />
							{errors.primary_email && <p className={errorTextClasses}>{errors.primary_email.message}</p>}
						</div>
						{/* Primary Phone */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="primary_phone" className={labelBaseClasses}>Phone *</label>
								<input type="tel" id="primary_phone" {...register("primary_phone", { required: "Phone is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_phone)}`} />
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

						{/* How Heard About Us */}
						<div className="mb-4">
							<label htmlFor="how_heard" className={labelBaseClasses}>How did you hear about us? (Optional)</label>
							<input type="text" id="how_heard" {...register("how_heard")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.how_heard)}`} />
						</div>

						{/* --- Partnership/Sponsorship Specific Section --- */}
						{/* Interest Type */}
						<div className="mb-4">
							<label htmlFor="interest_type" className={labelBaseClasses}>Interest Type</label>
							<select id="interest_type" {...register("interest_type")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.interest_type)}`}>
								<option value="">Select Type...</option>
								<option value="In-kind Donation">In-kind Donation</option>
								<option value="Corporate Partnership">Corporate Partnership</option>
								<option value="Program Sponsorship">Program Sponsorship</option>
								<option value="Event Sponsorship">Event Sponsorship</option>
							</select>
						</div>

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
								disabled={isSubmitting}
								className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800">
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
