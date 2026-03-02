"use client";

import { AppleHelloContactEffect } from "@/components/ui/apple-hello-effect";
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
      <div className="section-content">
        <header className="mb-12 space-y-4 text-center">
          <AppleHelloContactEffect
            className="mx-auto"
            svgClassName="mx-auto h-24 w-auto text-foreground"
          />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            {CONTACT_CONTENT}
          </p>
        </header>

        <Modal>
          <div className="flex justify-center">
            <ModalTrigger
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "inline-flex items-center gap-2",
              )}
            >
              <Mail className="size-5" />
              Contact Me
            </ModalTrigger>
          </div>
          <ModalBody>
            <ModalContent className="flex flex-col items-center gap-6">
              <h3 className="text-xl font-semibold">Get in touch</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {CONTACT_CONTENT}
              </p>
              <div className="flex gap-4">
                <a
                  href={CONTACT_BTN_LINK}
                  className={cn(
                    buttonVariants({ variant: "default", size: "lg" }),
                    "inline-flex items-center gap-2",
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
                    "inline-flex items-center gap-2",
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
