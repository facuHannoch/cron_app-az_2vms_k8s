import mongoose from 'mongoose';
import http from 'http';
import { URL } from 'url';

const INTERVAL_DURATION = 2; // seconds

if (process.env.NODE_ENV !== 'test') {
  // ---- MongoDB Connection ----
  mongoose.connect(`mongodb://${process.env.DB_URL}/timerdb`, {})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// ---- Schema and Model ----
const projectSchema = new mongoose.Schema({
  project_name: { type: String, unique: true, required: true },
  elapsed_time: { type: Number, default: 0 },
  times_called: { type: Number, default: 0 },
  times_per_day: { type: Array, default: [] },
  last_time: { type: Date, default: Date.now },
  readable_time: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 }
  }
});

const Project = mongoose.model('Project', projectSchema);

// ---- Global Timer Storage ----
let activeTimers = {};

// ---- Utility Functions ----

/**
 * Returns today's date in YYYY-MM-DD format.
 */
function getCurrentDay() {
  return new Date().toISOString().split('T')[0];
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
 * Finds a project by name in the DB.
 * If not found and createIfNotExists is true, creates a new project document.
 */
async function getProject(projectName, createIfNotExists = false) {
  let project = await Project.findOne({ project_name: projectName });
  if (!project && createIfNotExists) {
    project = new Project({
      project_name: projectName,
      elapsed_time: 0,
      times_called: 0,
      times_per_day: [],
      last_time: new Date(),
      readable_time: formatTime(0)
    });
    await project.save();
  }
  return project;
}

/**
 * Updates the project's time (both total and for today) and saves it to the DB.
 */
async function updateProjectTime(project, seconds) {
  project.elapsed_time += seconds;
  project.last_time = new Date();
  project.readable_time = formatTime(project.elapsed_time);

  const today = getCurrentDay();
  // Look for an existing entry for today
  let dayEntry = project.times_per_day.find(entry => entry[today] !== undefined);
  if (dayEntry) {
    dayEntry[today] += seconds;
  } else {
    project.times_per_day.push({ [today]: seconds });
  }
  await project.save();
}

// ---- Chronometer Functions ----

/**
 * Starts the timer for a given project.
 */
async function startTimer(projectName) {
  let project = await getProject(projectName, true);
  project.times_called += 1;
  await project.save();

  if (activeTimers[projectName]) {
    console.log(`Timer already running for ${projectName}`);
    return;
  }

  console.log(`Timer started for project: ${projectName} at ${new Date().toTimeString()}`);
  const timer = setInterval(async () => {
    let project = await getProject(projectName, true);
    await updateProjectTime(project, INTERVAL_DURATION);
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
async function editTime(projectName, minutes) {
  let project = await getProject(projectName, true);
  const seconds = minutes * 60;
  await updateProjectTime(project, seconds);
  console.log(`Edited time for ${projectName}:`, project.readable_time);
}

/**
 * Lists all projects and their total elapsed times.
 */
async function listProjects() {
  const projects = await Project.find().sort({ project_name: 1 });
  projects.forEach(project => {
    console.log(`${project.project_name}:`, project.readable_time);
  });
}

/**
 * Lists today's time entries for each project along with a total.
 */
async function listTodayTimes() {
  const projects = await Project.find();
  const today = getCurrentDay();
  let totalSeconds = 0;
  projects.forEach(project => {
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

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;
  const query = urlObj.searchParams;

  if (pathname === '/start') {
    const projectName = query.get('project');
    if (projectName) {
      await startTimer(projectName);
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
      await editTime(projectName, minutes);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Edited time for project: ${projectName}\n`);
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end("Missing 'project' or 'minutes' parameter\n");
    }
  } else if (pathname === '/list') {
    await listProjects();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Listed all projects in console.\n");
  } else if (pathname === '/list-today') {
    await listTodayTimes();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Listed today's times in console.\n");
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end("Not found\n");
  }
});

const PORT = process.env.PORT || 8082;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down...');
  Object.keys(activeTimers).forEach(proj => clearInterval(activeTimers[proj]));
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed.');
      process.exit();
    });
  });
});


export default server;