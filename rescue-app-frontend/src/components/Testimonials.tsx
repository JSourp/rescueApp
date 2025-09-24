import Image from "next/image";
import React, { useState, useEffect } from 'react';
import { Container } from "@/components/Container";
import userOneImg from "../../public/img/user1.jpg";
import userTwoImg from "../../public/img/user2.jpg";
import userThreeImg from "../../public/img/user3.jpg";

export const Testimonials = () => {
  return (
    <Container>
      <div className="grid gap-10 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-2 xl:col-auto">
          <div className="flex flex-col justify-between w-full h-full bg-gray-100 px-14 rounded-2xl py-14 dark:bg-trueGray-800">
            <p className="text-2xl leading-normal ">
              Adopting Leo from Second Chance was one of the <Mark>best decisions</Mark> I&apos;ve ever made.
              He&apos;s brought so much joy and laughter into our home.
              The staff were incredibly helpful and supportive throughout the entire process.
            </p>

            <Avatar
              image={userOneImg}
              name="Sarah Miller"
              location="Tucson, AZ"
            />
          </div>
        </div>
        <div className="">
          <div className="flex flex-col justify-between w-full h-full bg-gray-100 px-14 rounded-2xl py-14 dark:bg-trueGray-800">
            <p className="text-2xl leading-normal ">
              Volunteering at Second Chance has been <Mark>incredibly rewarding</Mark>.
              It&apos;s a great way to give back to the community and make a real difference in the lives of animals.
              I&apos;ve learned so much and met some amazing people.
            </p>

            <Avatar
              image={userTwoImg}
              name="David Chen"
              location="Phoenix, AZ"
            />
          </div>
        </div>
        <div className="">
          <div className="flex flex-col justify-between w-full h-full bg-gray-100 px-14 rounded-2xl py-14 dark:bg-trueGray-800">
            <p className="text-2xl leading-normal ">
              I donate to Second Chance because I know that my contributions are used wisely.
              Knowing that my support helps provide medical care and find <Mark>loving homes</Mark> for these animals means a lot to me.
            </p>

            <Avatar
              image={userThreeImg}
              name="Gabrielle Rodriguez"
              location="Flagstaff, AZ"
            />
          </div>
        </div>
      </div>
    </Container>
  );
};

interface AvatarProps {
  image: any;
  name: string;
  location: string;
}

function Avatar(props: Readonly<AvatarProps>) {
  return (
    <div className="flex items-center mt-8 space-x-3">
      <div className="flex-shrink-0 overflow-hidden rounded-full w-14 h-14">
        <Image
          src={props.image}
          width="40"
          height="40"
          alt="Avatar"
          placeholder="blur"
        />
      </div>
      <div>
        <div className="text-lg font-medium">{props.name}</div>
        <div className="text-gray-600 dark:text-gray-400">{props.location}</div>
      </div>
    </div>
  );
}

function Mark(props: { readonly children: React.ReactNode }) {
  return (
    <>
      {" "}
      <mark className="text-gray-800 bg-gray-100 rounded-md ring-gray-100 ring-4 dark:ring-gray-900 dark:bg-gray-900 dark:text-gray-200">
        {props.children}
      </mark>{" "}
    </>
  );
}
