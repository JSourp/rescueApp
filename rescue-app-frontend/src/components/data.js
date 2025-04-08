import {
  FaceSmileIcon,
  ChartBarSquareIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  AdjustmentsHorizontalIcon,
  SunIcon,
  ArrowRightCircleIcon,
  ArrowRightEndOnRectangleIcon,
  ArrowRightIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/solid";

import spotlightOneImg from "../../public/img/spotlight-one.png";
import spotlightTwoImg from "../../public/img/spotlight-two.png";

const spotlightOne = {
  title: "Meet Whiskers",
  desc: "Whiskers is a playful and affectionate Domestic Shorthair cat. She loves to cuddle and is always purring. She'd make a wonderful companion for a quiet home.",
  image: spotlightOneImg,
  bullets: [
    {
      title: "Age:",
      desc: "1 year",
      icon: <ArrowRightCircleIcon />,
    },
    {
      title: "Gender:",
      desc: "Female",
      icon: <ArrowRightEndOnRectangleIcon />,
    },
    {
      title: "Breed:",
      desc: "Domestic Shorthair",
      icon: <ArrowRightIcon />,
    },
    {
      title: "Adoption Status:",
      desc: "Available",
      icon: <ArrowRightStartOnRectangleIcon />,
    },
  ],
};

const spotlightTwo = {
  title: "Meet Pippin",
  desc: "Pippin is a charming and playful Jack Russell Terrier mix. Despite his small size, he has a big personality! He's always ready for a game of fetch or a cuddle on your lap. Pippin is looking for an active and loving home where he can be the center of attention.",
  image: spotlightTwoImg,
  bullets: [
    {
      title: "Age:",
      desc: "3 years",
      icon: <ArrowRightCircleIcon />,
    },
    {
      title: "Gender:",
      desc: "Male",
      icon: <ArrowRightEndOnRectangleIcon />,
    },
    {
      title: "Good with:",
      desc: "Adults, Experienced Dog Owners",
      icon: <ArrowRightIcon />,
    },
    {
      title: "Adoption Status:",
      desc: "Available",
      icon: <ArrowRightStartOnRectangleIcon />,
    },
  ],
};

export {spotlightOne, spotlightTwo};
