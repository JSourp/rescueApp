// src/components/AnimalInquiryForm.tsx
"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";

interface AnimalInquiryFormProps {
  animalName: string;
  animalId: number | string;
  onClose: () => void;
}

interface FormData {
    name: string;
    email: string;
    phone?: string;
    message: string;
    subject: string;
    botcheck?: string;
}

export default function AnimalInquiryForm({ animalName, animalId, onClose }: AnimalInquiryFormProps) {
  const prefilledSubject = `Inquiry about ${animalName} (ID: ${animalId})`;
  const prefilledMessage = `Hello,\n\nI'm interested in learning more about adopting ${animalName}.\n\nPlease provide more information.\n\nMy questions are:\n\n`;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({
    mode: "onTouched",
    defaultValues: {
        subject: prefilledSubject,
        message: prefilledMessage,
    }
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const onSubmit = async (data: FormData) => {
    setIsSuccess(false);
    setSubmitMessage("");
    console.log("Form Data:", data);

    try {
      if (data.botcheck) {
        console.warn("Bot submission detected. Ignoring.");
        setSubmitMessage("Submission ignored due to bot detection.");
        return;
      }
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
          subject: data.subject,
          name: data.name,
          email: data.email,
          phone: data.phone || "Not provided",
          message: data.message,
          from_name: "Rescue App Inquiry", // Optional: Identify source
          // Add animal details if web3forms allows configured custom fields
           animal_name: animalName,
           animal_id: animalId
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsSuccess(true);
        setSubmitMessage("Thank you! Your inquiry has been sent.");
        // Consider not resetting if you show the success message within the form area
        reset();
        // Optionally close after delay: setTimeout(onClose, 3000);
      } else {
        throw new Error(result.message || "Failed to send message.");
      }
    } catch (error: any) {
      setIsSuccess(false);
      setSubmitMessage(error.message || "An unexpected error occurred. Please try again.");
      console.error("Form Submission Error:", error);
    }
  };

  return (
    // Container div now inside the Modal - apply padding/background here
    // Match the padding and internal background of PopupWidget's form area
    <div className="flex flex-col"> {/* Use flex-col to structure header/form */}

        <div className="flex flex-col items-center justify-center p-5 bg-indigo-600">
             <h3 className="text-lg text-white text-center">Inquiry about {animalName}</h3>
        </div>

        {/* Form Area */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800 overflow-auto">
            {!isSuccess ? (
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* Honeypot */}
                <input type="checkbox" className="hidden" style={{ display: "none" }} {...register("botcheck")} />
                {/* Hidden Subject */}
                <input type="hidden" {...register("subject")} />

                {/* Name Input */}
                <div className="mb-4">
                    <label htmlFor="name" className="block mb-2 text-sm text-gray-600 dark:text-gray-400">Full Name</label>
                    <input
                    type="text"
                    id="name"
                    {...register("name", { required: "Full name is required", maxLength: 80 })}
                    placeholder="John Doe"
                    className={`w-full px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 border ${errors.name ? 'border-red-500 dark:border-red-600 focus:border-red-500 dark:focus:border-red-600 ring-red-100 dark:ring-red-900' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 ring-indigo-100 dark:ring-indigo-900'} rounded-md focus:outline-none focus:ring text-gray-900 dark:text-gray-100`}
                    />
                    {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>

                {/* Email Input */}
                <div className="mb-4">
                    <label htmlFor="email" className="block mb-2 text-sm text-gray-600 dark:text-gray-400">Email Address</label>
                    <input
                    type="email"
                    id="email"
                    {...register("email", { required: "Enter your email", pattern: { value: /^\S+@\S+$/i, message: "Please enter a valid email" } })}
                    placeholder="you@example.com"
                    className={`w-full px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 border ${errors.email ? 'border-red-500 dark:border-red-600 focus:border-red-500 dark:focus:border-red-600 ring-red-100 dark:ring-red-900' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 ring-indigo-100 dark:ring-indigo-900'} rounded-md focus:outline-none focus:ring text-gray-900 dark:text-gray-100`}
                    />
                    {errors.email && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>

                {/* Phone Input */}
                <div className="mb-4">
                    <label htmlFor="phone" className="block mb-2 text-sm text-gray-600 dark:text-gray-400">Phone (Optional)</label>
                    <input
                    type="tel"
                    id="phone"
                    {...register("phone")} // Basic validation from PopupWidget was removed, add if needed
                    placeholder="(555) 123-4567"
                    className={`w-full px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 border ${errors.phone ? 'border-red-500 dark:border-red-600 focus:border-red-500 dark:focus:border-red-600 ring-red-100 dark:ring-red-900' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 ring-indigo-100 dark:ring-indigo-900'} rounded-md focus:outline-none focus:ring text-gray-900 dark:text-gray-100`}
                    />
                    {errors.phone && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.phone.message}</p>}
                </div>

                {/* Message Textarea */}
                <div className="mb-4">
                    <label htmlFor="message" className="block mb-2 text-sm text-gray-600 dark:text-gray-400">Your Message</label>
                    <textarea
                    id="message"
                    rows={5}
                    {...register("message", { required: "Enter your Message" })}
                    placeholder="Your questions or comments..."
                    className={`w-full px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 border ${errors.message ? 'border-red-500 dark:border-red-600 focus:border-red-500 dark:focus:border-red-600 ring-red-100 dark:ring-red-900' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 ring-indigo-100 dark:ring-indigo-900'} rounded-md focus:outline-none focus:ring h-28 text-gray-900 dark:text-gray-100`} // Added h-28 like PopupWidget
                    />
                    {errors.message && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.message.message}</p>}
                </div>

                {/* Submit/Cancel Buttons */}
                <div className="flex justify-end gap-3 pt-2"> {/* Use pt-2 or similar for spacing */}
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
                        {isSubmitting ? (
                             <svg className="w-5 h-5 mx-auto text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                        ) : (
                            "Send Inquiry"
                        )}
                    </button>
                </div>
                </form>
            ) : (
                // Success Message Area
                <div className="flex flex-col items-center justify-center text-center min-h-[200px]"> {/* Added min-height */}
                    <svg width="60" height="60" className="text-green-500 dark:text-green-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M26.6666 50L46.6666 66.6667L73.3333 33.3333M50 96.6667C43.8716 96.6667 37.8033 95.4596 32.1414 93.1144C26.4796 90.7692 21.3351 87.3317 17.0017 82.9983C12.6683 78.6649 9.23082 73.5204 6.8856 67.8586C4.54038 62.1967 3.33331 56.1283 3.33331 50C3.33331 43.8716 4.54038 37.8033 6.8856 32.1414C9.23082 26.4796 12.6683 21.3351 17.0017 17.0017C21.3351 12.6683 26.4796 9.23084 32.1414 6.88562C37.8033 4.5404 43.8716 3.33333 50 3.33333C62.3767 3.33333 74.2466 8.24998 82.9983 17.0017C91.75 25.7534 96.6666 37.6232 96.6666 50C96.6666 62.3768 91.75 74.2466 82.9983 82.9983C74.2466 91.75 62.3767 96.6667 50 96.6667Z" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    <h3 className="py-5 text-xl text-green-600 dark:text-green-400">
                        Inquiry Sent Successfully!
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 md:px-3">{submitMessage}</p>
                    <button
                        type="button"
                        className="mt-6 text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
                        onClick={onClose}
                    >
                         Close
                    </button>
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