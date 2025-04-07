import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
    title: 'Second Chance Animal Rescue and Sanctuary',
    description: 'Helping animals find loving homes',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <nav>
                    <ul>
                        <li>
                            <Link href="/about-us">About Us</Link>
                        </li>
                        <li>
                            <Link href="/available-animals">Available Animals</Link>
                        </li>
                        <li>
                            <Link href="/get-involved">Get Involved</Link>
                        </li>
                        <li>
                            <Link href="/donating">Donate</Link>
                        </li>
                    </ul>
                </nav>
                <main>{children}</main>
            </body>
        </html>
    );
}