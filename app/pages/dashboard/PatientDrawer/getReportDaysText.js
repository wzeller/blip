import moment from 'moment';
import { MS_IN_MIN } from '../../../core/constants';
import isNumber from 'lodash/isNumber';
import { utils as vizUtils } from '@tidepool/viz';
const { getOffset, formatDateRange } = vizUtils.datetime;

const getDateRange = (startDate, endDate, dateParseFormat, _prefix, monthFormat, timezone) => {
  let start = startDate;
  let end = endDate;

  if (isNumber(startDate) && isNumber(endDate)) {
    start = startDate - getOffset(startDate, timezone) * MS_IN_MIN;
    end = endDate - getOffset(endDate, timezone) * MS_IN_MIN;
  }

  return formatDateRange(start, end, dateParseFormat, monthFormat);
};

// Counts the 24-hour periods spanned by the data rather than the calendar dates it touches, so
// that a full 14x24h window anchored mid-day (matching the backend summary period) reads as
// 14 days, not the 15 calendar dates it overlaps.
export const getDaysWornCount = (newestDatum, oldestDatum, bgDaysWorn) => {
  if (!isNumber(newestDatum?.time) || !isNumber(oldestDatum?.time)) return bgDaysWorn;

  return Math.max(1, Math.ceil(moment.duration(newestDatum.time - oldestDatum.time).asDays()));
};

const getReportDaysText = (newestDatum, oldestDatum, bgDaysWorn, timezone) => {
  const reportDaysText = bgDaysWorn === 1
    ? moment.utc(newestDatum?.time - getOffset(newestDatum?.time, timezone) * MS_IN_MIN).format('MMMM D, YYYY')
    : getDateRange(oldestDatum?.time, newestDatum?.time, undefined, '', 'MMMM', timezone);

  return reportDaysText;
};

export default getReportDaysText;
