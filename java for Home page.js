document.addEventListener("DOMContentLoaded", function () {
  const header = document.querySelector(".div1");
  const nav = document.querySelector(".div2");
// what is being held

  if (!header || !nav) {
    return;
  }
// why is return the the nomenclature? // the start 

  function updatePinnedOffset() {
    const headerHeight = header.offsetHeight;
    document.documentElement.style.setProperty(
      "--pinned-header-height",
      // pinned header height is the code that links to css 
      `${headerHeight}px`
      //`${headerHeight}px` is what you edit in css for the location, currently set to 00px
    );
  }

  updatePinnedOffset();
  window.addEventListener("resize", updatePinnedOffset);
  initializeNavCollapse();
});
// I assume this is for when I start usig breakpoints/messing with the grid

function initializeNavCollapse() {
  const stickyHeader = document.querySelector(".sticky-header");
  const toggle = document.querySelector(".nav-collapse-toggle");

  if (!stickyHeader || !toggle) return;

  toggle.addEventListener("click", () => {
    const isCollapsed = stickyHeader.classList.toggle("nav-collapsed");
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
  });
}

//start of carousal code
const projects = [
  {
      title: "Residential Renewal Through Adaptive Redesign",
      description: "An abandoned residential property is revitalized through strategic reuse, transforming it into a functional and contemporary living space.",
      image: "https://www.lincolncountync.gov/ImageRepository/Document?documentId=22197",
      count: 1,
      date: "2026-05-15",
      tags: ["3D Scan", "File Upload", "Send to print"],
      //the tags can be changed freely the purple stuff cant but should be changled to the proper upload/templates later
     //eventually replace the website links with the correct page links or templates
  },
  // whats written in the boxes
  {
      title: "Commercial to Residential Adaptive Conversion",
      description: "A commercial building is reconfigured for residential use, enabling efficient reuse of existing structure while meeting contemporary living standards.",
      image: "https://images.adsttc.com/media/images/5da0/e093/3312/fd25/b100/007b/newsletter/feature_-_Mason_Bros._North_Facade_7of7.jpg?1570824323",
      count: 2,
      date: "2026-06-22",
      tags: ["Blueprint", "Tool Redraw", "Reimaginization"],
      //eventually replace the website links with the correct page links or templates
  },
  {
      title: "New Residential Development on Acquired Site",
      description: "A recently acquired plot is developed into a new residential property, optimizing site potential through strategic planning and contemporary design.",
      image: "https://ssl.cdn-redfin.com/photo/144/islphoto/697/genIslnoResize.20261011697_1.webp",
      count: 3,
      date: "2026 -07-30",
      tags: ["Fresh Design", "No Experience", "Modern Plan"],
      //eventually replace the website links with the correct page links or templates
  }
];

const cardContainer = document.querySelector('.ps-card-container');
const prevBtn = document.querySelector('.ps-prev-btn');
const nextBtn = document.querySelector('.ps-next-btn');
let currentIndex = 0;
let autoScrollInterval;

// controles the next and before buttons

function createCard(project, index) {
  const card = document.createElement('div');
  card.className = 'ps-card';
  card.style.transform = `translateX(${index * 100}%)`;

  const content = document.createElement('div');
  content.className = 'ps-card-content';

  const imageOrder = index % 2 === 0 ? 0 : 1;
  const infoOrder = index % 2 === 0 ? 1 : 0;

  content.innerHTML = `
      <div class="ps-card-image" style="background-image: url(${project.image}); order: ${imageOrder};"></div>
      <div class="ps-card-info" style="order: ${infoOrder};">
          <h2 class="ps-card-title">${project.title}</h2>
          <p class="ps-card-description">${project.description}</p>
          <div class="ps-card-meta">
              <span class="ps-card-count">Project ${project.count}</span>
              <span class="ps-card-date">Created: ${project.date}</span>
          </div>
          <div class="ps-card-tags">
              ${project.tags.map(tag => `<span class="ps-card-tag">${tag}</span>`).join('')}
          </div>
      </div>
  `;
  //i feel like one of the github text above is what changes the the live text on the container cards

  card.appendChild(content);
  return card;
}

function renderCards() {
  if (!cardContainer) {
      return;
  }

  projects.forEach((project, index) => {
      const card = createCard(project, index);
      cardContainer.appendChild(card);
  });
}

function moveToNextCard() {
  currentIndex = (currentIndex + 1) % projects.length;
  updateCardPositions();
}

function moveToPrevCard() {
  currentIndex = (currentIndex - 1 + projects.length) % projects.length;
  updateCardPositions();
}

function updateCardPositions() {
  const cards = document.querySelectorAll('.ps-card');
  cards.forEach((card, index) => {
      const offset = (index - currentIndex + projects.length) % projects.length;
      card.style.transform = `translateX(${offset * 100}%) scale(${offset === 0 ? 1 : 0.9})`;
      card.style.opacity = offset === 0 ? 1 : 0.5;
      card.style.zIndex = offset === 0 ? 1 : 0;
  });
}

if (cardContainer && prevBtn && nextBtn) {
  renderCards();

  nextBtn.addEventListener('click', moveToNextCard);
  prevBtn.addEventListener('click', moveToPrevCard);

  autoScrollInterval = setInterval(moveToNextCard, 99000);

  cardContainer.addEventListener('mouseenter', () => clearInterval(autoScrollInterval));
  cardContainer.addEventListener('mouseleave', () => {
      autoScrollInterval = setInterval(moveToNextCard, 99000);
  });

  updateCardPositions();
}

//
