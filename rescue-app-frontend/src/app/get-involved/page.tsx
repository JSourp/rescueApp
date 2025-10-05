'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import AdoptionForm from '@/components/AdoptionForm';
import FosterForm from '@/components/FosterForm';
import VolunteerForm from '@/components/VolunteerForm';
import PartnershipSponsorshipForm from '@/components/PartnershipSponsorshipForm';
import { GiftIcon, HeartIcon } from "@/components/Icons";


export default function GetInvolvedPage() {
  const [showAdoptForm, setShowAdoptForm] = useState(false);
  const [showFosterForm, setShowFosterForm] = useState(false);
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [showPartnershipSponsorshipForm, setShowPartnershipSponsorshipForm] = useState(false);
  const amazonWishlistUrl = "https://a.co/9oxHMUy";

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">
        Get Involved
      </h1>
      <p className="text-lg text-center mb-12 text-gray-600 dark:text-gray-300">
        There are many ways to support Second Chance Animal Rescue & Sanctuary. Find the perfect fit for you!
      </p>

      {/*
      This layout follows the "Pyramid of Engagement"
      For a rescue, the pyramid looks like this:
        Provide a Home: Adopt, Foster
        Provide Financial Support: Donate, Wishlist
        Provide Time/Skills: Volunteer, Partner
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Adoption Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col border border-gray-300 dark:border-transparent">
          <h2 className="text-text-base dark:text-text-light text-2xl font-semibold mb-4">
            Adopt a Friend
          </h2>
          <p className="text-text-base dark:text-text-light mb-4 flex-grow">
            Ready to open your heart and home? Adopting a rescued animal provides a second chance at a happy life. Browse our available animals and submit an application to start the process.
          </p>
          <button
            onClick={() => setShowAdoptForm(true)}
            className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow mt-auto w-full py-2 px-4">
            Apply to Adopt
          </button>
        </div>

        {/* Fostering Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col border border-gray-300 dark:border-transparent">
          <h2 className="text-text-base dark:text-text-light text-2xl font-semibold mb-4">
            Foster an Animal
          </h2>
          <p className="text-text-base dark:text-text-light mb-4 flex-grow">
            Foster homes provide temporary care for animals before they find their forever families. By fostering, you help us save more lives and provide animals with a loving home environment while they wait.
          </p>
          <button
            onClick={() => setShowFosterForm(true)}
            className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow mt-auto w-full py-2 px-4">
            Apply to Foster
          </button>
        </div>

        {/* --- Foster-to-Adopt (full-width) --- */}
        <div className="md:col-span-2 p-8 bg-secondary-50 dark:bg-gray-700 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-500">
          <h2 className="text-3xl font-semibold mb-4 text-center text-secondary-800 dark:text-secondary-100">
            Foster-to-Adopt: The Best of Both Worlds
          </h2>
          <div className="max-w-3xl mx-auto text-gray-700 dark:text-gray-300 space-y-4">
            <p className="text-center">
              Not quite ready to make a lifelong commitment, but smitten with one of our animals? Our Foster-to-Adopt program is designed for you. It allows you and the animal to get to know each other in a real-world home environment before finalizing the adoption, ensuring it&apos;s a perfect match for everyone.
            </p>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center text-secondary-800 dark:text-secondary-200">How It Works:</h3>
              <ol className="list-decimal list-inside space-y-2 text-left">
                <li><strong>Apply to Foster:</strong> You begin by filling out our standard Foster Application.</li>
                <li><strong>Trial Period:</strong> You&apos;ll foster the animal for a set period (typically 2-3 weeks), and we&apos;ll provide all the supplies.</li>
                <li><strong>Finalize the Adoption:</strong> If you&apos;ve fallen in love, we&apos;ll complete the official adoption. If not, the animal returns to our care, no hard feelings.</li>
              </ol>
            </div>
            <p className="text-center pt-4 font-semibold">
              Interested? The process starts with our Foster Application. Just make a note in the application that you&apos;re interested in the &quot;Foster-to-Adopt&quot; program!
            </p>
          </div>
        </div>

        {/* Donations Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col border border-gray-300 dark:border-transparent">
          <h2 className="text-text-base dark:text-text-light text-2xl font-semibold mb-4 flex items-center">
            <HeartIcon className="w-6 h-6 mr-2 text-secondary" />
            Make a Donation
          </h2>
          <p className="text-text-base dark:text-text-light mb-4 flex-grow">
            Your donations help us provide food, medical care, and shelter for rescued animals. Every dollar counts and goes directly to the care of our animals. Thank you for your support!
          </p>
          <button
            onClick={() => window.location.href = '/donate'}
            className="text-text-on-accent bg-accent hover:bg-accent-700 transition duration-300 rounded-md shadow mt-auto w-full py-2 px-4">
            Donate Now
          </button>
        </div>

        {/* Amazon Wishlist Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col border border-gray-300 dark:border-transparent">
          <h2 className="text-text-base dark:text-text-light text-2xl font-semibold mb-4 flex items-center">
            <GiftIcon className="w-6 h-6 mr-2 text-secondary" />
            Our Amazon Wishlist
          </h2>
          <p className="text-text-base dark:text-text-light mb-4 flex-grow">
            Help us provide essential supplies for our animals by purchasing items from our Amazon Wishlist. Items are shipped directly to us!
          </p>
          <a
            href={amazonWishlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-on-secondary bg-secondary hover:bg-secondary-700 transition duration-300 rounded-md shadow mt-auto w-full py-2 px-4 text-center">
            View Amazon Wishlist
          </a>
        </div>

        {/* Volunteer Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col border border-gray-300 dark:border-transparent">
          <h2 className="text-text-base dark:text-text-light text-2xl font-semibold mb-4">
            Volunteer Opportunities
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 flex-grow">
            As a new, foster-based rescue, our most critical need is for dedicated foster homes. At this time, we are not accepting applications for on-site or event volunteers. Once we are closer to securing a physical location, we will open up applications for a wide range of volunteer roles. Thank you for your understanding and your interest in helping us grow!
          </p>
        </div>

        {/* Volunteering Section -- Once we are ready to start accepting applications
            This is for verbiage only. Styling should default to existing version above. */}
        {/* <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col border border-gray-300 dark:border-transparent">
          <h2 className="text-text-base dark:text-text-light text-2xl font-semibold mb-4">
            Volunteer Your Time
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4 flex-grow">
            Our volunteers are the backbone of our rescue! From dog walking and cat socializing to helping at events or with administrative tasks, your time makes a huge difference. Let us know how you&apos;d like to help.
          </p>
          <button
            onClick={() => setShowVolunteerForm(true)}
            className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow mt-auto w-full py-2 px-4">
            Apply to Volunteer
          </button>
        </div> */}

        {/* Partner/Sponsor Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col border border-gray-300 dark:border-transparent">
          <h2 className="text-text-base dark:text-text-light text-2xl font-semibold mb-4">
            Partner or Sponsor
          </h2>
          <p className="text-text-base dark:text-text-light mb-4 flex-grow">
            As a new rescue, community partnerships and sponsorships are vital. Support from local businesses and individuals helps us provide essential care, supplies, and facilities. Contact us to learn about opportunities.
          </p>
          <button
            onClick={() => setShowPartnershipSponsorshipForm(true)}
            className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow mt-auto w-full py-2 px-4">
            Inquire About Partnership/Sponsorship
          </button>
        </div>

      </div>

      {/* --- Modals for Forms --- */}
      {showAdoptForm && (
        <Modal onClose={() => setShowAdoptForm(false)}>
          <AdoptionForm onClose={() => setShowAdoptForm(false)} />
        </Modal>
      )}

      {showFosterForm && (
        <Modal onClose={() => setShowFosterForm(false)}>
          <FosterForm onClose={() => setShowFosterForm(false)} />
        </Modal>
      )}

      {showVolunteerForm && (
        <Modal onClose={() => setShowVolunteerForm(false)}>
          <VolunteerForm onClose={() => setShowVolunteerForm(false)} />
        </Modal>
      )}

      {showPartnershipSponsorshipForm && (
        <Modal onClose={() => setShowPartnershipSponsorshipForm(false)}>
          <PartnershipSponsorshipForm onClose={() => setShowPartnershipSponsorshipForm(false)} />
        </Modal>
      )}

    </div>
  );
}
