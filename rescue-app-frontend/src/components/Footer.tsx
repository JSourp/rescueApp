import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { Container } from "@/components/Container";
import {
  GiftIcon,
  HeartIcon,
  GraduationCapIcon,
  InformationCircleIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  Twitter,
  Facebook,
  Instagram
} from "@/components/Icons";

export function Footer() {
  const amazonWishlistUrl = "https://www.amazon.com/hz/wishlist/ls/197NWZ1O3D2O9?ref_=wl_share";

  return (
    <div className="relative">
      <Container>
        <div className="grid max-w-screen-xl grid-cols-1 gap-10 pt-10 mx-auto mt-5 border-t border-gray-100 dark:border-trueGray-700 lg:grid-cols-5">

          {/* Column 1-2: Description */}
          <div className="lg:col-span-2">
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
              Second Chance Animal Rescue & Sanctuary is a non-profit animal
              rescue organization dedicated to saving and rehabilitating animals
              in need.
            </p>
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
              We are committed to providing a safe haven for animals and finding
              them loving forever homes.
            </p>
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
              Registered 501(c)(3) EIN: 12-3456789
            </p>
          </div>

          {/* --- Column 2: Learn More / Navigation Links --- */}
          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-3">Learn More</div>
            <div className="flex flex-col items-start space-y-1">
              <Link href="/about-us" className="flex items-center space-x-2 p-1 text-gray-500 rounded-md dark:text-gray-300 hover:text-text-link focus:text-text-link focus:outline-none">
                <InformationCircleIcon />
                <span>About Us</span>
              </Link>
              <Link href="/get-involved" className="flex items-center space-x-2 p-1 text-gray-500 rounded-md dark:text-gray-300 hover:text-text-link focus:text-text-link focus:outline-none">
                <UserGroupIcon />
                <span>Get Involved</span>
              </Link>
              <Link href="/graduates" className="flex items-center space-x-2 p-1 text-gray-500 rounded-md dark:text-gray-300 hover:text-text-link focus:text-text-link focus:outline-none">
                <GraduationCapIcon />
                <span>Our Graduates</span>
              </Link>
              {/* <Link href="/color-palette-dev" className="flex items-center space-x-2 p-1 text-gray-500 rounded-md dark:text-gray-300 hover:text-text-link focus:text-text-link focus:outline-none">
                <span>Color Palette</span>
              </Link>*/}
              {/* Add FAQ when needed
              <Link href="/faq" className="flex items-center space-x-2 p-1 text-gray-500 rounded-md dark:text-gray-300 hover:text-text-link focus:text-text-link focus:outline-none">
                <QuestionMarkCircleIcon />
                <span>FAQ</span>
              </Link>*/}
            </div>
          </div>

          {/* Column 3: Support Us */}
          <div>
            <div>Support Us</div>
            <div className="flex mt-5 flex-col items-start space-y-1">
              <a
                href={amazonWishlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 p-1 text-gray-500 rounded-md dark:text-gray-300 hover:text-text-link focus:text-text-link focus:outline-none">
                <GiftIcon />
                <span>Amazon Wishlist</span>
              </a>
              <Link href="/donate" className="flex items-center space-x-2 p-1 text-gray-500 rounded-md dark:text-gray-300 hover:text-text-link focus:text-text-link focus:outline-none">
                <HeartIcon />
                <span>Donate Funds</span>
              </Link>
            </div>
          </div>

          {/* Column 4: Follow us */}
          <div className="">
            <div>Follow us</div>
            <div className="flex mt-5 space-x-5 text-gray-400 dark:text-gray-500">
              <a
                href="https://instagram.com/"
                target="_blank"
                rel="noopener"
              >
                <span className="sr-only">Instagram</span>
                <Instagram />
              </a>
              <a
                href="https://facebook.com/"
                target="_blank"
                rel="noopener"
              >
                <span className="sr-only">Facebook</span>
                <Facebook />
              </a>
              {/* <a
                href="https://x.com/"
                target="_blank"
                rel="noopener"
              >
                <span className="sr-only">X</span>
                <Twitter />
              </a> */}
            </div>
          </div>
        </div>

        <div className="my-10 text-sm text-center text-gray-600 dark:text-gray-400">
          {new Date().getFullYear()} © Second Chance Animal Rescue & Sanctuary.
        </div>
      </Container>
    </div>
  );
}
