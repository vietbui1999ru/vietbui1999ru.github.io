"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { Mail, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTACT_CONTENT,
  CONTACT_BTN_NAME,
  CONTACT_BTN_LINK,
} from "@/data/contactData";
import { buttonVariants } from "@/components/ui/button";
import {
  Modal,
  ModalTrigger,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "@/components/ui/AnimatedModal";

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

        <Modal>
          <div className="flex justify-center">
            <ModalTrigger
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "inline-flex items-center gap-2"
              )}
            >
              <Mail className="size-5" />
              Contact Me
            </ModalTrigger>
          </div>
          <ModalBody>
            <ModalContent className="flex flex-col items-center gap-6">
              <h3 className="text-xl font-semibold">Get in touch</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {CONTACT_CONTENT}
              </p>
              <div className="flex gap-4">
                <a
                  href={CONTACT_BTN_LINK}
                  className={cn(
                    buttonVariants({ variant: "default", size: "lg" }),
                    "inline-flex items-center gap-2"
                  )}
                >
                  <Mail className="size-5" />
                  {CONTACT_BTN_NAME}
                </a>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "inline-flex items-center gap-2"
                  )}
                >
                  <Linkedin className="size-5" />
                  LinkedIn
                </a>
              </div>
            </ModalContent>
          </ModalBody>
        </Modal>
      </div>
    </section>
  );
};

export default Contact;
