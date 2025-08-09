export const scrollToTop = (smooth = true) => {
  if (smooth) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  } else {
    window.scrollTo(0, 0);
  }
  
  // Add animation class to container
  const container = document.querySelector('.unified-container');
  if (container) {
    container.classList.add('unified-scroll-to-top');
    setTimeout(() => {
      container.classList.remove('unified-scroll-to-top');
    }, 500);
  }
};
