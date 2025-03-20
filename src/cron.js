import fs from 'fs';
import http from 'http';
import { URL } from 'url';

const TIMES_PATH = './times.json';
const INTERVAL_DURATION = 2; // seconds

// Global object to store active timers by project name
let activeTimers = {};

// ---- Utility Functions ----

/**
 * Returns today's date in YYYY-MM-DD format.
 */
function getCurrentDay() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Reads and parses the JSON file that stores project times.
 * If the file does not exist, creates one with an empty array.
 */
function loadData() {
  try {
    if (!fs.existsSync(TIMES_PATH)) {
      fs.writeFileSync(TIMES_PATH, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(TIMES_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error loading data:", err);
    return [];
  }
}

/**
 * Saves the given data array to the JSON file.
 */
function saveData(data) {
  try {
    fs.writeFileSync(TIMES_PATH, JSON.stringify(data, null, 4));
  } catch (err) {
    console.error("Error saving data:", err);
  }
}

/**
 * Formats seconds into an object with hours, minutes, and seconds.
 */
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

/**
 * Finds a project by name in the data array.
 * If not found and createIfNotExists is true, creates a new project entry.
 */
function getProject(data, projectName, createIfNotExists = false) {
  let project = data.find(p => p.project_name === projectName);
  if (!project && createIfNotExists) {
    project = {
      project_name: projectName,
      elapsed_time: 0,
      times_called: 0,
      times_per_day: [],
      last_time: new Date().toISOString(),
      readable_time: formatTime(0)
    };
    data.push(project);
    saveData(data);
  }
  return project;
}

/**
 * Updates the project's time (both total and for today).
 */
function updateProjectTime(project, seconds) {
  project.elapsed_time += seconds;
  project.last_time = new Date().toISOString();
  project.readable_time = formatTime(project.elapsed_time);

  // Update today's entry
  const today = getCurrentDay();
  let dayEntry = project.times_per_day.find(entry => entry[today] !== undefined);
  if (dayEntry) {
    dayEntry[today] += seconds;
  } else {
    project.times_per_day.push({ [today]: seconds });
  }
}

// ---- Chronometer Functions ----

/**
 * Starts the timer for a given project.
 * If a timer is already running for that project, it won't start another.
 */
function startTimer(projectName) {
  let data = loadData();
  let project = getProject(data, projectName, true);
  project.times_called += 1;
  saveData(data);

  if (activeTimers[projectName]) {
    console.log(`Timer already running for ${projectName}`);
    return;
  }

  console.log(`Timer started for project: ${projectName} at ${new Date().toTimeString()}`);
  const timer = setInterval(() => {
    let data = loadData();
    let project = getProject(data, projectName, true);
    updateProjectTime(project, INTERVAL_DURATION);
    const index = data.findIndex(p => p.project_name === projectName);
    if (index !== -1) {
      data[index] = project;
      saveData(data);
    }
    console.log(`Updated time for ${projectName}:`, project.readable_time);
  }, INTERVAL_DURATION * 1000);

  activeTimers[projectName] = timer;
}

/**
 * Stops the timer for a given project.
 */
function stopTimer(projectName) {
  if (activeTimers[projectName]) {
    clearInterval(activeTimers[projectName]);
    delete activeTimers[projectName];
    console.log(`Timer stopped for project: ${projectName} at ${new Date().toTimeString()}`);
    return true;
  }
  return false;
}

/**
 * Edits a project's time by adding or subtracting minutes.
 */
function editTime(projectName, minutes) {
  const data = loadData();
  let project = getProject(data, projectName, true);
  const seconds = minutes * 60;
  updateProjectTime(project, seconds);
  const index = data.findIndex(p => p.project_name === projectName);
  if (index !== -1) {
    data[index] = project;
    saveData(data);
  }
  console.log(`Edited time for ${projectName}:`, project.readable_time);
}

/**
 * Lists all projects and their total elapsed times.
 */
function listProjects() {
  const data = loadData();
  data.sort((a, b) => a.project_name.localeCompare(b.project_name));
  data.forEach(project => {
    console.log(`${project.project_name}:`, project.readable_time);
  });
}

/**
 * Lists today's time entries for each project along with a total.
 */
function listTodayTimes() {
  const data = loadData();
  const today = getCurrentDay();
  let totalSeconds = 0;
  data.forEach(project => {
    const dayEntry = project.times_per_day.find(entry => entry[today] !== undefined);
    if (dayEntry) {
      const seconds = dayEntry[today];
      totalSeconds += seconds;
      console.log(`${project.project_name}:`, formatTime(seconds));
    }
  });
  console.log("Total time today:", formatTime(totalSeconds));
}

// ---- HTTP Server Setup ----

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;
  const query = urlObj.searchParams;

  if (pathname === '/start') {
    const projectName = query.get('project');
    if (projectName) {
      startTimer(projectName);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Started timer for project: ${projectName}\n`);
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end("Missing 'project' parameter\n");
    }
  } else if (pathname === '/stop') {
    const projectName = query.get('project');
    if (projectName) {
      if (stopTimer(projectName)) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`Stopped timer for project: ${projectName}\n`);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`No active timer found for project: ${projectName}\n`);
      }
    } else {
      // If no project is specified, stop all timers.
      Object.keys(activeTimers).forEach(proj => clearInterval(activeTimers[proj]));
      activeTimers = {};
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end("Stopped all timers.\n");
    }
  } else if (pathname === '/edit') {
    const projectName = query.get('project');
    const minutes = parseInt(query.get('minutes'), 10);
    if (projectName && !isNaN(minutes)) {
      editTime(projectName, minutes);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Edited time for project: ${projectName}\n`);
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end("Missing 'project' or 'minutes' parameter\n");
    }
  } else if (pathname === '/list') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    listProjects();
    res.end("Listed all projects in console.\n");
  } else if (pathname === '/list-today') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    listTodayTimes();
    res.end("Listed today's times in console.\n");
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end("Not found\n");
  }
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down...');
  Object.keys(activeTimers).forEach(proj => clearInterval(activeTimers[proj]));
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit();
  });
});
