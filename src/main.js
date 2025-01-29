//region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ INITIALIZATION ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ //

let csvData = [];

let selectedFilters = [];
let showingScreenshotLightbox = true;

let learnCurrentImgType = "iconName";
let learnCurrentIndex = -1;
let learnProcessedIndices = [];
let learnLeftSwipes = 0;
let learnRightSwipes = 0;
let learnStartX = 0;
let learnCurrentX = 0;
let learnStartY = 0;
let learnCurrentY = 0;
let learnIsDragging = false;
let learnIsMouseDown = false;
let learnIsHorizontalDrag = false;

let spellsProcessedClasses = new Set();
const spellsCurrentDisplayedSpells = new Map(); // Map<spellID, DOMElement>

if (window.location.pathname.endsWith("spells.html") || window.location.pathname.endsWith("learn.html")) {
  loadFiltersFromLocalStorage();
  setSelectedFilters();
}

let isScreenSmall = window.innerWidth <= 550; // Initial state: true if <= 550px, false if > 550px

function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

//endregion

//region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ EVENT LISTENERS ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ //

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  if (window.location.pathname.endsWith("spells.html")) {
    if (csvData.length === 0) {
      csvData = await loadCSVData();
    }
    showSpellsSection();
  }
  if (window.location.pathname.endsWith("learn.html")) {
    if (csvData.length === 0) {
      csvData = await loadCSVData();
    }
    showLearnSection();
  }
});

function setupEventListeners() {
  if (window.location.pathname.endsWith("spells.html") || window.location.pathname.endsWith("learn.html")) {
    document.getElementById("backdrop").addEventListener("click", toggleFilterMenu);
    document.getElementById("filterButton").addEventListener("click", toggleFilterMenu);
    document.getElementById("filterCloseButton").addEventListener("click", toggleFilterMenu);
    const checkboxes = document.querySelectorAll('#filterMenu input[type="checkbox"]');
    const checkboxClassAll = document.querySelector('#filterMenu input[value="CLASS_ALL"]');
    const checkboxCategoryAll = document.querySelector('#filterMenu input[value="CATEGORY_ALL"]');
    const checkboxCategoryDefensive = document.querySelector('#filterMenu input[value="CATEGORY_DEFENSIVE"]');
    const checkboxAddonAll = document.querySelector('#filterMenu input[value="ADDON_ALL"]');
    const checkboxAddonOmniBar = document.querySelector('#filterMenu input[value="ADDON_OMNIBAR"]');
    const checkboxSettingsCategories = document.querySelector('#filterMenu input[value="SETTINGS_CATEGORIES"]');
    const checkboxSettingsDescriptions = document.querySelector('#filterMenu input[value="SETTINGS_DESCRIPTIONS"]');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (event) =>
        handleCheckboxChange(
          event,
          checkboxes,
          checkboxClassAll,
          checkboxCategoryAll,
          checkboxCategoryDefensive,
          checkboxAddonAll,
          checkboxAddonOmniBar,
          checkboxSettingsCategories,
          checkboxSettingsDescriptions
        )
      );
    });

    const toggleOption = document.querySelectorAll(".toggleOption");
    toggleOption.forEach((option) => {
      option.addEventListener("click", () => {
        toggleOption.forEach((opt) => opt.classList.remove("active"));
        option.classList.add("active");
      });
    });

    document.addEventListener("click", (event) => {
      if (event.target.classList.contains("cardScreenshot") && showingScreenshotLightbox && window.innerWidth > 550) {
        handleScreenshotClick(event);
      }
    });
    document.getElementById("screenshotLightboxOverlay").addEventListener("click", closeScreenshotLightbox);
    document.addEventListener("keydown", handleLightboxKeydown);
  }

  if (window.location.pathname.endsWith("learn.html")) {
    document.getElementById("buttonStartLearn").addEventListener("click", startLearning);

    const learnImageBackdrop = document.getElementById("learnImageBackdrop");
    if (isTouchDevice()) {
      learnImageBackdrop.addEventListener("touchend", showCard);
    } else {
      learnImageBackdrop.addEventListener("click", showCard);
    }

    learnCardsContainerBackdrop.addEventListener("mousedown", startDrag);
    learnCardsContainerBackdrop.addEventListener("touchstart", startDrag);

    learnCardsContainerBackdrop.addEventListener("mousemove", moveDrag);
    learnCardsContainerBackdrop.addEventListener("touchmove", moveDrag);

    learnCardsContainerBackdrop.addEventListener("mouseup", endDrag);
    learnCardsContainerBackdrop.addEventListener("touchend", endDrag);

    learnCardsContainerBackdrop.addEventListener("mouseleave", endDrag);
  }
}

//endregion

//region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ SPELLS PAGE ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ //

function showSpellsSection() {
  document.body.style.overflow = "visible";
  document.body.style.userSelect = "auto";

  loadCardsForFilters(selectedFilters);
}

function loadCardsForFilters(filters) {
  const matchingSpells = getMatchingSpellsForFilters(filters);
  updateNoResultsText(matchingSpells.length);

  // Sort matching spells by spellOrderIndex for correct order
  matchingSpells.sort((a, b) => Number(a.spellOrderIndex) - Number(b.spellOrderIndex));

  // Get the cards container
  const cardsContainer = document.getElementById("spellsCardsContainer");
  if (!cardsContainer) {
    console.error("Error: cardsContainer element not found.");
    return;
  }

  // Keep track of visible classes
  const visibleClasses = new Set();

  // Process the matching spells
  matchingSpells.forEach((spell) => {
    const spellID = spell.spellID;
    const spellClassType = spell.classType;
    const classColor = classColors[spellClassType.toLowerCase()] || "#AAAAAA";

    visibleClasses.add(spellClassType); // Mark this class as visible

    // Insert a class divider if this is the first spell of its class
    if (!spellsProcessedClasses.has(spellClassType)) {
      spellsProcessedClasses.add(spellClassType);
      createAndAppendClassDivider(spellClassType, classColor, cardsContainer);
    }

    if (spellsCurrentDisplayedSpells.has(spellID)) {
      // Spell is already displayed
      const card = spellsCurrentDisplayedSpells.get(spellID);
      card.classList.remove("hidden"); // Ensure it’s visible
    } else {
      // Spell is not displayed, create the card
      const card = createAndAppendCard(spell, classColor || "#AAAAAA", cardsContainer);

      // Determine the correct position based on spellOrderIndex
      const allCards = Array.from(cardsContainer.children);
      const insertBeforeElement = allCards.find(
        (existingCard) => Number(existingCard.dataset.spellOrderIndex) > Number(spell.spellOrderIndex)
      );

      // Insert the card into the correct position
      if (insertBeforeElement) {
        cardsContainer.insertBefore(card, insertBeforeElement);
      } else {
        cardsContainer.appendChild(card); // Append if no element has a higher spellOrderIndex
      }

      // Track it in the global variable
      spellsCurrentDisplayedSpells.set(spellID, card);
    }
  });

  // Hide cards that no longer match
  Array.from(spellsCurrentDisplayedSpells.keys()).forEach((spellID) => {
    const stillMatches = matchingSpells.some((spell) => spell.spellID === spellID);
    if (!stillMatches) {
      const card = spellsCurrentDisplayedSpells.get(spellID);
      card.classList.add("hidden"); // Hide it
    }
  });

  // Hide class dividers for classes with no visible spells
  const allClassDividers = Array.from(cardsContainer.querySelectorAll(".classDivider"));
  allClassDividers.forEach((divider) => {
    const classType = divider.getAttribute("data-class-type");
    if (visibleClasses.has(classType)) {
      divider.classList.remove("hidden"); // Ensure it's visible
    } else {
      divider.classList.add("hidden"); // Hide it if no spells of this class remain
    }
  });

  // Adjust heights after updates
  adjustScreenshotContainerHeight();

  console.log(`SPELLS SHOWN: ${matchingSpells.length}`);
}

