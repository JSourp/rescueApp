"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";

interface AnimalInquiryFormProps {
  animalName: string;
  animalId: number | string;
  onClose: () => void; // Function to close the modal/form
}

// Define the shape of your form data
interface FormData {
    name: string;
    email: string;
    phone?: string; // Optional
    message: string;
    subject: string; // Add subject field
    botcheck?: string; // Honeypot
}

export default function AnimalInquiryForm({ animalName, animalId, onClose }: AnimalInquiryFormProps) {
  const prefilledSubject = `Inquiry about ${animalName} (ID: ${animalId})`;
  const prefilledMessage = `Hello,\n\nI'm interested in learning more about adopting ${animalName} (ID: ${animalId}).\n\nPlease provide more information.\n\nMy questions are:\n\n`;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    mode: "onTouched",
    // Set default values for the form
    defaultValues: {
        subject: prefilledSubject,
        message: prefilledMessage,
        // You could prefill name/email if user is logged in, etc.
    }
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(""); // Renamed 'message' state

  const onSubmit = async (data: FormData) => {
    // Reset status on new submission attempt
    setIsSuccess(false);
    setSubmitMessage("");

    console.log("Form Data:", data); // For debugging

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
          subject: data.subject, // Send the generated subject
          name: data.name,
          email: data.email,
          phone: data.phone || "Not provided",
          message: data.message,
          // Add animal details if web3forms allows custom fields
          // animal_name: animalName,
          // animal_id: animalId
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsSuccess(true);
        setSubmitMessage("Thank you! Your inquiry has been sent.");
        // Optionally reset form after a delay or keep showing success message
        // reset();
        // Optionally close the form after success:
        // setTimeout(onClose, 3000); // Close after 3 seconds
      } else {
        throw new Error(result.message || "Failed to send message.");
      }
    } catch (error: any) {
      setIsSuccess(false);
      setSubmitMessage(error.message || "An unexpected error occurred. Please try again.");
      console.error("Form Submission Error:", error);
    }
  };

  // --- FORM JSX (Simplified - Adapt styling from PopupWidget) ---
  // You would copy/adapt the input fields, labels, error handling,
  // and submit button from PopupWidget.tsx here.
  // Remember to include a hidden field for 'subject' if needed by web3forms
  // or just rely on it being sent in the JSON body.
  return (
    <div className="p-6 bg-white rounded shadow-lg max-w-md mx-auto"> {/* Example styling */}
      <h2 className="text-2xl font-semibold mb-4">Inquiry about {animalName}</h2>

      {!isSuccess ? (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
           {/* Honeypot */}
           <input type="checkbox" className="hidden" style={{ display: "none" }} {...register("botcheck")} />
           {/* Hidden Subject (optional, if you want it as a standard field) */}
           <input type="hidden" {...register("subject")} />

           {/* Name Input (Copy from PopupWidget with register('name', ...)) */}
           <div className="mb-4">
             <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-700">Full Name</label>
             <input type="text" id="name" {...register("name", { required: "Full name is required", maxLength: 80 })} className={`w-full p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded`} />
             {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
           </div>

           {/* Email Input (Copy from PopupWidget with register('email', ...)) */}
            <div className="mb-4">
                <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">Email Address</label>
                <input type="email" id="email" {...register("email", { required: "Enter your email", pattern: { value: /^\S+@\S+$/i, message: "Please enter a valid email" } })} className={`w-full p-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

           {/* Phone Input (Copy from PopupWidget with register('phone', ...)) */}
            <div className="mb-4">
                <label htmlFor="phone" className="block mb-1 text-sm font-medium text-gray-700">Phone (Optional)</label>
                <input type="tel" id="phone" {...register("phone")} className={`w-full p-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded`} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>


           {/* Message Textarea (Copy from PopupWidget with register('message', ...)) */}
            <div className="mb-4">
                <label htmlFor="message" className="block mb-1 text-sm font-medium text-gray-700">Your Message</label>
                <textarea id="message" rows={5} {...register("message", { required: "Enter your Message" })} className={`w-full p-2 border ${errors.message ? 'border-red-500' : 'border-gray-300'} rounded`} />
                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
            </div>

           {/* Submit Button (Copy from PopupWidget) */}
            <div className="flex justify-end gap-2">
                 <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300">
                    Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-white bg-indigo-500 rounded hover:bg-indigo-600 disabled:opacity-50">
                    {isSubmitting ? "Sending..." : "Send Inquiry"}
                </button>
           </div>
        </form>
      ) : (
         // Success Message Area (Copy/Adapt from PopupWidget)
        <div className="text-center">
            <p className="text-green-600 font-semibold">{submitMessage}</p>
             <button type="button" onClick={onClose} className="mt-4 px-4 py-2 text-indigo-600 hover:underline">
                 Close
            </button>
        </div>
      )}
       {/* Display submission error message */}
       {!isSuccess && submitMessage && (
            <p className="mt-4 text-center text-red-500">{submitMessage}</p>
       )}
    </div>
  );
}