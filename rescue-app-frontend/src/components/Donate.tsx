import React, { useState, useEffect } from 'react';
import { Container } from "@/components/Container";
import Link from "next/link";

export const Donate = () => {
  return (
    <Container>
      <div className="flex flex-wrap items-center justify-between w-full max-w-4xl gap-5 mx-auto text-white bg-secondary px-7 py-7 lg:px-12 lg:py-12 lg:flex-nowrap rounded-xl">
        <div className="flex-grow text-center lg:text-left">
          <h2 className="text-2xl font-medium lg:text-3xl">
            Small Efforts Make Big Change
          </h2>
        </div>
        <div className="flex-shrink-0 w-full text-center lg:w-auto">
          <Link href="/donate" className="inline-block py-3 mx-auto text-lg font-medium text-center text-text-heading bg-white hover:bg-gray-100 rounded-md px-7 lg:px-10 lg:py-5">
            Donate Today
          </Link>
        </div>
      </div>
    </Container>
  );
};
