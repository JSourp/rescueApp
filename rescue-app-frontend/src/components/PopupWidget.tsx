"use client";
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import {
  Disclosure,
  Transition,
  DisclosurePanel,
  DisclosureButton,
} from "@headlessui/react";

export function PopupWidget() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    mode: "onTouched",
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (data: any, e: any) => {
    e.preventDefault();
    setIsSuccess(false);
    setMessage("");

    try {
      // Check if the submission is likely from a bot
      if (data.botcheck) {
        console.warn("Bot submission detected. Ignoring.");
        setMessage("Submission ignored due to bot detection.");
        return; // Exit early without sending the email
      }
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
          name: data.name,
          email: data.email,
          phone: data.phone || "Not provided",
          message: data.message,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsSuccess(true);
        setMessage("Thank you! Your message has been sent.");
        e.target.reset();
        reset();
      } else {
        throw new Error(result.message || "Failed to send message.");
      }
    } catch (error: any) {
      setIsSuccess(false);
      setMessage(error.message || "An unexpected error occurred. Please try again.");
      console.error("Form Submission Error:", error);
    }
  };

  // Input/Select/Textarea base classes for consistency
  const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-gray-100 dark:focus:ring-gray-900 focus:border-gray-500 dark:focus:border-gray-500";
  const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
  const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
  const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";
  const sectionTitleClasses = "text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center";

  return (
    <div>
      <Disclosure>
        {({ open }) => (
          <>
            <DisclosureButton className="fixed z-40 flex items-center justify-center transition duration-300 bg-primary hover:bg-primary-700 focus:bg-primary-700 rounded-full shadow-lg right-5 bottom-5 w-14 h-14 focus:outline-none ease">
              <span className="sr-only">Open Contact form Widget</span>
              <Transition
                show={!open}
                enter="transition duration-200 transform ease"
                enterFrom="opacity-0 -rotate-45 scale-75"
                leave="transition duration-100 transform ease"
                leaveTo="opacity-0 -rotate-45">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute w-6 h-6 text-white"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </Transition>

              <Transition
                show={open}
                enter="transition duration-200 transform ease"
                enterFrom="opacity-0 rotate-45 scale-75"
                leave="transition duration-100 transform ease"
                leaveTo="opacity-0 rotate-45"
                className="absolute w-6 h-6 text-white"
                as={"div"}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Transition>
            </DisclosureButton>
            <Transition
              className="fixed z-50 bottom-[100px] top-0 right-0 left-0 sm:top-auto sm:right-5 sm:left-auto"
              enter="transition duration-200 transform ease"
              enterFrom="opacity-0 translate-y-5"
              leave="transition duration-200 transform ease"
              leaveTo="opacity-0 translate-y-5"
              as="div">
              <DisclosurePanel className="bg-white dark:bg-gray-800 flex flex-col overflow-hidden left-0 h-full w-full sm:w-[350px] min-h-[250px] sm:h-[600px] border border-gray-300 dark:border-gray-800 shadow-2xl rounded-md sm:max-h-[calc(100vh-120px)]">
                {/* Header */}
                <div className="flex-shrink-0 p-5 bg-gray-500 dark:bg-gray-600">
                  <h3 className="text-lg text-white text-center font-semibold">
                    How can we help?
                  </h3>
                </div>

                <div className="flex-grow h-full p-6 overflow-auto">
                  {!isSubmitSuccessful && (
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                      <input
                        type="checkbox"
                        className="hidden"
                        style={{ display: "none" }}
                        {...register("botcheck")}>
                      </input>

                      {/* First Name */}
                      <div className="mb-4">
                        <label htmlFor="fullName" className={labelBaseClasses}>Full Name *</label>
                        <input type="text" id="fullName" placeholder="John Doe" {...register("fullName", { required: "Full name is required", maxLength: 80 })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.fullName)}`} />
                        {errors.fullName && <p className={errorTextClasses}>{errors.fullName.message as string}</p>}
                      </div>

                      <div className="mb-4">
                        <label htmlFor="email" className={labelBaseClasses}>Email Address *</label>
                        <input type="text" id="email" placeholder="you@gmail.com" {...register("email", { required: "Enter your email", pattern: { value: /^\S+@\S+$/i, message: "Please enter a valid email", }, })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.email)}`} />
                        {errors.email && <p className={errorTextClasses}>{errors.email.message as string}</p>}
                      </div>

                      {/* Phone */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label htmlFor="phone" className={labelBaseClasses}>Phone *</label>
                          <input type="tel" id="phone" {...register("phone", { required: "Phone is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.phone)}`} />
                          {errors.phone && <p className={errorTextClasses}>{errors.phone.message as string}</p>}
                        </div>
                        <div>
                          <label htmlFor="phone_type" className={labelBaseClasses}>Phone Type *</label>
                          <select id="phone_type" {...register("phone_type", { required: "Select phone type" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.phone_type)}`}>
                            <option value="">Select Type...</option>
                            <option value="Cell">Cell</option>
                            <option value="Home">Home</option>
                            <option value="Work">Work</option>
                          </select>
                          {errors.phone_type && <p className={errorTextClasses}>{errors.phone_type.message as string}</p>}
                        </div>
                      </div>

                      {/* Message */}
                      <div className="mb-4">
                        <label htmlFor="message" className={labelBaseClasses}>Your Message *</label>
                        <textarea id="message" rows={4} {...register("message", { required: "Enter your Message" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.message)} h-auto`} />
                        {errors.message && <p className={errorTextClasses}>{errors.message.message as string}</p>}
                      </div>

                      {/* Send Message Button */}
                      <div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-6">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-700 focus:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 disabled:opacity-50">
                          {isSubmitting ? "Sending..." : "Send Message"}
                        </button>
                      </div>

                      <p className="text-xs text-center text-gray-400 p-4" id="result">
                        <span>
                          Powered by{" "}
                          <a href="https://Web3Forms.com" className="text-gray-600" target="_blank" rel="noopener noreferrer">
                            Web3Forms
                          </a>
                        </span>
                      </p>
                    </form>
                  )}

                  {isSubmitSuccessful && isSuccess && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-white rounded-md">
                      <svg
                        width="60"
                        height="60"
                        className="text-green-300"
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M26.6666 50L46.6666 66.6667L73.3333 33.3333M50 96.6667C43.8716 96.6667 37.8033 95.4596 32.1414 93.1144C26.4796 90.7692 21.3351 87.3317 17.0017 82.9983C12.6683 78.6649 9.23082 73.5204 6.8856 67.8586C4.54038 62.1967 3.33331 56.1283 3.33331 50C3.33331 43.8716 4.54038 37.8033 6.8856 32.1414C9.23082 26.4796 12.6683 21.3351 17.0017 17.0017C21.3351 12.6683 26.4796 9.23084 32.1414 6.88562C37.8033 4.5404 43.8716 3.33333 50 3.33333C62.3767 3.33333 74.2466 8.24998 82.9983 17.0017C91.75 25.7534 96.6666 37.6232 96.6666 50C96.6666 62.3768 91.75 74.2466 82.9983 82.9983C74.2466 91.75 62.3767 96.6667 50 96.6667Z"
                          stroke="currentColor"
                          strokeWidth="3" />
                      </svg>
                      <h3 className="py-5 text-xl text-green-500">
                        Message sent successfully
                      </h3>
                      <p className="text-gray-700 md:px-3">{message}</p>
                      <button
                        className="mt-6 text-gray-600 focus:outline-none"
                        onClick={() => reset()}>
                        Go back
                      </button>
                    </div>
                  )}

                  {isSubmitSuccessful && !isSuccess && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-white rounded-md">
                      <svg
                        width="60"
                        height="60"
                        viewBox="0 0 97 97"
                        className="text-red-400"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M27.9995 69C43.6205 53.379 52.3786 44.621 67.9995 29M26.8077 29L67.9995 69M48.2189 95C42.0906 95 36.0222 93.7929 30.3604 91.4477C24.6985 89.1025 19.554 85.6651 15.2206 81.3316C10.8872 76.9982 7.44975 71.8538 5.10454 66.1919C2.75932 60.53 1.55225 54.4617 1.55225 48.3333C1.55225 42.205 2.75932 36.1366 5.10454 30.4748C7.44975 24.8129 10.8872 19.6684 15.2206 15.335C19.554 11.0016 24.6985 7.56418 30.3604 5.21896C36.0222 2.87374 42.0906 1.66667 48.2189 1.66667C60.5957 1.66667 72.4655 6.58333 81.2172 15.335C89.9689 24.0867 94.8856 35.9566 94.8856 48.3333C94.8856 60.7101 89.9689 72.58 81.2172 81.3316C72.4655 90.0833 60.5957 95 48.2189 95Z"
                          stroke="CurrentColor"
                          strokeWidth="3" />
                      </svg>

                      <h3 className="text-xl text-red-400 py-7">
                        Oops, Something went wrong!
                      </h3>
                      <p className="text-gray-700 md:px-3">{message}</p>
                      <button
                        className="mt-6 text-gray-600 focus:outline-none"
                        onClick={() => reset()}>
                        Go back
                      </button>
                    </div>
                  )}
                </div>
              </DisclosurePanel>
            </Transition>
          </>
        )}
      </Disclosure>
    </div>
  );
}
