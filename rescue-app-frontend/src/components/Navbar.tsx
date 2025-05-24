'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeChanger from "./DarkSwitch";
import { useUser } from '@auth0/nextjs-auth0/client';
import { getAuth0AccessToken } from '@/utils/auth';
import { UserProfile } from '@/types/userProfile';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { HeartIcon } from "@/components/Icons";

interface DropdownMenuItem {
  name: string;
  href: string;
  allowedRoles: string[];
}

const allDropdownMenuItems: DropdownMenuItem[] = [
  { name: "Manage Animals", href: "/admin/manage-animals", allowedRoles: ["Admin", "Staff", "Volunteer", "Foster"] },
  { name: "Fosters List", href: "/admin/fosters", allowedRoles: ["Admin", "Staff"] },
  { name: "Foster Applications", href: "/admin/foster-applications", allowedRoles: ["Admin", "Staff"] },
  { name: "Volunteer Applications", href: "/admin/volunteer-applications", allowedRoles: ["Admin", "Staff"] },
  { name: "My Profile", href: "/profile", allowedRoles: ["Admin", "Staff", "Volunteer", "Foster", "Guest"] },
];

export function Navbar() {
  const { user, error: authError, isLoading: isAuthLoading } = useUser();
  const [userRole, setUserRole] = useState<string>("Guest"); // Default to Guest
  const [isLoadingRole, setIsLoadingRole] = useState<boolean>(true); // For profile fetching state

  const navigation = [
    { name: "Available Animals", href: "/available-animals" },
    { name: "Get Involved", href: "/get-involved" },
    { name: "About Us", href: "/about-us" },
  ];

  useEffect(() => {
    const determineUserRole = async () => {
      if (isAuthLoading) {
        setIsLoadingRole(true); // Still loading Auth0 user
        return;
      }

      if (authError) {
        console.error("Auth0 error:", authError);
        setUserRole("Guest");
        setIsLoadingRole(false);
        return;
      }

      if (user) { // Auth0 user object exists
        setIsLoadingRole(true);
        const accessToken = await getAuth0AccessToken();
        if (accessToken) {
          const profile = await fetchCurrentUserProfileClientSide(accessToken);
          if (profile && profile.role) {
            console.log("Navbar: User profile fetched, role:", profile.role);
            setUserRole(profile.role);
          } else {
            console.warn("Navbar: User profile fetched but no role found, or profile fetch failed. Defaulting to Guest for logged-in user.");
            setUserRole("Guest"); // Default for logged-in user if role can't be determined from DB
          }
        } else {
          console.warn("Navbar: Auth0 user exists but could not get access token. Defaulting to Guest.");
          setUserRole("Guest"); // Cannot fetch profile without token
        }
        setIsLoadingRole(false);
      } else { // No Auth0 user, not loading Auth0
        setUserRole("Guest");
        setIsLoadingRole(false);
      }
    };

    determineUserRole();
  }, [user, isAuthLoading, authError]);

  const getVisibleDropdownItems = () => {
    if (!user) return []; // No items if the user is not logged in
    if (isLoadingRole) return []; // Return an empty array while the role is loading

    return allDropdownMenuItems.filter(item => item.allowedRoles.includes(userRole));
  };

  const visibleDropdownItems = getVisibleDropdownItems();

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
            priority />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden text-center lg:flex lg:items-center space-x-4 ml-4">
          <ul className="items-center justify-end flex-1 pt-6 list-none lg:pt-0 lg:flex">
            {navigation.map((item, index) => (
              <li className="mr-3 nav__item" key={index}>
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow px-5 py-2">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Side Buttons: Donate and Login/Logout */}
        <div className="hidden lg:flex flex-col lg:flex-row items-center lg:space-x-4 ml-4">
          {/* Donate Button */}
          <Link
            href="/donate"
            className="px-5 py-2 rounded-md shadow text-text-on-accent bg-accent hover:scale-105 transition-transform duration-300 mb-2 lg:mb-0">
            <span className="flex items-center space-x-2">
              <HeartIcon />
              <span>Donate</span>
            </span>
          </Link>

          {/* Login / Logout Section */}
          <div className="relative text-sm text-gray-700 dark:text-gray-300">
            {isAuthLoading && (
              <span className="px-3 py-1">Loading...</span>
            )}
            {authError && (
              <span className="px-3 py-1 text-red-500">Error</span>
            )}
            {!isAuthLoading && !authError && !user && (
              <Link
                href="/api/auth/login"
                className="px-3 py-1 text-gray-700 dark:text-gray-300 hover:text-text-link transition duration-300">
                Login
              </Link>
            )}
            {!isAuthLoading && !authError && user && (
              <div className="relative group">
                {/* User Avatar and Name */}
                <button className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md shadow-md hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-300">
                  {/* Could add a user image, not needed currently
                  {user.picture && (
                    <Image
                      src={user.picture}
                      alt={user.name || user.email || 'User'}
                      width={32}
                      height={32}
                      className="w-6 h-6 rounded-full"/>
                  )}
                  */}
                  <span>{user.name || user.nickname || user.email}</span>
                  <svg
                    className="w-4 h-4 text-gray-500 dark:text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {visibleDropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {item.name}
                    </Link>
                  ))}
                  <a href="/api/auth/logout"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md">
                    Logout
                  </a>
                </div>
              </div>
            )}
          </div>

          <ThemeChanger />
        </div>


        {/* Mobile Menu Toggle */}
        <div className="lg:hidden">
          <Disclosure>
            {({ open }) => (
              <>
                {/* Mobile Menu Toggle Button */}
                <DisclosureButton className="lg:hidden flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <svg
                      className="block h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg
                      className="block h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                        aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                          d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  )}
                </DisclosureButton>

                {/* Mobile Menu Panel */}
                <DisclosurePanel className="lg:hidden border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-1 px-2 pt-2 pb-3">
                    {navigation.map((item) => (
                      <DisclosureButton
                        key={item.name}
                        as={Link}
                        href={item.href}
                        className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow block px-3 py-2 text-center text-base font-medium">
                        {item.name}
                      </DisclosureButton>
                    ))}
                  </div>{/* Actions in Mobile Menu */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 pb-3 px-4 space-y-3">
                    {/* Donate Button */}
                    <DisclosureButton
                      as={Link}
                      href="/donate"
                      className="block w-full text-center px-5 py-2 text-text-on-accent bg-accent rounded-md shadow hover:scale-105 transition-transform duration-300 text-base font-medium">
                      Donate
                    </DisclosureButton>

                    {/* User Actions */}
                    {!isAuthLoading || isLoadingRole && !authError && user && (
                      <>
                        {visibleDropdownItems.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            {item.name}
                          </Link>
                        ))}
                        <a href="/api/auth/logout"
                          className="block w-full text-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 dark:hover:text-red-400">
                          Logout
                        </a>
                      </>
                    )}

                    {/* Login Button (if not logged in) */}
                    {!isAuthLoading && !authError && !user && (
                      <DisclosureButton
                        as={Link}
                        href="/api/auth/login"
                        className="block w-full text-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-500 dark:hover:text-gray-400">
                        Login
                      </DisclosureButton>
                    )}
                  </div>
                </DisclosurePanel>
              </>
            )}
          </Disclosure>
        </div>
      </nav>
    </div>
  );
}

// Helper function to fetch user profile from backend
async function fetchCurrentUserProfileClientSide(accessToken: string): Promise<UserProfile | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    console.error("Navbar: API_BASE_URL not configured for profile fetch.");
    return null;
  }
  const url = `${apiBaseUrl}/users/me`;

  try {
    console.log(`Navbar: Attempting to fetch user profile from ${url}`);
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store', // Ensure fresh profile data
    });
    if (!response.ok) {
      console.error(`Navbar: API Error fetching user profile: ${response.status} ${response.statusText}`);
      return null;
    }
    const profile = await response.json();
    return profile as UserProfile;
  } catch (error) {
    console.error("Navbar: Error in fetchCurrentUserProfileClientSide:", error);
    return null;
  }
}