function getMatchingSpellsForFilters(filters) {
  // Separate filters into class, category, and addon filters
  const classFilters = filters.filter((filter) => filter.startsWith("CLASS_"));
  const categoryFilters = filters.filter((filter) => filter.startsWith("CATEGORY_"));
  const addonFilters = filters.filter((filter) => filter.startsWith("ADDON_"));

  // Build active checkers for each filter type
  const classCheckers = classFilters.map((filter) => filterMappings[filter]).filter(Boolean);
  const categoryCheckers = categoryFilters.map((filter) => filterMappings[filter]).filter(Boolean);
  const addonCheckers = addonFilters.map((filter) => filterMappings[filter]).filter(Boolean);

  // Filter spells to match one of the selected classes, categories, AND addons
  return csvData.filter((spell) => {
    const matchesClass = classCheckers.some((check) => check(spell));
    const matchesCategory = categoryCheckers.some((check) => check(spell));
    const matchesAddon = addonCheckers.some((check) => check(spell));
    return matchesClass && matchesCategory && matchesAddon;
  });
}

function updateNoResultsText(filteredSpellsAmount) {
  const noFilterResultsText = document.getElementById("noFilterResultsText");
  if (filteredSpellsAmount > 0) {
    noFilterResultsText.classList.add("hidden"); // Hide if filter has spells
    document.getElementsByTagName("footer")[0].classList.remove("hidden");

    if (window.location.pathname.endsWith("spells.html")) {
      // show original content (not needed here as loadCardsForFilters just load stuff by itself)
    }

    if (window.location.pathname.endsWith("learn.html")) {
      document.getElementById("learnSection").classList.remove("hidden");

      document.body.style.userSelect = "";
      document.getElementById("learnSection").style.height = "";
      document.body.style.height = "";
    }
  } else {
    noFilterResultsText.classList.remove("hidden"); // Show if filter has no spells
    document.getElementsByTagName("footer")[0].classList.add("hidden");

    if (window.location.pathname.endsWith("spells.html")) {
      // hide original content (not needed here as loadCardsForFilters just doesn't load stuff)
    }

    if (window.location.pathname.endsWith("learn.html")) {
      document.getElementById("learnSection").classList.add("hidden");
    }
  }
}

//endregion

//region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ LEARN PAGE ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ //

function getFilteredEntries() {
  // Separate filters into class, category, and addon filters
  const classFilters = selectedFilters.filter((filter) => filter.startsWith("CLASS_"));
  const categoryFilters = selectedFilters.filter((filter) => filter.startsWith("CATEGORY_"));
  const addonFilters = selectedFilters.filter((filter) => filter.startsWith("ADDON_"));

  // Build active checkers for each filter type
  const classCheckers = classFilters.map((filter) => filterMappings[filter]).filter(Boolean);
  const categoryCheckers = categoryFilters.map((filter) => filterMappings[filter]).filter(Boolean);
  const addonCheckers = addonFilters.map((filter) => filterMappings[filter]).filter(Boolean);

  // Filter entries to match one of the selected classes, categories, AND addons
  return csvData.filter((entry) => {
    const matchesClass = classCheckers.length === 0 || classCheckers.some((check) => check(entry));
    const matchesCategory = categoryCheckers.length === 0 || categoryCheckers.some((check) => check(entry));
    const matchesAddon = addonCheckers.length === 0 || addonCheckers.some((check) => check(entry));

    return matchesClass && matchesCategory && matchesAddon;
  });
}

function showLearnSection() {
  document.getElementsByTagName("footer")[0].classList.remove("hidden");

  updateNoResultsText(getMatchingSpellsForFilters(selectedFilters).length);
  footerAdjustmentOnLearnPage();

  document.getElementById("learnText").classList.remove("hidden");
  document.getElementById("learnModeChoice").classList.remove("hidden");
  document.getElementById("learnContent").classList.add("hidden");
}

function startLearning() {
  document.body.style.userSelect = "none";
  document.getElementById("learnSection").style.height = `${window.innerHeight - 50}px`;
  document.body.style.height = `${window.innerHeight - 50}px`;

  document.getElementsByTagName("footer")[0].classList.add("hidden");
  const filteredEntries = getFilteredEntries();

  // Reset game state
  learnProcessedIndices = []; // Clear processed entries
  learnCurrentIndex = -1;
  learnLeftSwipes = 0;
  learnRightSwipes = 0;

  learnCurrentImgType = document.querySelector(".toggleOption.active").classList.contains("toggleOption1")
    ? "iconName"
    : "screenshotName";

  // Select the first random entry
  learnCurrentIndex = Math.floor(Math.random() * filteredEntries.length);

  learnProcessedIndices.push(learnCurrentIndex);

  document.getElementById("learnResultText").classList.add("hidden");
  document.getElementById("learnContent").classList.remove("hidden");
  document.getElementById("learnModeChoice").classList.add("hidden");
  document.getElementById("learnText").classList.add("hidden");

  showLearnImage();
}

