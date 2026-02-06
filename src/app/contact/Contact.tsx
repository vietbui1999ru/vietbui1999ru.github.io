"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Linkedin } from "lucide-react";
import { CONTACT_CONTENT, CONTACT_BTN_NAME, CONTACT_BTN_LINK } from "./contactData";

const LINKEDIN_URL = "https://linkedin.com/in/vietbui99";

const Contact = () => {
	return (
		<section id="contact" className="relative min-h-screen w-full">
			<div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
				<SectionHeading
					title="Contact"
					subtitle={CONTACT_CONTENT}
					className="mb-12"
				/>

				<Card className="mx-auto max-w-lg overflow-hidden">
					<CardContent className="flex flex-col items-center gap-6 py-10">
						<div className="flex gap-4">
							<Button size="lg" asChild>
								<a
									href={CONTACT_BTN_LINK}
									className="inline-flex items-center gap-2"
								>
									<Mail className="size-5" />
									{CONTACT_BTN_NAME}
								</a>
							</Button>
							<Button variant="outline" size="lg" asChild>
								<a
									href={LINKEDIN_URL}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2"
								>
									<Linkedin className="size-5" />
									LinkedIn
								</a>
							</Button>
						</div>
						<p className="text-sm text-muted-foreground text-center max-w-sm">
							{CONTACT_CONTENT}
						</p>
					</CardContent>
				</Card>
			</div>
		</section>
	);
};

export default Contact;
