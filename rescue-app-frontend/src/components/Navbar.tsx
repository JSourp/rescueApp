// src/components/Navbar.tsx (or wherever your Navbar component lives)

'use client'; // IMPORTANT: Add this directive because we use hooks (useUser)

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeChanger from "./DarkSwitch";
import { useUser } from '@auth0/nextjs-auth0/client';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';

export function Navbar() {
  // Get user authentication state from Auth0 hook
  const { user, error, isLoading } = useUser();

  const navigation = [
    { name: "Available Animals", href: "/available-animals" },
    { name: "Get Involved", href: "/get-involved" },
    { name: "About Us", href: "/about-us" },
  ];

  return (
    <div className="w-full">
      <nav className="container relative flex flex-wrap items-center justify-between p-8 mx-auto lg:justify-between xl:px-0">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/img/SCARS_Logo.png"
            alt="Second Chance Animal Rescue & Sanctuary"
            width={250} // Keep intrinsic
            height={250}
            className="w-52 h-auto"
            priority
          />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden text-center lg:flex lg:items-center space-x-4 ml-4">
          <ul className="items-center justify-end flex-1 pt-6 list-none lg:pt-0 lg:flex">
            {navigation.map((item, index) => (
              <li className="mr-3 nav__item" key={index}>
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-5 py-2 text-white bg-indigo-500 dark:bg-indigo-600 rounded-md shadow hover:bg-indigo-700 dark:hover:bg-indigo-700 transition duration-300"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Side Buttons: Donate and Login/Logout */}
        <div className="flex flex-col lg:flex-row items-center lg:space-x-4 ml-4">
          {/* Donate Button */}
          <Link
            href="/donate"
            className="px-5 py-2 text-white bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-md shadow hover:scale-105 transition-transform duration-300 mb-2 lg:mb-0"
          >
            <span className="flex items-center space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
              <span>Donate</span>
            </span>
          </Link>

          {/* Login / Logout Section */}
          <div className="relative text-sm text-gray-700 dark:text-gray-300">
            {isLoading && (
              <span className="px-3 py-1">Loading...</span>
            )}
            {error && (
              <span className="px-3 py-1 text-red-500">Error</span>
            )}
            {!isLoading && !error && !user && (
              <Link
                href="/api/auth/login"
                className="px-3 py-1 text-gray-700 dark:text-gray-300 hover:text-indigo-500 transition duration-300"
              >
                Login
              </Link>
            )}
            {!isLoading && !error && user && (
              <div className="relative group">
                {/* User Avatar and Name */}
                <button className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md shadow-md hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-300">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name || user.email || 'User'}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span>{user.name || user.nickname || user.email}</span>
                  <svg
                    className="w-4 h-4 text-gray-500 dark:text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/api/auth/logout"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md"
                  >
                    Logout
                  </Link>
                </div>
              </div>
            )}
          </div>

          <ThemeChanger />
        </div>


        {/* Mobile Menu Toggle (coming soon) */}

      </nav>
    </div>
  );
}
