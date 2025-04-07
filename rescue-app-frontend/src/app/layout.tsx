import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Second Chance Animal Rescue and Sanctuary',
  description: 'Helping animals find loving homes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="bg-gray-50">
        <header className="bg-white shadow-md py-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-800">
              Second Chance
            </Link>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <Link href="/about-us" className="text-gray-700 hover:text-gray-900">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/available-animals" className="text-gray-700 hover:text-gray-900">
                    Available Animals
                  </Link>
                </li>
                <li>
                  <Link href="/get-involved" className="text-gray-700 hover:text-gray-900">
                    Get Involved
                  </Link>
                </li>
                <li>
                  <Link href="/donating" className="text-gray-700 hover:text-gray-900">
                    Donate
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="container mx-auto py-8">{children}</main>
        <footer className="bg-gray-800 text-white py-4 mt-8">
          <div className="container mx-auto text-center">
            <p>&copy; {new Date().getFullYear()} Second Chance Animal Rescue and Sanctuary</p>
          </div>
        </footer>
      </body>
    </html>
  );
}