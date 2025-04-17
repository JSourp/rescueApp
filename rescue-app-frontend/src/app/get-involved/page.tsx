'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import AdoptionForm from '@/components/AdoptionForm';
import FosterForm from '@/components/FosterForm';
import VolunteerForm from '@/components/VolunteerForm';
import PartnershipSponsorshipForm from '@/components/PartnershipSponsorshipForm';

export default function GetInvolvedPage() {
  const [showAdoptForm, setShowAdoptForm] = useState(false);
  const [showFosterForm, setShowFosterForm] = useState(false);
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [showPartnershipSponsorshipForm, setShowPartnershipSponsorshipForm] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">
        Get Involved
      </h1>
      <p className="text-lg text-center mb-12 text-gray-600 dark:text-gray-300">
        There are many ways to support Second Chance Animal Rescue & Sanctuary. Find the perfect fit for you!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
        {/* Adoption Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col max-w-xl">
          <h2 className="text-2xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Adopt a Friend</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4 flex-grow">
            Ready to open your heart and home? Adopting a rescued animal provides a second chance at a happy life. Browse our available animals and submit an application to start the process.
          </p>
          <button
            onClick={() => setShowAdoptForm(true)}
            className="bg-blue-500 hover:bg-blue-700 mt-auto w-full text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Apply to Adopt
          </button>
        </div>

        {/* Fostering Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col max-w-xl">
          <h2 className="text-2xl font-semibold mb-4 text-teal-600 dark:text-teal-400">Foster an Animal</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4 flex-grow">
            Foster homes provide temporary care for animals before they find their forever families. By fostering, you help us save more lives and provide animals with a loving home environment while they wait.
          </p>
          <button
            onClick={() => setShowFosterForm(true)}
            className="mt-auto w-full bg-teal-500 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Apply to Foster
          </button>
        </div>

        {/* Volunteering Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col max-w-xl">
          <h2 className="text-2xl font-semibold mb-4 text-orange-600 dark:text-orange-400">Volunteer Your Time</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4 flex-grow">
            Our volunteers are the backbone of our rescue! From dog walking and cat socializing to helping at events or with administrative tasks, your time makes a huge difference. Let us know how you&apos;d like to help.
          </p>
          <button
            onClick={() => setShowVolunteerForm(true)}
            className="mt-auto w-full bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Apply to Volunteer
          </button>
        </div>

        {/* Partner/Sponsor Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col max-w-xl">
          <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">Partner or Sponsor</h2>

          <p className="text-gray-700 dark:text-gray-300 mb-4 flex-grow">
            As a new rescue, community partnerships and sponsorships are vital. Support from local businesses and individuals helps us provide essential care, supplies, and facilities. Contact us to learn about opportunities.
          </p>
          <button
            onClick={() => setShowPartnershipSponsorshipForm(true)}
            className="mt-auto w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Inquire About Partnership/Sponsorship
          </button>
        </div>

        {/* Donations Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col justify-self-center md:col-span-2 max-w-xl">
          <h2 className="text-2xl font-semibold mb-4 text-green-600 dark:text-green-400">Make a Donation</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4 flex-grow">
            Your donations help us provide food, medical care, and shelter for rescued animals. Every dollar counts and goes directly to the care of our animals. Thank you for your support!
          </p>
          <button
            onClick={() => window.location.href = '/donate'}
            className="mt-auto w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Donate Now
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
