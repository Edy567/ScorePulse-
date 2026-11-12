require('dotenv').config();
const express = require('express');
const path = require('path');
const { 
  getMatches, 
  getNextDateWithMatches, 
  TARGET_COMPETITIONS 
} = require('./services/footballApi');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

app.get('/', async (req, res) => {
  try {
    const selectedDate = req.query.date || getTodayString();
    const activeLeague = req.query.league || 'all';

    const data = await getMatches(selectedDate);
    let matches = data.matches || [];

    if (activeLeague !== 'all') {
      matches = matches.filter(
        m => m.competition && m.competition.code && m.competition.code.toUpperCase() === activeLeague.toUpperCase()
      );
    }

    let nextMatchDate = null;
    let nextMatchDateDisplay = null;
    if (matches.length === 0) {
      nextMatchDate = await getNextDateWithMatches(activeLeague, selectedDate);
      nextMatchDateDisplay = formatDisplayDate(nextMatchDate);
    }

    const groupedMatches = {};
    matches.forEach(m => {
      const compName = m.competition?.name || 'Alte Meciuri';
      if (!groupedMatches[compName]) {
        groupedMatches[compName] = {
          competition: m.competition || { name: compName, flag: '⚽' },
          list: []
        };
      }
      groupedMatches[compName].list.push(m);
    });

    const currentDateObj = new Date(selectedDate);
    const prevDateObj = new Date(currentDateObj);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDate = prevDateObj.toISOString().split('T')[0];

    const nextDateObj = new Date(currentDateObj);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toISOString().split('T')[0];

    res.render('index', {
      groupedMatches,
      matchesCount: matches.length,
      totalCount: matches.length,
      nextMatchDate,
      nextMatchDateDisplay,
      competitions: TARGET_COMPETITIONS,
      activeLeague,
      selectedDate,
      displayDate: formatDisplayDate(selectedDate),
      todayDate: getTodayString(),
      prevDate,
      nextDate
    });
  } catch (error) {
    res.status(500).render('index', {
      groupedMatches: {},
      matchesCount: 0,
      totalCount: 0,
      nextMatchDate: null,
      nextMatchDateDisplay: null,
      competitions: TARGET_COMPETITIONS,
      activeLeague: 'all',
      selectedDate: getTodayString(),
      displayDate: '',
      todayDate: getTodayString(),
      prevDate: '',
      nextDate: ''
    });
  }
});

app.get('/api/matches', async (req, res) => {
  const selectedDate = req.query.date || getTodayString();
  const data = await getMatches(selectedDate);
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`ScorePulse ruleaza pe: http://localhost:${PORT}`);
});
