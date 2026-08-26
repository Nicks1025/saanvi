/**
 * Helper to parse a date string into a status ('UPCOMING', 'CLOSED', 'ACTIVE')
 * @param {string} dateStr - The date string from the source (e.g. "28-1 September", "24-27 August", "2026")
 * @returns {string} The computed status
 */
const parseDatesToStatus = (dateStr) => {
  if (dateStr === 'TBA' || /^\d{4}$/.test(dateStr)) {
    return { status: 'UPCOMING', formattedDates: dateStr };
  }
  
  const match = dateStr.match(/(\d+)\s*-\s*(\d+)\s*([A-Za-z]+)/);
  if (match) {
    const startDay = parseInt(match[1]);
    const endDay = parseInt(match[2]);
    const monthStr = match[3];
    const monthMap = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const month = monthMap[monthStr.toLowerCase().substring(0, 3)];
    
    if (month !== undefined) {
      let year = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      // Smart year heuristic: only wrap if we are near the year boundary
      // If we are in Jan/Feb (<=1) and we see Nov/Dec (>=10), it's the previous year.
      if (currentMonth <= 1 && month >= 10) year--;
      // If we are in Nov/Dec (>=10) and we see Jan/Feb (<=1), it's the next year.
      else if (currentMonth >= 10 && month <= 1) year++;
      
      const endMonth = month;
      const startMonth = startDay > endDay ? (month - 1 + 12) % 12 : month;
      let startYear = year;
      if (startMonth > endMonth) startYear--;

      const startDate = new Date(startYear, startMonth, startDay);
      const endDate = new Date(year, endMonth, endDay);
      // IPOs typically close at 5:00 PM IST on the final day of bidding
      endDate.setHours(17, 0, 0, 0);
      
      const formatNum = (num) => String(num).padStart(2, '0');
      const startStr = `${formatNum(startDay)}/${formatNum(startMonth + 1)}/${String(startYear).slice(-2)}`;
      const endStr = `${formatNum(endDay)}/${formatNum(endMonth + 1)}/${String(year).slice(-2)}`;
      const formattedDates = `${startStr} - ${endStr}`;
      
      const now = new Date();
      if (now < startDate) return { status: 'UPCOMING', formattedDates };
      if (now > endDate) {
        // SEBI mandates listing within T+3 working days after close (effective Dec 2023).
        // T+3 working days is typically 5 calendar days, but holidays can extend this.
        // We use a very safe 10-day fallback here for historical data that lacks exact dates.
        // Modern IPOs will have their exact listing/allotment dates extracted from the detail pages.
        const daysSinceClose = (now - endDate) / (1000 * 60 * 60 * 24);
        if (daysSinceClose > 10) return { status: 'LISTED', formattedDates };
        return { status: 'CLOSED', formattedDates };
      }
      return { status: 'ACTIVE', formattedDates };
    }
  }
  return { status: 'CLOSED', formattedDates: dateStr };
};

module.exports = {
  parseDatesToStatus
};
