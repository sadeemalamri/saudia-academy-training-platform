document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // Navbar
  // =========================

  const navbar = document.getElementById("navbar");
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  const navLinks = document.querySelectorAll(".nav-link");

  function updateNavbar() {
    if (!navbar) return;

    navbar.classList.toggle("scrolled", window.scrollY > 20);
  }

  updateNavbar();

  window.addEventListener("scroll", updateNavbar, {
    passive: true
  });

  // =========================
  // Mobile Menu
  // =========================

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (mainNav) {
        mainNav.classList.remove("open");
      }
    });
  });

  // =========================
  // Active Navigation Link
  // =========================

  const sections = document.querySelectorAll(
    "section[id], footer[id]"
  );

  function updateActiveLink() {
    let currentSection = "";
    const scrollPosition = window.scrollY + 180;

    sections.forEach((section) => {
      if (scrollPosition >= section.offsetTop) {
        currentSection = section.id;
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");

      link.classList.remove("active");

      if (href === "#" && window.scrollY < 250) {
        link.classList.add("active");
      }

      if (href === `#${currentSection}`) {
        link.classList.add("active");
      }
    });
  }

  updateActiveLink();

  window.addEventListener("scroll", updateActiveLink, {
    passive: true
  });

  // =========================
  // Check GSAP
  // =========================

  if (!window.gsap) {
    console.warn("GSAP is not loaded.");
    return;
  }

  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // =========================
  // Reduced Motion
  // =========================

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) {
    gsap.set(
      [
        ".hero-badge",
        ".hero h1",
        ".hero-content > p",
        ".hero-buttons",
        ".section-heading",
        ".feature-card",
        ".program-copy > *",
        ".program-visual",
        ".detail-card",
        "footer > div"
      ],
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1
      }
    );

    return;
  }

  // =========================
  // Hero Animation
  // =========================

  const heroTimeline = gsap.timeline({
    defaults: {
      ease: "power3.out"
    }
  });

  heroTimeline
    .from(".hero-img", {
      scale: 1.15,
      duration: 1.6
    })
    .from(
      ".hero-badge",
      {
        opacity: 0,
        y: 25,
        duration: 0.6
      },
      0.2
    )
    .from(
      ".hero h1",
      {
        opacity: 0,
        y: 60,
        duration: 0.9
      },
      0.35
    )
    .from(
      ".hero-content > p",
      {
        opacity: 0,
        y: 30,
        duration: 0.7
      },
      0.55
    )
    .from(
      ".hero-buttons",
      {
        opacity: 0,
        y: 25,
        duration: 0.65
      },
      0.7
    )


  // =========================
  // Hero Parallax
  // =========================

  if (window.ScrollTrigger) {
    gsap.to(".hero-img", {
      yPercent: 8,
      ease: "none",

      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1.2
      }
    });
  }

  // =========================
  // Scroll Indicator
  // =========================

  gsap.to(".scroll-indicator svg", {
    y: 7,
    duration: 1,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  // =========================
  // Section Headings
  // =========================

  gsap.utils.toArray(".section-heading").forEach((heading) => {
    gsap.from(heading.children, {
      opacity: 0,
      y: 35,
      duration: 0.8,
      stagger: 0.12,
      ease: "power3.out",

      scrollTrigger: {
        trigger: heading,
        start: "top 82%",
        once: true
      }
    });
  });

  // =========================
  // Feature Card Hover
  // =========================

  document
    .querySelectorAll(".feature-card")
    .forEach((card) => {
      const icon = card.querySelector(".feature-icon");
      const arrow = card.querySelector(".card-arrow");

      card.addEventListener("mouseenter", () => {
        if (icon) {
          gsap.to(icon, {
            scale: 1.06,
            duration: 0.3
          });
        }

        if (arrow) {
          gsap.to(arrow, {
            rotate: 8,
            duration: 0.3
          });
        }
      });

      card.addEventListener("mouseleave", () => {
        if (icon) {
          gsap.to(icon, {
            rotate: 0,
            scale: 1,
            duration: 0.3
          });
        }

        if (arrow) {
          gsap.to(arrow, {
            rotate: 0,
            duration: 0.3
          });
        }
      });
    });

  // =========================
  // Program Text
  // =========================

  gsap.from(".program-copy > *", {
    opacity: 0,
    x: -50,
    duration: 0.8,
    stagger: 0.1,
    ease: "power3.out",

    scrollTrigger: {
      trigger: ".program-panel",
      start: "top 76%",
      once: true
    }
  });

  // =========================
  // Program Visual
  // =========================

  gsap.from(".program-visual", {
    opacity: 0,
    x: 60,
    scale: 0.94,
    duration: 1,
    ease: "power3.out",

    scrollTrigger: {
      trigger: ".program-panel",
      start: "top 76%",
      once: true
    }
  });

  // =========================
  // Rotating Orbits
  // =========================

  gsap.to(".orbit-one", {
    rotate: 360,
    duration: 24,
    repeat: -1,
    ease: "none"
  });

  gsap.to(".orbit-two", {
    rotate: -360,
    duration: 32,
    repeat: -1,
    ease: "none"
  });

  // =========================
  // Floating Plane
  // =========================

  gsap.to(".visual-core", {
    y: -10,
    duration: 2.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  // =========================
  // Floating Chips
  // =========================

  gsap.utils
    .toArray(".visual-chip")
    .forEach((chip, index) => {
      gsap.to(chip, {
        y: index % 2 === 0 ? -8 : 8,
        duration: 2.3 + index * 0.25,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    });



  // =========================
  // Footer
  // =========================

  gsap.from("footer > div", {
    opacity: 0,
    y: 40,
    duration: 0.8,
    stagger: 0.15,
    ease: "power3.out",

    scrollTrigger: {
      trigger: "footer",
      start: "top 88%",
      once: true
    }
  });

  // =========================
  // Refresh ScrollTrigger
  // =========================

  window.addEventListener("load", () => {
    if (window.ScrollTrigger) {
      ScrollTrigger.refresh();
    }
  });

  // =========================
  // Program Details Image Switcher
  // =========================

  const programDetailItems = document.querySelectorAll(
    ".program-detail-item"
  );

  const programDetailImage = document.getElementById(
    "programDetailImage"
  );

  const programImageLabel = document.getElementById(
    "programImageLabel"
  );

  programDetailItems.forEach((item) => {
    const activateItem = () => {
      if (item.classList.contains("active")) {
        return;
      }

      gsap.killTweensOf(programDetailImage);

      const newImage = item.dataset.image;
      const newLabel = item.dataset.label;

      programDetailItems.forEach((detailItem) => {
        detailItem.classList.remove("active");
      });

      item.classList.add("active");

      function changeImage() {
        programDetailImage.src = newImage;
        programDetailImage.alt = newLabel;

        programDetailImage.classList.toggle(
          "duration-image",
          newLabel === "Duration"
        );

        const imagePanel = programDetailImage.closest(
          ".details-image-panel"
        );

        if (imagePanel) {
          imagePanel.classList.toggle(
            "duration-active",
            newLabel === "Duration"
          );
        }

        if (programImageLabel) {
          programImageLabel.textContent = newLabel;
        }
      }

      if (window.gsap) {
        gsap.to(programDetailImage, {
          opacity: 0,
          x: -10,
          duration: 0.14,
          ease: "power1.out",

          overwrite: true,

          onComplete: () => {
            changeImage();

            gsap.fromTo(
              programDetailImage,
              {
                opacity: 0,
                x: 12
              },
              {
                opacity: 1,
                x: 0,
                duration: 0.3,
                ease: "power2.out",
                overwrite: true
              }
            );
          }
        });
      } else {
        changeImage();
      }
    };

    item.addEventListener("mouseenter", activateItem);
    item.addEventListener("click", activateItem);
  });
});