function showLearnImage() {
  const filteredEntries = getFilteredEntries();

  // Get the current entry based on the filtered entries array
  const entry = filteredEntries[learnCurrentIndex];
  const learnImage = document.getElementById("learnImage");

  if (learnCurrentImgType === "screenshotName" && entry.screenshotName) {
    const baseName = entry.screenshotName.replace(/(\.[^/.]+)$/, ""); // Remove file extension
    const extension = entry.screenshotName.match(/(\.[^/.]+)$/)[0]; // Capture file extension (e.g., ".jpg")

    // Get the <picture> element and its children
    const pictureElement = document.querySelector(".learnImageBackdrop").querySelector("picture");
    const webpSource = pictureElement.querySelector("source[type='image/webp']");
    const jpegSource = pictureElement.querySelector("source[type='image/jpeg']");
    const imgFallback = pictureElement.querySelector("img");

    // Set the WebP source set
    webpSource.srcset = `
    ../images/blizzard/spell-screenshots/${baseName}-@1x.webp 1x,
    ../images/blizzard/spell-screenshots/${baseName}-@2x.webp 2x,
    ../images/blizzard/spell-screenshots/${baseName}-@3x.webp 3x,
    ../images/blizzard/spell-screenshots/${baseName}-@4x.webp 4x
  `;

    // Set the JPG fallback source set
    jpegSource.srcset = `
    ../images/blizzard/spell-screenshots/${baseName}-@1x${extension} 1x,
    ../images/blizzard/spell-screenshots/${baseName}-@2x${extension} 2x,
    ../images/blizzard/spell-screenshots/${baseName}-@3x${extension} 3x,
    ../images/blizzard/spell-screenshots/${baseName}-@4x${extension} 4x
  `;

    // Fallback src for older browsers (JPG)
    imgFallback.src = `${baseName}-@1x${extension}`;

    // Add the screenshot class and remove the icon class
    learnImageBackdrop.classList.add("screenshotMode");
    learnImageBackdrop.classList.remove("iconMode");
  } else {
    learnImage.srcset = "";

    learnImage.src =
      learnCurrentImgType === "screenshotName"
        ? "../images/blizzard/spell-screenshots/" + entry[learnCurrentImgType]
        : "../images/blizzard/spell-icons/" + entry[learnCurrentImgType];

    // Add the icon class and remove the screenshot class
    learnImageBackdrop.classList.add("iconMode");
    learnImageBackdrop.classList.remove("screenshotMode");
  }

  learnImage.alt = `${entry.name} ${learnCurrentImgType === "screenshotName" ? "screenshot" : "icon"}`;
  learnImage.classList.remove("hidden");
  document.getElementById("learnImageBackdrop").classList.remove("hidden");
  document.getElementById("learnCardsContainer").classList.add("hidden");
  document.getElementById("learnCardsContainerBackdrop").classList.add("hidden");

  document.getElementById("learnTextHeadline").innerText = "Remeber it?";
  document.getElementById("learnTextSwipeLeft").innerText = "";
  document.getElementById("learnTextSwipeText").innerText = "click to continue";
  document.getElementById("learnTextSwipeRight").innerText = "";
}

function showCard() {
  const filteredEntries = getFilteredEntries();
  const entry = filteredEntries[learnCurrentIndex];
  const destinationElement = document.getElementById("learnCardsContainer");

  destinationElement.innerHTML = "";
  destinationElement.classList.remove("hidden");
  document.getElementById("learnCardsContainerBackdrop").classList.remove("hidden");

  createAndAppendCard(entry, classColors[entry.classType.toLowerCase()], destinationElement);

  document.getElementById("learnImage").classList.add("hidden");
  document.getElementById("learnImageBackdrop").classList.add("hidden");

  document.getElementById("learnTextHeadline").innerText = "Did you know it?";
  document.getElementById("learnTextSwipeLeft").innerText = "← No";
  document.getElementById("learnTextSwipeText").innerText = "swipe";
  document.getElementById("learnTextSwipeRight").innerText = "Yes →";
}

const learnCardsContainerBackdrop = document.getElementById("learnCardsContainerBackdrop");
const body = document.body;
const learnTextContainer = document.getElementById("learnTextContainer");

function startDrag(e) {
  learnStartX = e.touches ? e.touches[0].clientX : e.clientX;
  learnStartY = e.touches ? e.touches[0].clientY : e.clientY;
  learnIsDragging = true;
  learnIsMouseDown = true;
  learnIsHorizontalDrag = false; // Reset the horizontal drag detection
}

function moveDrag(e) {
  if (!learnIsDragging || !learnIsMouseDown) return;

  const moveX = (e.touches ? e.touches[0].clientX : e.clientX) - learnStartX;
  const moveY = (e.touches ? e.touches[0].clientY : e.clientY) - learnStartY;

  // Check if movement is more horizontal than vertical
  if (!learnIsHorizontalDrag) {
    if (Math.abs(moveX) > Math.abs(moveY) && Math.abs(moveX) > 2) {
      learnIsHorizontalDrag = true; // Confirm it's a horizontal drag
      document.body.style.overflow = "hidden"; // Disable vertical scrolling
    } else if (Math.abs(moveY) > 2) {
      // If vertical movement is detected, stop further processing
      learnIsDragging = false;
      return;
    }
  }

  if (learnIsHorizontalDrag) {
    e.preventDefault(); // Prevent the default scrolling behavior
    learnCurrentX = moveX;

    // Optional: Apply some visual feedback (like moving the card slightly)
    learnCardsContainerBackdrop.style.transform = `translateX(${learnCurrentX}px)`;

    // Change background color based on direction
    if (learnCurrentX > 0) {
      // Swiping right: green background
      const greenOpacity = Math.min(learnCurrentX / 100, 0.6);
      body.style.backgroundColor = `rgba(22, 163, 74, ${greenOpacity})`;
      // learnTextContainer.style.opacity = 1 - greenOpacity - 0.4;
    } else if (learnCurrentX < 0) {
      // Swiping left: red background
      const redOpacity = Math.min(-learnCurrentX / 100, 0.6);
      body.style.backgroundColor = `rgba(220, 38, 38, ${redOpacity})`;
      // learnTextContainer.style.opacity = 1 - redOpacity - 0.4;
    }
  }
}

