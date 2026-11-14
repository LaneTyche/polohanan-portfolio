"use strict";

const phrases = [
  "Building a better tomorrow...",
  "IT Student",
  "Aspiring Developer",
  "3D Artist"
];

const typedLine = document.querySelector(".terminal__typed");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (typedLine) {
  if (reduceMotion) {
    typedLine.textContent = phrases[0];
  } else {
    let phraseIndex = 0;
    let characterIndex = 0;
    let deleting = false;

    const typeNext = () => {
      const phrase = phrases[phraseIndex];
      typedLine.textContent = phrase.slice(0, characterIndex);

      if (!deleting && characterIndex < phrase.length) {
        characterIndex += 1;
        window.setTimeout(typeNext, 58);
      } else if (!deleting) {
        deleting = true;
        window.setTimeout(typeNext, 1450);
      } else if (characterIndex > 0) {
        characterIndex -= 1;
        window.setTimeout(typeNext, 28);
      } else {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        window.setTimeout(typeNext, 300);
      }
    };

    typeNext();
  }
}

const navToggle = document.querySelector(".nav__toggle");
const navMenu = document.querySelector(".nav__menu");

if (navToggle && navMenu) {
  const closeMenu = () => {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation menu");
    navMenu.classList.remove("is-open");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    navMenu.classList.toggle("is-open", !isOpen);
  });

  navMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const header = document.querySelector(".site-header");
const updateHeader = () => {
  if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
};
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const navLinks = [...document.querySelectorAll(".nav__link")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-35% 0px -55% 0px" });
  sections.forEach((section) => sectionObserver.observe(section));
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
}

const particleContainer = document.querySelector("#particles");
if (particleContainer && !reduceMotion) {
  const symbols = ["+", "·", "⌁", "0", "1", "✳"];
  for (let index = 0; index < 24; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.textContent = symbols[index % symbols.length];
    particle.style.left = `${(index * 47 + 13) % 100}%`;
    particle.style.top = `${(index * 31 + 9) % 100}%`;
    particle.style.setProperty("--duration", `${11 + (index % 8)}s`);
    particle.style.setProperty("--delay", `${-((index * 1.7) % 16)}s`);
    particleContainer.append(particle);
  }
}

const contactForm = document.querySelector("#contact-form");
const formNote = document.querySelector("#form-note");
const contactAddress = "marieljoycenepomuceno@gmail.com";

if (contactForm && formNote) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const formData = new FormData(contactForm);
    const subject = `Portfolio message from ${formData.get("name")}`;
    const body = [
      `Name: ${formData.get("name")}`,
      `Email: ${formData.get("email")}`,
      "",
      formData.get("message")
    ].join("\n");
    const gmailUrl = new URL("https://mail.google.com/mail/");
    gmailUrl.searchParams.set("view", "cm");
    gmailUrl.searchParams.set("fs", "1");
    gmailUrl.searchParams.set("to", contactAddress);
    gmailUrl.searchParams.set("su", subject);
    gmailUrl.searchParams.set("body", body);

    window.location.href = gmailUrl.toString();
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());
