document.addEventListener("DOMContentLoaded", () => {

  const targets = ".logo, .success-circle, .success-circle i, .confetti span, .done-content h1, .done-content h2, .done-content p, .back-home, .shape-left, .shape-right, .shape-bottom";

  try {
    gsap.from(".logo", {
      opacity: 0,
      y: -20,
      duration: 0.7
    });

    gsap.from(".success-circle", {
      scale: 0,
      rotation: -20,
      duration: 0.9,
      ease: "back.out(1.8)",
      delay: 0.2
    });

    gsap.from(".success-circle i", {
      scale: 0,
      duration: 0.6,
      ease: "back.out(2)",
      delay: 0.75
    });

    gsap.from(".confetti span", {
      opacity: 0,
      scale: 0,
      y: 20,
      stagger: 0.05,
      duration: 0.5,
      delay: 0.8,
      ease: "back.out(2)"
    });

    gsap.from(".done-content h1, .done-content h2, .done-content p, .back-home", {
      opacity: 0,
      y: 25,
      stagger: 0.15,
      duration: 0.7,
      delay: 1
    });

    gsap.from(".shape-left, .shape-right, .shape-bottom", {
      opacity: 0,
      y: 120,
      scale: 0.8,
      duration: 1,
      stagger: 0.15,
      delay: 0.5,
      ease: "power2.out"
    });

  } catch (err) {
    console.error("Animation error:", err);
  }

  // Safety net: no matter what happens with the animation,
  // force every element back to its normal, fully visible state
  // shortly after the animation should have finished.
  setTimeout(() => {
    if (typeof gsap !== "undefined") {
      gsap.set(targets, { clearProps: "all" });
    } else {
      document.querySelectorAll(targets).forEach(el => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }
  }, 2500);

});