function endDrag() {
  learnIsMouseDown = false;
  if (!learnIsDragging || !learnIsHorizontalDrag) return;
  learnIsDragging = false;

  // Restore vertical scrolling
  document.body.style.overflow = "";

  // Add a transition for smooth animation
  learnCardsContainerBackdrop.style.transition = "transform 0.3s ease, background-color 0.3s ease";
  learnTextContainer.style.transition = "opacity 0.3s ease";

  // Check swipe direction and magnitude
  if (learnCurrentX > 100) {
    // Right swipe: animate off-screen
    learnRightSwipes++;
    console.log(`Right Swipes: ${learnRightSwipes}`);
    learnCardsContainerBackdrop.style.transform = `translateX(100vw)`;
    learnTextContainer.style.opacity = 0;
    setTimeout(() => {
      proceedToNextLearnEntry();
      learnTextContainer.style.opacity = 1;
    }, 300);
  } else if (learnCurrentX < -100) {
    // Left swipe: animate off-screen
    learnLeftSwipes++;
    console.log(`Left Swipes: ${learnLeftSwipes}`);
    learnTextContainer.style.opacity = 0;
    learnCardsContainerBackdrop.style.transform = `translateX(-100vw)`;
    setTimeout(() => {
      proceedToNextLearnEntry();
      learnTextContainer.style.opacity = 1;
    }, 300);
  } else {
    // Reset to the center if the swipe didn't pass the threshold
    learnCardsContainerBackdrop.style.transform = "none";

    // Gradually fade the background color back to transparent
    setTimeout(() => {
      learnTextContainer.style.opacity = 1;
      body.style.backgroundColor = "transparent"; // Reset body background
    }, 0);
  }

  // Clean up transition after reset
  setTimeout(() => {
    learnCardsContainerBackdrop.style.transition = "none";
    learnTextContainer.style.transition = "none";
    showingScreenshotLightbox = true;
  }, 300);

  learnCurrentX = 0;
  learnCurrentY = 0;
}

// Existing logic to proceed to the next learn entry
function proceedToNextLearnEntry() {
  const container = document.getElementById("learnCardsContainerBackdrop");
  container.scrollTop = 0;
  const filteredEntries = getFilteredEntries();

  if (filteredEntries.length === 0) {
    alert("No more entries match the selected filters. Please adjust your filters.");
    return;
  }

  // Reset the position of learnCardsContainerBackdrop
  learnCardsContainerBackdrop.style.transition = "none"; // Prevent animation during reset
  learnCardsContainerBackdrop.style.transform = "none";
  body.style.backgroundColor = "transparent";

  if (learnProcessedIndices.length === filteredEntries.length) {
    document.getElementById("learnImageBackdrop").classList.add("hidden");
    document.getElementById("learnCardsContainerBackdrop").classList.add("hidden");
    document.getElementById("learnResultText").classList.remove("hidden");

    const percentage = Math.floor((learnRightSwipes / (learnLeftSwipes + learnRightSwipes)) * 100);
    const percentageText = `${percentage}%`;
    const rangeStart = Math.min(Math.floor(percentage / 5) * 5, 95);
    const rangeEnd = Math.min(rangeStart + 5, 100);
    const rangeText = `${rangeStart}-${rangeEnd}%`;

    document.getElementById("learnResultText").innerText = percentageText;
    plausible("Game End", {
      props: {
        source: "learn",
        section: "content",
        result: rangeText,
        classes: selectedFilters
          .filter((item) => item.startsWith("CLASS_")) // Keep only CLASS_ items
          .map((item) => item.replace("CLASS_", "")) // Remove CLASS_ prefix
          .join(", "),
        categories: selectedFilters
          .filter((item) => item.startsWith("CATEGORY_")) // Keep only CLASS_ items
          .map((item) => item.replace("CATEGORY_", "")) // Remove CLASS_ prefix
          .join(", "),
        addons: selectedFilters
          .filter((item) => item.startsWith("ADDON_")) // Keep only CLASS_ items
          .map((item) => item.replace("ADDON_", "")) // Remove CLASS_ prefix
          .join(", "),
        settings: selectedFilters
          .filter((item) => item.startsWith("SETTINGS_")) // Keep only CLASS_ items
          .map((item) => item.replace("SETTINGS_", "")) // Remove CLASS_ prefix
          .join(", "),
      },
    });

    document.getElementById("learnTextHeadline").innerText = "Result";
    document.getElementById("learnTextSwipeLeft").innerText = "";
    document.getElementById("learnTextSwipeText").innerText = "known";
    document.getElementById("learnTextSwipeRight").innerText = "";

    return;
  }

  // Select a new random entry that hasn't been processed yet
  do {
    learnCurrentIndex = Math.floor(Math.random() * filteredEntries.length);
  } while (learnProcessedIndices.includes(learnCurrentIndex));

  learnProcessedIndices.push(learnCurrentIndex);

  showLearnImage();
}

function resetLearnMode() {
  // Reset learn-related state
  learnProcessedIndices = [];
  learnCurrentIndex = -1;
  learnLeftSwipes = 0;
  learnRightSwipes = 0;

  // Return to learn mode selection
  document.getElementById("learnContent").classList.add("hidden");
  document.getElementById("learnModeChoice").classList.remove("hidden");
  document.getElementById("learnText").classList.remove("hidden");

  // Clear any learn-specific visuals
  document.getElementById("learnImage").src = "";
  document.getElementById("learnImageBackdrop").classList.add("hidden");
  document.getElementById("learnCardsContainerBackdrop").classList.add("hidden");
  document.body.style.backgroundColor = "transparent"; // Reset body background color
}

function footerAdjustmentOnLearnPage() {
  const section = document.getElementById("learnSection");
  const footer = document.getElementsByTagName("footer")[0];
  const sectionRect = section.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();

  if (sectionRect.bottom + footerRect.height <= window.innerHeight) {
    footer.style.position = "fixed";
    footer.style.bottom = "0";
  } else {
    footer.style.position = "static";
  }
}

//endregion

/*region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ SCREENSHOT LIGHTBOX ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼*/

function handleScreenshotClick(event) {
  const screenshotLightbox = document.getElementById("screenshotLightbox");
  const screenshotLightboxImage = document.getElementById("screenshotLightboxImage");

  const imgSrc = event.target.currentSrc || event.target.src;
  screenshotLightboxImage.style.borderColor = event.target.dataset.borderColor; // Set the border color
  screenshotLightboxImage.src = imgSrc; // Set the lightbox image source
  screenshotLightboxImage.alt = event.target.alt; // Set the lightbox image source
  screenshotLightbox.classList.remove("hidden"); // Show the lightbox
}
function closeScreenshotLightbox() {
  const screenshotLightbox = document.getElementById("screenshotLightbox");
  const screenshotLightboxImage = document.getElementById("screenshotLightboxImage");

  screenshotLightbox.classList.add("hidden");
  screenshotLightboxImage.src = ""; // Clear the image source
}
function handleLightboxKeydown(event) {
  if (event.key === "Escape") {
    closeScreenshotLightbox();
  }
}

/*endregion*/

//region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ FILTER MENU ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ //

