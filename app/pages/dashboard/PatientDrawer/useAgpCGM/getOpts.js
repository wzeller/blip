import moment from 'moment-timezone';
import _ from 'lodash';
import get from 'lodash/get';
import { utils as vizUtils } from '@tidepool/viz';
import utils from '../../../../core/utils';
import { getMostRecentDatumTimeByChartType } from '../../../../core/dataViewUtils';

const getTimezoneFromTimePrefs = vizUtils.datetime.getTimezoneFromTimePrefs;
const getLocalizedCeiling = vizUtils.datetime.getLocalizedCeiling;

const getOpts = (
  requestId,
  data, // data from redux (state.blip.data)
  agpPeriodInDays,
) => {
  const latestDatumByType = _.get(data, 'metaData.latestDatumByType');
  const mostRecentDatumDates = {
    agpCGM: getMostRecentDatumTimeByChartType(latestDatumByType, 'agpCGM'),
  };

  const timePrefs = (() => {
    const latestTimeZone = data?.metaData?.latestTimeZone;
    const queryParams = {};

    const localTimePrefs = utils.getTimePrefsForDataProcessing(latestTimeZone, queryParams);

    return localTimePrefs;
  })();

  const timezoneName = getTimezoneFromTimePrefs(timePrefs);

  // The window end is anchored to the hour ceiling of the most recent CBG datum, rather than to
  // local midnight, so the queried period matches the hour-bucketed rolling window the backend
  // summary service uses for the dashboard stats. The first and last calendar days of the window
  // are therefore usually partial days.
  const getLastNDays = (days, chartType) => {
    const anchor = get(mostRecentDatumDates, chartType) || moment.utc().valueOf();
    const endDate = moment.utc(getLocalizedCeiling(anchor, timePrefs, 'hour').valueOf());

    return {
      startDate: moment.utc(endDate).tz(timezoneName).subtract(days, 'days'),
      endDate,
    };
  };

  // Get the date range for the current AGP, ending at the hour ceiling of the latest datum
  const dates = getLastNDays(agpPeriodInDays, 'agpCGM');

  // Get the date range for the offset AGP, ending at the start of the current AGP window
  const offsetDates = {
    startDate: dates.startDate.clone().subtract(agpPeriodInDays, 'days'),
    endDate: dates.startDate.clone(),
  };

  const formatDateEndpoints = ({ startDate, endDate }) => (startDate && endDate ? [
    startDate.valueOf(),
    endDate.valueOf(),
  ] : []);

  const opts = {
    requestId,
    agpCGM:       { disabled: false, endpoints: formatDateEndpoints(dates) },
    offsetAgpCGM: { disabled: false, endpoints: formatDateEndpoints(offsetDates) },
    agpBGM:       { disabled: true },
    basics:       { disabled: true },
    bgLog:        { disabled: true },
    daily:        { disabled: true },
    settings:     { disabled: true },
  };

  return opts;
};

export default getOpts;
