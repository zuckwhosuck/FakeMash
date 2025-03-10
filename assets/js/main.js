let currentUsers = [];
let rankings = [];
let prefetchQueue = [];

// Fetch one random user
async function fetchUser() {
  try {
    const response = await fetch('https://randomuser.me/api/');
    const data = await response.json();
    return data.results[0];
  } catch (error) {
    console.error('Error fetching user:', error);
  }
}

// Prefetch a set number of users to speed up replacement
async function prefetchUsers(count = 5) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(fetchUser());
  }
  const users = await Promise.all(promises);
  prefetchQueue.push(...users);
}

// Load two users and prefetch extra users
async function loadUsers() {
  currentUsers = await Promise.all([fetchUser(), fetchUser()]);
  displayUsers();
  // Start prefetching additional users in the background
  prefetchUsers();
}

// Display the two users for comparison
function displayUsers() {
  const container = document.getElementById('imagesContainer');
  container.innerHTML = '';

  currentUsers.forEach((user, index) => {
    const card = document.createElement('div');
    card.className = 'image-card';

    card.innerHTML = `
      <img src="${user.picture.large}" alt="${user.name.first} ${user.name.last}">
      <div class="image-info">
        <p>${user.name.first} ${user.name.last}</p>
        <p>${user.location.country}</p>
        <button class="vote-btn" onclick="voteForUser(${index})">Vote</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Handle vote: update ranking and replace the losing user immediately
async function voteForUser(index) {
  const votedUser = currentUsers[index];
  // Determine the losing user index (the one not voted for)
  const losingIndex = index === 0 ? 1 : 0;

  // Update ranking for the voted user
  let rankingUser = rankings.find(
    user => user.name === `${votedUser.name.first} ${votedUser.name.last}`
  );
  if (rankingUser) {
    rankingUser.votes += 1;
    rankingUser.totalMatches += 1;
  } else {
    rankings.push({
      name: `${votedUser.name.first} ${votedUser.name.last}`,
      picture: votedUser.picture.large,
      country: votedUser.location.country,
      votes: 1,
      totalMatches: 1
    });
  }

  // Also update total matches for the losing user if present in rankings
  const losingUser = currentUsers[losingIndex];
  let losingRanking = rankings.find(
    user => user.name === `${losingUser.name.first} ${losingUser.name.last}`
  );
  if (losingRanking) {
    losingRanking.totalMatches += 1;
  }

  // Replace the losing user using a prefetched user if available
  let newUser;
  if (prefetchQueue.length > 0) {
    newUser = prefetchQueue.shift();
    // Replenish the queue asynchronously
    fetchUser().then(user => prefetchQueue.push(user));
  } else {
    newUser = await fetchUser();
  }
  currentUsers[losingIndex] = newUser;
  displayUsers();
  updateStats();
}

// Update the ranking display with win rate
function updateStats() {
  const statsList = document.getElementById('statsList');
  statsList.innerHTML = '';

  // Sort by win rate (votes/totalMatches)
  rankings.sort((a, b) => (b.votes / b.totalMatches) - (a.votes / a.totalMatches));

  rankings.forEach(user => {
    const winRate = (user.votes / user.totalMatches * 100).toFixed(1);
    const item = document.createElement('li');
    item.className = 'stats-item';
    item.innerHTML = `
      <img src="${user.picture}" alt="${user.name}">
      <div>
        <p>${user.name} - ${user.country}</p>
        <p>Votes: ${user.votes} | Win Rate: ${winRate}%</p>
      </div>
    `;
    statsList.appendChild(item);
  });
}

// Toggle Dark Mode
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const btn = document.getElementById('darkModeToggle');
  btn.innerHTML = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
}

// Load initial users when DOM is ready
document.addEventListener('DOMContentLoaded', loadUsers);