function toggleFilterMenu() {
  const filterMenu = document.getElementById("filterMenu");
  const backdrop = document.getElementById("backdrop");

  // Toggle the visibility of the filter menu and backdrop
  const isHidden = filterMenu.classList.contains("hidden");
  filterMenu.classList.toggle("hidden", !isHidden);
  backdrop.classList.toggle("show", isHidden);

  // Show or hide the backdrop
  backdrop.classList.toggle("hidden", !isHidden);

  if (isHidden) {
    document.getElementById("filterButton").style.backgroundColor = "var(--color-main)";
  } else {
    document.getElementById("filterButton").style.backgroundColor = "var(--color-1)";
  }
}

function handleCheckboxChange(
  event,
  checkboxes,
  checkboxClassAll,
  checkboxCategoryAll,
  checkboxCategoryDefensive,
  checkboxAddonAll,
  checkboxAddonOmniBar,
  checkboxSettingsCategories,
  checkboxSettingsDescriptions
) {
  const clickedCheckbox = event.target;

  const addonCheckboxes = Array.from(checkboxes).filter((cb) => cb.value.startsWith("ADDON_"));
  if (clickedCheckbox.value.startsWith("ADDON_")) {
    if (clickedCheckbox === checkboxAddonAll) {
      // If "ALL" checkbox is manually selected or deselected
      if (checkboxAddonAll.checked) {
        // If "ALL" is selected, check all matching checkboxes
        addonCheckboxes.forEach((cb) => (cb.checked = true));
      } else {
        // If "ALL" is deselected, uncheck all matching checkboxes
        addonCheckboxes.forEach((cb) => (cb.checked = false));
      }
    } else {
      // If an individual checkbox (not "ALL") is changed
      if (!clickedCheckbox.checked) {
        // If any checkbox is deselected, uncheck "ALL"
        checkboxAddonAll.checked = false;
      } else {
        // If all individual checkboxes are selected, check "ALL"
        checkboxAddonAll.checked = addonCheckboxes.every((cb) => cb === checkboxAddonAll || cb.checked);
      }
    }
  }

  const categoryCheckboxes = Array.from(checkboxes).filter((cb) => cb.value.startsWith("CATEGORY_"));
  if (clickedCheckbox.value.startsWith("CATEGORY_")) {
    if (clickedCheckbox === checkboxCategoryAll) {
      // If "ALL" checkbox is manually selected or deselected
      if (checkboxCategoryAll.checked) {
        // If "ALL" is selected, check all matching checkboxes
        categoryCheckboxes.forEach((cb) => (cb.checked = true));
      } else {
        // If "ALL" is deselected, uncheck all matching checkboxes
        categoryCheckboxes.forEach((cb) => (cb.checked = false));
      }
    } else {
      // If an individual checkbox (not "ALL") is changed
      if (!clickedCheckbox.checked) {
        // If any checkbox is deselected, uncheck "ALL"
        checkboxCategoryAll.checked = false;
      } else {
        // If all individual checkboxes are selected, check "ALL"
        checkboxCategoryAll.checked = categoryCheckboxes.every((cb) => cb === checkboxCategoryAll || cb.checked);
      }
    }
  }

  const categoryDefensiveCheckboxes = Array.from(checkboxes).filter((cb) => cb.value.startsWith("CATEGORY_DEFENSIVE"));

  if (clickedCheckbox.value.startsWith("CATEGORY_DEFENSIVE")) {
    if (clickedCheckbox === checkboxCategoryDefensive) {
      // If the "DEFENSIVE" checkbox is manually selected or deselected
      if (checkboxCategoryDefensive.checked) {
        // Check all matching checkboxes when "DEFENSIVE" is selected
        categoryDefensiveCheckboxes.forEach((cb) => (cb.checked = true));
      } else {
        // Uncheck all matching checkboxes when "DEFENSIVE" is deselected
        categoryDefensiveCheckboxes.forEach((cb) => (cb.checked = false));
      }
    } else {
      // If an individual sub-checkbox (not "DEFENSIVE") is changed
      if (clickedCheckbox.checked) {
        // If any sub-checkbox is checked, ensure "DEFENSIVE" is checked
        checkboxCategoryDefensive.checked = true;
      } else {
        // If a sub-checkbox is unchecked, check if all sub-checkboxes are now unchecked
        checkboxCategoryDefensive.checked = categoryDefensiveCheckboxes.some(
          (cb) => cb !== checkboxCategoryDefensive && cb.checked
        );
      }
    }
  }

  const classCheckboxes = Array.from(checkboxes).filter((cb) => cb.value.startsWith("CLASS_"));
  if (clickedCheckbox.value.startsWith("CLASS_")) {
    if (clickedCheckbox === checkboxClassAll) {
      // If "ALL" checkbox is manually selected or deselected
      if (checkboxClassAll.checked) {
        // If "ALL" is selected, check all matching checkboxes
        classCheckboxes.forEach((cb) => (cb.checked = true));
      } else {
        // If "ALL" is deselected, uncheck all matching checkboxes
        classCheckboxes.forEach((cb) => (cb.checked = false));
      }
    } else {
      // If an individual checkbox (not "ALL") is changed
      if (!clickedCheckbox.checked) {
        // If any checkbox is deselected, uncheck "ALL"
        checkboxClassAll.checked = false;
      } else {
        // If all individual checkboxes are selected, check "ALL"
        checkboxClassAll.checked = classCheckboxes.every((cb) => cb === checkboxClassAll || cb.checked);
      }
    }
  }

  const addonOmnibarCheckboxes = Array.from(checkboxes).filter((cb) => cb.value.startsWith("ADDON_OMNIBAR"));

  if (clickedCheckbox.value.startsWith("ADDON_OMNIBAR")) {
    if (clickedCheckbox === checkboxAddonOmniBar) {
      // If the "DEFENSIVE" checkbox is manually selected or deselected
      if (checkboxAddonOmniBar.checked) {
        // Check all matching checkboxes when "DEFENSIVE" is selected
        addonOmnibarCheckboxes.forEach((cb) => (cb.checked = true));
      } else {
        // Uncheck all matching checkboxes when "DEFENSIVE" is deselected
        addonOmnibarCheckboxes.forEach((cb) => (cb.checked = false));
      }
    } else {
      // If an individual sub-checkbox (not "DEFENSIVE") is changed
      if (clickedCheckbox.checked) {
        // If any sub-checkbox is checked, ensure "DEFENSIVE" is checked
        checkboxAddonOmniBar.checked = true;
      } else {
        // If a sub-checkbox is unchecked, check if all sub-checkboxes are now unchecked
        checkboxAddonOmniBar.checked = addonOmnibarCheckboxes.some((cb) => cb !== checkboxAddonOmniBar && cb.checked);
      }
    }
  }

  if (clickedCheckbox.value === "SETTINGS_CATEGORIES") {
    const categoryTags = document.querySelectorAll(".cardCategoryTag");
    if (checkboxSettingsCategories.checked) {
      categoryTags.forEach((tag) => tag.classList.remove("hidden"));
    } else {
      categoryTags.forEach((tag) => tag.classList.add("hidden"));
    }
  }

  if (clickedCheckbox.value === "SETTINGS_DESCRIPTIONS") {
    const cardsWithDescription = document.querySelectorAll(".cardTooltipDescription");
    const cardsWithDescriptionOriginal = document.querySelectorAll(".cardTooltipDescriptionOriginal");
    if (checkboxSettingsDescriptions.checked) {
      cardsWithDescription.forEach((tag) => tag.classList.add("hidden"));
      cardsWithDescriptionOriginal.forEach((tag) => tag.classList.remove("hidden"));
    } else {
      cardsWithDescriptionOriginal.forEach((tag) => tag.classList.add("hidden"));
      cardsWithDescription.forEach((tag) => tag.classList.remove("hidden"));
    }
  }

  setSelectedFilters();

  updateNoResultsText(getMatchingSpellsForFilters(selectedFilters).length);

  if (
    clickedCheckbox.value !== "SETTINGS_CATEGORIES" && // Do not trigger learn mode reset on settings changes
    clickedCheckbox.value !== "SETTINGS_DESCRIPTIONS" && // Do not trigger learn mode reset on settings changes
    window.location.pathname.endsWith("learn.html")
  ) {
    // Check if the user is in learn mode
    if (
      !document.getElementById("learnSection").classList.contains("hidden") &&
      document.getElementById("learnModeChoice").classList.contains("hidden")
    ) {
      resetLearnMode(); // Reset learn mode if user adjusts filters
    }
  }

  if (window.location.pathname.endsWith("spells.html")) {
    loadCardsForFilters(selectedFilters);
  }
}

