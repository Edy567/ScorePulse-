require('dotenv').config();
const axios = require('axios');

const TARGET_COMPETITIONS = {
  PL: {
    code: 'PL',
    name: 'Premier League',
    country: 'Anglia',
    flag: '🇬🇧',
    badge: 'https://crests.football-data.org/PL.png'
  },
  PD: {
    code: 'PD',
    name: 'La Liga',
    country: 'Spania',
    flag: '🇪🇸',
    badge: 'https://crests.football-data.org/laliga.png'
  },
  SA: {
    code: 'SA',
    name: 'Serie A',
    country: 'Italia',
    flag: '🇮🇹',
    badge: 'https://crests.football-data.org/SA.png'
  },
  BL1: {
    code: 'BL1',
    name: 'Bundesliga',
    country: 'Germania',
    flag: '🇩🇪',
    badge: 'https://crests.football-data.org/BL1.png'
  },
  CL: {
    code: 'CL',
    name: 'UEFA Champions League',
    country: 'Europa',
    flag: '⭐',
    badge: 'https://crests.football-data.org/CL.png'
  },
  EL: {
    code: 'EL',
    name: 'UEFA Europa League',
    country: 'Europa',
    flag: '🟠',
    badge: 'https://crests.football-data.org/EL.png'
  }
};

const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;
const SCHEDULED_CACHE_TTL_MS = 10 * 60 * 1000;

