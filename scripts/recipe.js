  document.addEventListener('DOMContentLoaded', function(){
            // Header elements
            const homeBtn = document.getElementById("home-btn");
            const favoriteBtn = document.getElementById("fav-btn");

            // Home-page elements
            const homePage = document.getElementById("home-page");
            const searchInput = document.getElementById("search");
            const cuisinesSelect = document.getElementById("cuisine-sort"); // Renamed to avoid conflict
            const searchBtn = document.getElementById("search-btn");
            const recipeContainer = document.getElementById("recipe-container");

            // Favorite page elements
            const favoritePage = document.getElementById("favorite-page");
            const favContainer = document.getElementById("fav-container");

            // Recipe Modal elements
            const recipeModal = document.getElementById("recipe-modal");
            const modalInfo = document.getElementById("modal-info"); // Modal content wrapper
            const closeBtn = document.getElementById("close-btn");
            const modalRecipeInfo = document.getElementById("modal-recipe-info"); // Specific div for recipe details

            // --- Event Listeners ---
            homeBtn.addEventListener('click', () => switchTab('home'));
            favoriteBtn.addEventListener('click', () => switchTab('favorites'));
            searchBtn.addEventListener('click', recipeSearch);
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') recipeSearch();
            });
            cuisinesSelect.addEventListener('change', recipeSearch); // Trigger search on cuisine change
            closeBtn.addEventListener('click', closeModal);
            window.addEventListener('click', (e) => {
                // Close modal if user clicks outside the modal content (modalInfo)
                if (e.target === recipeModal) closeModal();
            });

            // --- Initial load ---
            // On initial load, display some default recipes
            recipeSearch();
            // Load favorites, but only show them if the favorites tab is active
            loadFavorites(); // Called here so initial state of favorite cards is correct.

            // --- Functions ---

            /**
             * Switches between Home and Favorites tabs.
             * @param {string} tabName - 'home' or 'favorites'
             */
            function switchTab(tabName) {
                // Remove 'active' class from all page sections and buttons
                homePage.classList.remove('active');
                favoritePage.classList.remove('active');
                homeBtn.classList.remove('active');
                favoriteBtn.classList.remove('active');

                // Add 'active' class to the selected tab and its button
                if (tabName === 'home') {
                    homePage.classList.add('active');
                    homeBtn.classList.add('active');
                    // Re-run search if coming back to home from favorites, to refresh current view
                    // (optional, depends on desired UX; current implementation runs on initial load)
                    // recipeSearch();
                } else {
                    favoritePage.classList.add('active');
                    favoriteBtn.classList.add('active');
                    loadFavorites(); // Ensure favorites are reloaded when switching to favorites tab
                }
            }

            /**
             * Fetches recipes from TheMealDB API based on search input or cuisine filter.
             */
            async function recipeSearch() {
                const findRecipe = searchInput.value.trim();
                const selectedCuisine = cuisinesSelect.value;
                let url;

                // Clear previous search results and show loading message
                recipeContainer.innerHTML = '<p class="empty-message">Searching for recipes...</p>';

                if (selectedCuisine) {
                    // Filter by area (cuisine)
                    url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${selectedCuisine}`;
                } else if (findRecipe) {
                    // Search by name
                    url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${findRecipe}`;
                } else {
                    // Default: show popular recipes (e.g., recipes starting with 'a')
                    url = 'https://www.themealdb.com/api/json/v1/1/search.php?s=a';
                }

                try {
                    const response = await fetch(url);
                    const data = await response.json();
                    displayRecipes(data.meals); // Pass the meals array (can be null if no results)
                } catch (error) {
                    console.error('Error fetching recipes:', error);
                    recipeContainer.innerHTML = '<p class="empty-message">Error loading recipes. Please check your internet connection or try again later.</p>';
                }
            }

            /**
             * Displays recipe cards in the specified container.
             * @param {Array<Object>} meals - An array of meal objects from the API.
             */
            function displayRecipes(meals) {
                recipeContainer.innerHTML = ''; // Clear existing content

                if (!meals || meals.length === 0) {
                    recipeContainer.innerHTML = '<p class="empty-message">No recipes found. Try a different search or filter.</p>';
                    return;
                }

                meals.forEach(meal => {
                    const isFavorite = checkIfFavorite(meal.idMeal);
                    const recipeCard = createRecipeCard(meal, isFavorite);
                    recipeContainer.appendChild(recipeCard);
                });
            }

            /**
             * Creates a single recipe card HTML element.
             * @param {Object} meal - The meal object from the API.
             * @param {boolean} isFavorite - True if the recipe is in favorites, false otherwise.
             * @returns {HTMLElement} The created recipe card div element.
             */
            function createRecipeCard(meal, isFavorite) {
                const card = document.createElement('div');
                card.className = 'recipe-card';

                card.innerHTML = `
                    <img src="${meal.strMealThumb}"
                         alt="${meal.strMeal}"
                         class="recipe-image"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://placehold.co/220x220/E0E0E0/888888?text=No+Image';">
                    <div class="recipe-info">
                        <h3>${meal.strMeal}</h3>
                        <p>${meal.strArea || 'Unknown Area'} • ${meal.strCategory || 'Unknown Category'}</p>
                        <div class="recipe-action">
                            <button class="view-btn" data-id="${meal.idMeal}">View Recipe</button>
                            <button class="like-btn" data-id="${meal.idMeal}">
                                ${isFavorite ? '❤️ Remove' : '♡ Save'}
                            </button>
                        </div>
                    </div>
                `;

                // Add event listeners directly to the buttons within this card
                card.querySelector('.view-btn').addEventListener('click', () => viewRecipeDetails(meal.idMeal));
                card.querySelector('.like-btn').addEventListener('click', (e) => toggleFavorite(e, meal));

                return card;
            }

            /**
             * Fetches and displays detailed information for a specific recipe in a modal.
             * @param {string} recipeId - The ID of the recipe to display.
             */
            async function viewRecipeDetails(recipeId) {
                // Clear previous modal content and show loading message
                modalRecipeInfo.innerHTML = '<p class="empty-message">Loading recipe details...</p>';
                recipeModal.style.display = 'flex'; // Show modal

                try {
                    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipeId}`);
                    const data = await response.json();
                    const meal = data.meals[0]; // Get the first (and only) meal object

                    if (!meal) {
                        modalRecipeInfo.innerHTML = '<p class="empty-message">Recipe details not found.</p>';
                        return;
                    }

                    // Build ingredients list
                    let ingredientsHtml = '';
                    for (let i = 1; i <= 20; i++) {
                        const ingredient = meal[`strIngredient${i}`];
                        const measure = meal[`strMeasure${i}`];
                        if (ingredient && ingredient.trim() !== '') {
                            ingredientsHtml += `<li>${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}</li>`;
                        }
                    }

                    const isFavorite = checkIfFavorite(recipeId);

                    // Populate the modal with recipe information
                    modalRecipeInfo.innerHTML = `
                        <h2>${meal.strMeal}</h2>
                        <div class="recipe-data">
                            <span>Cuisine: ${meal.strArea || 'N/A'}</span>
                            <span>Category: ${meal.strCategory || 'N/A'}</span>
                        </div>
                        <img src="${meal.strMealThumb}"
                             alt="${meal.strMeal}"
                             class="detail-image"
                             onerror="this.onerror=null; this.src='https://placehold.co/450x450/E0E0E0/888888?text=No+Image';">
                        <button class="favourite-btn" data-id="${recipeId}">
                            ${isFavorite ? '❤️ Remove from Favorites' : '♡ Add to Favorites'}
                        </button>

                        <div class="ingredients-section">
                            <h3>Ingredients</h3>
                            ${ingredientsHtml ? `<ul>${ingredientsHtml}</ul>` : '<p>No ingredients listed.</p>'}
                        </div>

                        <div class="instructions-section">
                            <h3>Instructions</h3>
                            <p>${meal.strInstructions || 'No instructions available.'}</p>
                        </div>

                        ${meal.strYoutube ? `
                        <div class="video-section">
                            <h3>Video Tutorial</h3>
                            <a href="${meal.strYoutube}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
                        </div>
                        ` : ''}
                    `;

                    // Add event listener to the favorite button inside the modal
                    modalRecipeInfo.querySelector('.favourite-btn').addEventListener('click', (e) => {
                        // Pass the entire meal object to toggleFavorite as it needs name, thumb, etc.
                        toggleFavorite(e, meal);
                        // Update the button text immediately after toggling favorite status
                        e.target.textContent = checkIfFavorite(recipeId) ? '❤️ Remove from Favorites' : '♡ Add to Favorites';
                        // If we are on the favorites page, reload it to reflect changes
                        if (favoritePage.classList.contains('active')) {
                            loadFavorites();
                        }
                    });

                } catch (error) {
                    console.error('Error fetching recipe details:', error);
                    modalRecipeInfo.innerHTML = '<p class="empty-message">Error loading recipe details. Please try again.</p>';
                }
            }

            /**
             * Toggles the favorite status of a recipe in localStorage.
             * Updates the UI of the clicked button (card or modal).
             * @param {Event} event - The click event object.
             * @param {Object} meal - The meal object to add/remove from favorites.
             */
            function toggleFavorite(event, meal) {
                event.stopPropagation(); // Prevent modal from closing if this is on a card in the main view
                const recipeId = meal.idMeal;
                let favorites = JSON.parse(localStorage.getItem('recipeFavorites')) || [];

                const index = favorites.findIndex(fav => fav.idMeal === recipeId);

                if (index === -1) {
                    // Add to favorites
                    favorites.push(meal);
                    event.target.textContent = '❤️ Remove'; // Update card button text
                    // If in modal, update modal button text
                    const modalFavBtn = modalRecipeInfo.querySelector('.favourite-btn');
                    if (modalFavBtn) modalFavBtn.textContent = '❤️ Remove from Favorites';
                } else {
                    // Remove from favorites
                    favorites.splice(index, 1);
                    event.target.textContent = '♡ Save'; // Update card button text
                    // If in modal, update modal button text
                    const modalFavBtn = modalRecipeInfo.querySelector('.favourite-btn');
                    if (modalFavBtn) modalFavBtn.textContent = '♡ Add to Favorites';
                }

                localStorage.setItem('recipeFavorites', JSON.stringify(favorites));

                // If currently on the favorites page, refresh the list to reflect changes
                if (favoritePage.classList.contains('active')) {
                    loadFavorites();
                }
                // If on home page, update the specific card's button text to reflect change
                // This is already handled by event.target.textContent above.
            }

            /**
             * Checks if a recipe is currently in the favorites list.
             * @param {string} recipeId - The ID of the recipe to check.
             * @returns {boolean} True if the recipe is a favorite, false otherwise.
             */
            function checkIfFavorite(recipeId) {
                const favorites = JSON.parse(localStorage.getItem('recipeFavorites')) || [];
                return favorites.some(fav => fav.idMeal === recipeId);
            }

            /**
             * Loads and displays favorite recipes from localStorage.
             */
            function loadFavorites() {
                const favorites = JSON.parse(localStorage.getItem('recipeFavorites')) || [];

                favContainer.innerHTML = ''; // Clear existing content

                if (favorites.length === 0) {
                    favContainer.innerHTML = '<p class="empty-message">You haven\'t saved any favorites yet. Go to the Home tab to find and save some!</p>';
                    return;
                }

                favorites.forEach(meal => {
                    // All favorites are, by definition, favorites when loading this page
                    const recipeCard = createRecipeCard(meal, true);
                    favContainer.appendChild(recipeCard);
                });
            }

            /**
             * Closes the recipe detail modal.
             */
            function closeModal() {
                recipeModal.style.display = 'none';
            }
        });