function setSelectedFilters() {
  const checkboxes = document.querySelectorAll('#filterMenu input[type="checkbox"]');
  selectedFilters = []; // Reset selected filters array

  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      selectedFilters.push(checkbox.value);
    }
  });

  // Save to localStorage
  localStorage.setItem("selectedFilters", JSON.stringify(selectedFilters));
}

function loadFiltersFromLocalStorage() {
  const savedFilters = localStorage.getItem("selectedFilters");
  const checkboxes = document.querySelectorAll('#filterMenu input[type="checkbox"]');
  const checkboxSettingsCategories = document.querySelector('input[value="SETTINGS_CATEGORIES"]');
  const checkboxSettingsDescriptions = document.querySelector('input[value="SETTINGS_DESCRIPTIONS"]');

  if (savedFilters) {
    selectedFilters = JSON.parse(savedFilters);
  } else {
    // Default: All filters are selected except SETTINGS_CATEGORIES & SETTINGS_DESCRIPTIONS
    selectedFilters = Array.from(checkboxes)
      .map((checkbox) => checkbox.value)
      .filter((value) => value !== "SETTINGS_CATEGORIES" && value !== "SETTINGS_DESCRIPTIONS");
    localStorage.setItem("selectedFilters", JSON.stringify(selectedFilters)); // Save default state
  }

  // Update the UI to reflect the selected filters
  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectedFilters.includes(checkbox.value);
  });

  // Wait until DOM is loaded for categoryTags manipulation & Restore visibility of cardCategoryTag based on SETTINGS_CATEGORIES
  document.addEventListener("DOMContentLoaded", () => {
    const categoryTags = document.querySelectorAll(".cardCategoryTag");
    if (checkboxSettingsCategories.checked) {
      categoryTags.forEach((tag) => tag.classList.remove("hidden"));
    } else {
      categoryTags.forEach((tag) => tag.classList.add("hidden"));
    }

    const cardsWithDescription = document.querySelectorAll(".cardTooltipDescription");
    const cardsWithDescriptionOriginal = document.querySelectorAll(".cardTooltipDescriptionOriginal");
    if (checkboxSettingsDescriptions.checked) {
      cardsWithDescription.forEach((tag) => tag.classList.add("hidden"));
      cardsWithDescriptionOriginal.forEach((tag) => tag.classList.remove("hidden"));
    } else {
      cardsWithDescriptionOriginal.forEach((tag) => tag.classList.add("hidden"));
      cardsWithDescription.forEach((tag) => tag.classList.remove("hidden"));
    }
  });
}

//endregion

//region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ TEMPLATES ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ //

function createAndAppendClassDivider(classType, color = "#FFFFFF", destinationElement) {
  const classDividerContainer = document.querySelector(".classDividerTemplate").cloneNode(true);
  classDividerContainer.classList.remove("classDividerTemplate", "hidden");

  let classDividerNameForFileName = classType.toLowerCase();
  if (classDividerNameForFileName === "demonhunter") {
    classDividerNameForFileName = "demon-hunter";
  } else if (classDividerNameForFileName === "deathknight") {
    classDividerNameForFileName = "death-knight";
  }

  const classDividerNameForOutput = classDividerNameForFileName
    .split("-") // Split the string by hyphens
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(" "); // Join them back together with spaces

  classDividerContainer.querySelector(".classDividerName").textContent = classDividerNameForOutput;
  classDividerContainer.querySelector(".classDividerName").style.color = color;
  classDividerContainer.querySelector(".classDividerCircleOuter").style.backgroundColor = color;

  const classDividerIcon = classDividerContainer.querySelector(".classDividerCircleInner > picture");
  const classDividerIconWebpSource = classDividerIcon.querySelector("source[type='image/webp']");
  const classDividerIconJpegSource = classDividerIcon.querySelector("source[type='image/jpeg']");
  const classDividerIconImgFallback = classDividerIcon.querySelector("img");

  // Set the WebP source set
  classDividerIconWebpSource.srcset = `
    ../images/blizzard/class-icons/wow-class-icon-${classDividerNameForFileName}.webp
  `;

  // Set the JPG fallback source set
  classDividerIconJpegSource.srcset = `
   ../images/blizzard/class-icons/wow-class-icon-${classDividerNameForFileName}.jpg
  `;

  classDividerIconImgFallback.src = `
   ../images/blizzard/class-icons/wow-class-icon-${classDividerNameForFileName}.jpg
  `;

  classDividerIconImgFallback.alt = `${classDividerNameForOutput} Icon`;

  classDividerContainer.setAttribute("data-class-type", classType); // Add classType to classDivider
  destinationElement.appendChild(classDividerContainer);

  return classDividerContainer;
}

