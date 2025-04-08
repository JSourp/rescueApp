"use client";
import React from "react";
import { Container } from "@/components/Container";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/24/solid";

export const Faq = () => {
  return (
    <Container className="!p-0">
      <div className="w-full max-w-2xl p-2 mx-auto rounded-2xl">
        {faqdata.map((item, index) => (
          <div key={item.question} className="mb-5">
            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex items-center justify-between w-full px-4 py-4 text-lg text-left text-gray-800 rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus-visible:ring focus-visible:ring-indigo-100 focus-visible:ring-opacity-75 dark:bg-trueGray-800 dark:text-gray-200">
                    <span>{item.question}</span>
                    <ChevronUpIcon
                      className={`${
                        open ? "transform rotate-180" : ""
                      } w-5 h-5 text-indigo-500`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pt-4 pb-2 text-gray-500 dark:text-gray-300">
                    {item.answer}
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          </div>
        ))}
      </div>
    </Container>
  );
}

const faqdata = [
  {
    question: "What is your adoption process?",
    answer: "Our adoption process involves filling out an application, a brief interview, and a meet-and-greet to ensure a good match. While we don't have a set adoption fee, we encourage donations to help cover the costs of caring for our animals.",
  },
  {
    question: "How can I support your work?",
    answer: "Your support is crucial! You can help by making a donation, volunteering your time, fostering an animal, or spreading the word about our rescue. Every contribution makes a difference.",
  },
  {
    question: "What do donations go towards?",
    answer: "Donations help us provide food, shelter, medical care, and enrichment for the animals in our care. They also support our efforts to rescue animals from urgent situations and find them loving forever homes.",
  },
  {
    question: "What items do you currently need?",
    answer: "We greatly appreciate donations of items like unopened food, clean blankets, toys, and cleaning supplies. Please check our website or contact us to see our current wish list.",
  },
];
