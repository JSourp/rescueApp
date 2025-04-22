'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/Container';

// Use the same button style defined in Navbar for consistency (or import from shared location)
const loginButtonClasses = "bg-sc-asparagus-500 hover:bg-sc-asparagus-600 dark:bg-sc-asparagus-600 dark:hover:bg-sc-asparagus-700 px-6 py-3 text-white rounded-md shadow transition duration-300 font-medium text-lg";


export default function AdminLoginPage() {

	return (
		<Container className="flex flex-col items-center justify-center min-h-[60vh] text-center py-12">
			<h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">Staff & Volunteer Login</h1>
			<p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
				This login is for authorized Second Chance personnel only. Please use the button below to access the portal.
			</p>
			<a
				href="/api/auth/login"
				className={loginButtonClasses}
			>
				Login
			</a>
			{/* Could add contact info here if someone lands here by mistake */}
		</Container>
	);
}