function createAndAppendCard(entry, color = "#FFFFFF", destinationElement) {
  const card = document.querySelector(".cardTemplate").cloneNode(true);
  card.classList.remove("cardTemplate", "hidden");

  card.querySelector(".cardIcon").style.borderColor = color;
  card.querySelector(".cardTooltip").style.borderColor = color;
  card.querySelector(".cardScreenshotContainer").style.borderColor = color;

  card.querySelector(".cardTooltipSpellName").textContent = entry.name;
  card.querySelector(".cardTooltipCastTime").textContent = entry.castTime;
  card.querySelector(".cardTooltipRange").textContent = entry.range;
  card.querySelector(".cardTooltipCooldown").textContent = entry.cooldown;
  card.querySelector(".cardTooltipDescription").textContent = entry.description;
  card.querySelector(".cardTooltipDescriptionOriginal").textContent = entry.descriptionOriginal;
  const cardIcon = card.querySelector(".cardIcon");
  cardIcon.src = "../images/blizzard/spell-icons/" + entry.iconName;
  cardIcon.alt = `${entry.name} icon`;

  const screenshotContainer = card.querySelector(".cardScreenshotContainer");
  const screenshotElement = card.querySelector(".cardScreenshot");

  screenshotElement.dataset.borderColor = color; // Store the color in a data attribute

  if (entry.screenshotName) {
    const baseName = entry.screenshotName.replace(/(\.[^/.]+)$/, ""); // Remove file extension
    const extension = entry.screenshotName.match(/(\.[^/.]+)$/)[0]; // Capture file extension (e.g., ".jpg")

    // Get the <picture> element and its children
    const pictureElement = card.querySelector("picture:not(.cardCategoryTag > picture)");
    const webpSource = pictureElement.querySelector("source[type='image/webp']");
    const jpegSource = pictureElement.querySelector("source[type='image/jpeg']");
    const imgFallback = pictureElement.querySelector("img");

    // Set the WebP source set
    webpSource.srcset = `
    ../images/blizzard/spell-screenshots/${baseName}-@1x.webp 1x,
    ../images/blizzard/spell-screenshots/${baseName}-@2x.webp 2x,
    ../images/blizzard/spell-screenshots/${baseName}-@3x.webp 3x,
    ../images/blizzard/spell-screenshots/${baseName}-@4x.webp 4x
  `;

    // Set the JPG fallback source set
    jpegSource.srcset = `
    ../images/blizzard/spell-screenshots/${baseName}-@1x${extension} 1x,
    ../images/blizzard/spell-screenshots/${baseName}-@2x${extension} 2x,
    ../images/blizzard/spell-screenshots/${baseName}-@3x${extension} 3x,
    ../images/blizzard/spell-screenshots/${baseName}-@4x${extension} 4x
  `;

    // Fallback src for older browsers (JPG)
    imgFallback.src = "../images/blizzard/spell-screenshots/" + `${baseName}-@1x${extension}`;

    // Ensure the alt attribute is properly set for the fallback image
    imgFallback.alt = entry.name + " screenshot" || "Screenshot"; // Use a provided alt or default text

    // Wait for the image to load, then dynamically apply the selected src for the background
    screenshotElement.onload = () => {
      // Once the foreground image is loaded, use it as the background
      const selectedImage = screenshotElement.currentSrc || screenshotElement.src; // Get the resolved image source
      screenshotContainer.style.setProperty("--setByJs", `url(${selectedImage})`);
    };

    screenshotElement.alt = `${entry.name} screenshot`;
    screenshotElement.style.display = "block";

    const spellCategoryIcon = card.querySelector(".cardCategoryTag > picture");
    const spellCategoryIconWebpSource = spellCategoryIcon.querySelector("source[type='image/webp']");
    const spellCategoryIconJpegSource = spellCategoryIcon.querySelector("source[type='image/jpeg']");
    const spellCategoryIconImgFallback = spellCategoryIcon.querySelector("img");

    let spellCategoryIconFileName;
    switch (entry.type) {
      case "aoeCC":
        spellCategoryIconFileName = "aoe-cc";
        break;
      case "counterCC":
        spellCategoryIconFileName = "counter-cc";
        break;
      case "raidDefensive":
        spellCategoryIconFileName = "defensive";
        break;
      case "externalDefensive":
        spellCategoryIconFileName = "defensive";
        break;
      default:
        spellCategoryIconFileName = entry.type; // Use the original value if no match
    }

    // Set the WebP source set
    spellCategoryIconWebpSource.srcset = `
    ../images/blizzard/spell-category-icons/wow-spell-category-icon-${spellCategoryIconFileName}.webp
  `;

    // Set the JPG fallback source set
    spellCategoryIconJpegSource.srcset = `
    ../images/blizzard/spell-category-icons/wow-spell-category-icon-${spellCategoryIconFileName}.jpg
  `;

    spellCategoryIconImgFallback.src = `
    ../images/blizzard/spell-category-icons/wow-spell-category-icon-${spellCategoryIconFileName}.jpg
  `;

    const spellCategoryText = card.querySelector(".cardCategoryTagText");

    let spellCategoryName;
    switch (spellCategoryIconFileName) {
      case "aoe-cc":
        spellCategoryName = "AoE CC";
        break;
      case "cc":
        spellCategoryName = "CC";
        break;
      case "counter-cc":
        spellCategoryName = "Counter CC";
        break;
      default:
        spellCategoryName = spellCategoryIconFileName.charAt(0).toUpperCase() + spellCategoryIconFileName.slice(1);
    }

    spellCategoryText.textContent = `${spellCategoryName}`;
    spellCategoryIconImgFallback.alt = `Spell Category ${spellCategoryName} Icon`;

    card.querySelector(".cardCategoryTag").style.borderColor = color;
    card.querySelector(".cardCategoryTag img").style.borderColor = color;
  } else {
    screenshotElement.style.display = "none";
    const placeholder = document.createElement("div");
    placeholder.className = "no-screenshot";
    placeholder.textContent = "No screenshot available";
    screenshotContainer.appendChild(placeholder);
  }

  card.setAttribute("data-class-type", entry.classType);
  card.setAttribute("data-spell-order-index", entry.spellOrderIndex);
  card.setAttribute("data-spell-id", entry.spellID);
  destinationElement.appendChild(card);
  if (window.innerWidth > 550) {
    card.querySelector(".cardScreenshotContainer").style.height =
      `${card.querySelector(".cardTooltip").offsetHeight}px`;
  }

  return card;
}

