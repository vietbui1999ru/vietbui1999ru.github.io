"use client";

import { useEffect, useRef, useState } from "react";
import { AppleHelloContactEffect } from "@/components/ui/apple-hello-effect";
import { Check, Copy, Linkedin, Mail } from "lucide-react";
import { SiDiscord } from "@icons-pack/react-simple-icons";
import { cn } from "@/lib/utils";
import { CONTACT_CONTENT, CONTACT_BTN_LINK } from "@/data/contactData";
import { buttonVariants } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Modal,
  ModalTrigger,
  ModalBody,
  ModalContent,
} from "@/components/ui/AnimatedModal";

const LINKEDIN_URL = "https://linkedin.com/in/vietbui99";
const DISCORD_URL = "https://discord.com/users/463366284940410910";

const Contact = () => {
  const email = CONTACT_BTN_LINK.replace(/^mailto:/i, "");

  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = email;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopied(true);
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="contact" className="relative min-h-screen w-full">
      <div className="section-content">
        <header className="mb-12 flex flex-col justify-center items-center gap-4 text-center">
          <AppleHelloContactEffect className="w-full" />
          <p className="mx-auto p-4 max-w-3xl text-lg text-muted-foreground">
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
            <ModalContent className="flex flex-col items-center gap-4 sm:gap-6">
              <h3 className="text-lg sm:text-xl font-semibold">Get in touch</h3>
              <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-md">
                {CONTACT_CONTENT}
              </p>
              <div className="w-full max-w-md space-y-3">
                <div className="w-full space-y-1 text-left">
                  <div className="text-sm font-medium text-foreground">
                    Email
                  </div>
                  <InputGroup className="w-full">
                    <InputGroupAddon>
                      <Mail className="size-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      value={email}
                      readOnly
                      inputMode="email"
                      aria-label="Email address"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        variant="ghost"
                        onClick={copyEmail}
                        aria-label={copied ? "Copied" : "Copy email"}
                      >
                        {copied ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <div className="h-4 text-xs text-muted-foreground">
                    {copied ? "Copied to clipboard." : "\u00A0"}
                  </div>
                </div>

                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full inline-flex items-center justify-center gap-2",
                  )}
                >
                  <Linkedin className="size-5" />
                  LinkedIn
                </a>
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full inline-flex items-center justify-center gap-2",
                  )}
                >
                  <SiDiscord className="size-5" />
                  Discord
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
