import Image from "next/image";
import { Container } from "@/components/Container";
import {
	AmazonLogo,
	VerizonLogo,
	MicrosoftLogo,
	NetflixLogo,
	SonyLogo
} from "@/components/Icons";

export const Partners = () => {
	return (
		<>
			<Container>
				<div className="flex flex-col justify-center">
					<div className="text-xl text-center text-gray-700 dark:text-white">
						Thank you to our partners and sponsors!
					</div>

					<div className="flex flex-wrap justify-center gap-5 mt-10 md:justify-around">
						<div className="pt-2 text-gray-400 dark:text-gray-400">
							<AmazonLogo />
						</div>
						<div className="text-gray-400 dark:text-gray-400">
							<VerizonLogo />
						</div>
						<div className="text-gray-400 dark:text-gray-400">
							<MicrosoftLogo />
						</div>
						<div className="pt-1 text-gray-400 dark:text-gray-400">
							<NetflixLogo />
						</div>
						<div className="pt-2 text-gray-400 dark:text-gray-400">
							<SonyLogo />
						</div>
					</div>
				</div>
			</Container>
		</>
	);
}