//endregion

//region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ CSS REPLACEMENT ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ //

function adjustScreenshotContainerHeight() {
  document.querySelectorAll(".card").forEach((card) => {
    const tooltip = card.querySelector(".cardTooltip");
    const screenshotContainer = card.querySelector(".cardScreenshotContainer");

    if (tooltip && screenshotContainer) {
      if (isScreenSmall) {
        // Set height to 300px for screens 550px or narrower
        screenshotContainer.style.height = "300px";
      } else {
        // Set height to match tooltip height for screens wider than 550px
        screenshotContainer.style.height = `${tooltip.offsetHeight}px`;
      }
    }
  });
}

function checkScreenWidth() {
  const currentScreenSmall = window.innerWidth <= 550;

  // Only trigger if there's a change from large to small or small to large
  if (currentScreenSmall !== isScreenSmall) {
    isScreenSmall = currentScreenSmall; // Update state
    adjustScreenshotContainerHeight(); // Adjust only on state change
  }
}

// Debounce function to limit how often checkScreenWidth runs
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function handleResizeEvent() {
  checkScreenWidth();

  // Check if the user is on the learn page and also not in learn mode
  if (
    window.location.pathname.endsWith("learn.html") &&
    !document.getElementById("learnSection").classList.contains("hidden") &&
    !document.getElementById("learnModeChoice").classList.contains("hidden")
  ) {
    footerAdjustmentOnLearnPage();
  }
}

// Add event listener to check width on resize with debounce, using a 100ms delay
window.addEventListener("resize", debounce(handleResizeEvent, 100));

//endregion

//region ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ UTILITIES ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ //

async function loadCSVData() {
  const response = await fetch("data.csv");
  const data = await response.text();

  return data.split("\n").map((row, index) => {
    const columns = [];
    let start = 0;
    let inQuotes = false;

    // Loop through each character in the row
    for (let i = 0; i <= row.length; i++) {
      const char = row[i];

      if (char === '"') {
        inQuotes = !inQuotes; // Toggle inQuotes when a quote is encountered
      } else if ((char === "," || i === row.length) && !inQuotes) {
        // If we encounter a comma (not inside quotes) or end of row, extract the value
        let value = row.slice(start, i).trim();

        // Remove surrounding quotes, if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1); // Remove the first and last quotes
        }

        columns.push(value); // Add the cleaned value to the columns array
        start = i + 1; // Move start to the character after the comma
      }
    }

    const [
      classType,
      type,
      name,
      spellID,
      omniCDDefault,
      skillCappedDefaults,
      OmniBar,
      OmniBarType,
      WeakAura,
      WeakAuraType,
      castTime,
      range,
      cooldown,
      iconName,
      screenshotName,
      description,
      descriptionOriginal,
    ] = columns;

    return {
      spellOrderIndex: index + 1,
      classType,
      type,
      name,
      spellID,
      omniCDDefault,
      skillCappedDefaults,
      OmniBar,
      OmniBarType,
      WeakAura,
      WeakAuraType,
      castTime,
      range,
      cooldown,
      iconName,
      screenshotName,
      description,
      descriptionOriginal,
    };
  });
}

// Map filters to corresponding field checks
const filterMappings = {
  // Class filters
  CLASS_DEATHKNIGHT: (spell) => spell.classType.toLowerCase() === "deathknight",
  CLASS_DEMONHUNTER: (spell) => spell.classType.toLowerCase() === "demonhunter",
  CLASS_DRUID: (spell) => spell.classType.toLowerCase() === "druid",
  CLASS_EVOKER: (spell) => spell.classType.toLowerCase() === "evoker",
  CLASS_HUNTER: (spell) => spell.classType.toLowerCase() === "hunter",
  CLASS_MAGE: (spell) => spell.classType.toLowerCase() === "mage",
  CLASS_MONK: (spell) => spell.classType.toLowerCase() === "monk",
  CLASS_PALADIN: (spell) => spell.classType.toLowerCase() === "paladin",
  CLASS_PRIEST: (spell) => spell.classType.toLowerCase() === "priest",
  CLASS_ROGUE: (spell) => spell.classType.toLowerCase() === "rogue",
  CLASS_SHAMAN: (spell) => spell.classType.toLowerCase() === "shaman",
  CLASS_WARLOCK: (spell) => spell.classType.toLowerCase() === "warlock",
  CLASS_WARRIOR: (spell) => spell.classType.toLowerCase() === "warrior",

  // Category filters
  CATEGORY_AOECC: (spell) => spell.type === "aoeCC",
  CATEGORY_CC: (spell) => spell.type === "cc",
  CATEGORY_COUNTERCC: (spell) => spell.type === "counterCC",
  CATEGORY_DEFENSIVE_SELF: (spell) => spell.type === "defensive",
  CATEGORY_DEFENSIVE_TARGET: (spell) => spell.type === "externalDefensive",
  CATEGORY_DEFENSIVE_GROUP: (spell) => spell.type === "raidDefensive",
  CATEGORY_DISARM: (spell) => spell.type === "disarm",
  CATEGORY_DISPEL: (spell) => spell.type === "dispel",
  CATEGORY_FREEDOM: (spell) => spell.type === "freedom",
  CATEGORY_HEAL: (spell) => spell.type === "heal",
  CATEGORY_IMMUNITY: (spell) => spell.type === "immunity",
  CATEGORY_INTERRUPT: (spell) => spell.type === "interrupt",
  CATEGORY_MOVEMENT: (spell) => spell.type === "movement",
  CATEGORY_OFFENSIVE: (spell) => spell.type === "offensive",

  // Addon filters
  ADDON_WEAKAURAS: (spell) => spell.WeakAura === "1",
  ADDON_OMNICD: (spell) => spell.skillCappedDefaults === "1",
  ADDON_OMNIBAR_CC: (spell) => spell.OmniBarType === "Crowd Control",
  ADDON_OMNIBAR_DEFENSIVE: (spell) => spell.OmniBarType === "Defensives",
  ADDON_OMNIBAR_INTERRUPTS: (spell) => spell.OmniBarType === "Interrupts",
};

const classColors = {
  deathknight: "#C41E3A",
  demonhunter: "#A330C9",
  druid: "#FF7C0A",
  evoker: "#33937F",
  hunter: "#AAD372",
  mage: "#3FC7EB",
  monk: "#00FF98",
  paladin: "#F48CBA",
  priest: "#FFFFFF",
  rogue: "#FFF468",
  shaman: "#0070DD",
  warlock: "#8788EE",
  warrior: "#C69B6D",
};

//endregion