function formatTimeFromUtc(utcString) {
  try {
    const d = new Date(utcString);
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatDateFromUtc(utcString) {
  try {
    const d = new Date(utcString);
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

async function getEuropaLeagueMatchesFromEspn(dateString) {
  try {
    const yyyymmdd = dateString ? dateString.replace(/-/g, '') : '';
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard${yyyymmdd ? '?dates=' + yyyymmdd : ''}`;
    const res = await axios.get(url, { timeout: 6000 });
    const events = res.data.events || [];

    return events.map(ev => {
      const comp = ev.competitions?.[0] || {};
      const competitors = comp.competitors || [];
      const home = competitors.find(c => c.homeAway === 'home') || competitors[0] || {};
      const away = competitors.find(c => c.homeAway === 'away') || competitors[1] || {};

      const statusType = ev.status?.type || {};
      let status = 'SCHEDULED';
      if (statusType.completed) {
        status = 'FINISHED';
      } else if (statusType.state === 'in') {
        status = 'IN_PLAY';
      }

      return {
        id: `el-${ev.id}`,
        competition: TARGET_COMPETITIONS.EL,
        utcDate: ev.date,
        dateFormatted: formatDateFromUtc(ev.date),
        time: formatTimeFromUtc(ev.date),
        status: status,
        minute: status === 'IN_PLAY' ? (statusType.shortDetail || statusType.detail || '') : null,
        homeTeam: {
          id: home.team?.id,
          name: home.team?.displayName || 'Gazde',
          shortName: home.team?.shortDisplayName || home.team?.name || home.team?.displayName,
          tla: (home.team?.abbreviation || home.team?.displayName?.substring(0, 3) || 'HOM').toUpperCase(),
          crest: home.team?.logo || 'https://crests.football-data.org/EL.png'
        },
        awayTeam: {
          id: away.team?.id,
          name: away.team?.displayName || 'Oaspeți',
          shortName: away.team?.shortDisplayName || away.team?.name || away.team?.displayName,
          tla: (away.team?.abbreviation || away.team?.displayName?.substring(0, 3) || 'AWA').toUpperCase(),
          crest: away.team?.logo || 'https://crests.football-data.org/EL.png'
        },
        score: {
          fullTime: {
            home: home.score !== undefined && home.score !== '' ? parseInt(home.score, 10) : null,
            away: away.score !== undefined && away.score !== '' ? parseInt(away.score, 10) : null
          }
        }
      };
    });
  } catch (err) {
    return [];
  }
}

async function getMatches(dateString) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY ? process.env.FOOTBALL_DATA_API_KEY.trim() : '';
  const cacheKey = `matches_${dateString}_${apiKey ? 'live' : 'demo'}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let allMatches = [];

  const europaMatches = await getEuropaLeagueMatchesFromEspn(dateString);
  allMatches.push(...europaMatches);

  if (apiKey) {
    try {
      const curDate = new Date(dateString);
      const nextDate = new Date(curDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateString = nextDate.toISOString().split('T')[0];

      const response = await axios.get('https://api.football-data.org/v4/matches', {
        params: {
          dateFrom: dateString,
          dateTo: nextDateString
        },
        headers: {
          'X-Auth-Token': apiKey
        },
        timeout: 8000
      });

      const apiMatches = response.data.matches || [];

      const targetMatches = apiMatches.filter(m => {
        const code = m.competition?.code;
        const matchDay = m.utcDate ? m.utcDate.split('T')[0] : '';
        const isTarget = ['PL', 'PD', 'SA', 'BL1', 'CL'].includes(code);
        return isTarget && (matchDay === dateString);
      });

      const formatted = targetMatches.map(m => {
        const comp = TARGET_COMPETITIONS[m.competition.code] || {
          code: m.competition.code,
          name: m.competition.name,
          flag: '⚽',
          badge: m.competition.emblem
        };

        return {
          id: m.id,
          competition: comp,
          utcDate: m.utcDate,
          dateFormatted: formatDateFromUtc(m.utcDate),
          time: formatTimeFromUtc(m.utcDate),
          status: m.status,
          minute: m.minute || null,
          homeTeam: {
            id: m.homeTeam.id,
            name: m.homeTeam.name,
            shortName: m.homeTeam.shortName || m.homeTeam.name,
            tla: m.homeTeam.tla || m.homeTeam.name.substring(0, 3).toUpperCase(),
            crest: m.homeTeam.crest
          },
          awayTeam: {
            id: m.awayTeam.id,
            name: m.awayTeam.name,
            shortName: m.awayTeam.shortName || m.awayTeam.name,
            tla: m.awayTeam.tla || m.awayTeam.name.substring(0, 3).toUpperCase(),
            crest: m.awayTeam.crest
          },
          score: {
            fullTime: {
              home: m.score?.fullTime?.home,
              away: m.score?.fullTime?.away
            }
          }
        };
      });

      allMatches.push(...formatted);
    } catch (err) {}
  }

  allMatches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

  const result = {
    matches: allMatches,
    competitions: TARGET_COMPETITIONS,
    date: dateString
  };

  cache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

async function getScheduledCompetitionMatches(leagueCode) {
  const cacheKey = `scheduled_${leagueCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SCHEDULED_CACHE_TTL_MS) {
    return cached.data;
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY ? process.env.FOOTBALL_DATA_API_KEY.trim() : '';
  if (!apiKey) return [];

  try {
    const res = await axios.get(`https://api.football-data.org/v4/competitions/${leagueCode}/matches?status=SCHEDULED,TIMED`, {
      headers: { 'X-Auth-Token': apiKey },
      timeout: 8000
    });
    const matches = res.data.matches || [];
    cache.set(cacheKey, { timestamp: Date.now(), data: matches });
    return matches;
  } catch (err) {
    return [];
  }
}

async function getNextEuropaLeagueDate(fromDateStr) {
  const cacheKey = `next_el_${fromDateStr}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SCHEDULED_CACHE_TTL_MS) {
    return cached.data;
  }

  const fromDate = new Date(fromDateStr);
  let d = new Date(fromDate);
  for (let i = 0; i < 40; i++) {
    d.setDate(d.getDate() + 1);
    if (d.getUTCDay() === 4) {
      const yyyymmdd = d.toISOString().split('T')[0].replace(/-/g, '');
      try {
        const res = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard?dates=${yyyymmdd}`, { timeout: 4000 });
        if (res.data.events && res.data.events.length > 0) {
          const found = d.toISOString().split('T')[0];
          cache.set(cacheKey, { timestamp: Date.now(), data: found });
          return found;
        }
      } catch (e) {}
    }
  }
  return null;
}

async function getNextDateWithMatches(leagueCode = 'all', fromDateStr = '') {
  const fromDate = fromDateStr || new Date().toISOString().split('T')[0];

  if (leagueCode === 'EL') {
    return await getNextEuropaLeagueDate(fromDate);
  }

  if (leagueCode && leagueCode !== 'all') {
    const matches = await getScheduledCompetitionMatches(leagueCode);
    const future = matches.filter(m => (m.utcDate ? m.utcDate.split('T')[0] : '') >= fromDate);
    return future.length > 0 ? future[0].utcDate.split('T')[0] : null;
  }

  const codes = ['PL', 'PD', 'SA', 'BL1', 'CL'];
  const dates = [];

  for (const c of codes) {
    const list = await getScheduledCompetitionMatches(c);
    const future = list.filter(m => (m.utcDate ? m.utcDate.split('T')[0] : '') >= fromDate);
    if (future.length > 0) {
      dates.push(future[0].utcDate.split('T')[0]);
    }
  }

  const elDate = await getNextEuropaLeagueDate(fromDate);
  if (elDate) {
    dates.push(elDate);
  }

  dates.sort();
  return dates[0] || null;
}

module.exports = {
  getMatches,
  getNextDateWithMatches,
  TARGET_COMPETITIONS
};
