
/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import bows from 'bows';
import ReactDOM from 'react-dom';
import sundial from 'sundial';
import WindowSizeListener from 'react-window-size-listener';
import { withTranslation } from 'react-i18next';
import { Box, Flex } from 'theme-ui';

import Stats from './stats';
import BgSourceToggle from './bgSourceToggle';
import DeviceSelection from './deviceSelection';
import Button from '../elements/Button';

// tideline dependencies & plugins
import tidelineBlip from 'tideline/plugins/blip';
const chartDailyFactory = tidelineBlip.oneday;

import { components as vizComponents } from '@tidepool/viz';
const Loader = vizComponents.Loader;
const BolusTooltip = vizComponents.BolusTooltip;
const SMBGTooltip = vizComponents.SMBGTooltip;
const CBGTooltip = vizComponents.CBGTooltip;
const FoodTooltip = vizComponents.FoodTooltip;
const PumpSettingsOverrideTooltip = vizComponents.PumpSettingsOverrideTooltip;
const AlarmTooltip = vizComponents.AlarmTooltip;
const EventTooltip = vizComponents.EventTooltip;

import Header from './header';
import CgmSampleIntervalRangeToggle from './cgmSampleIntervalRangeToggle';
import EventsInfoLabel from './eventsInfoLabel';
import TimezoneInViewLabel, { formatOffset } from './tzInViewDebug';
import HelpOutlineRoundedIcon from '@material-ui/icons/HelpOutlineRounded';
import Icon from '../elements/Icon';

// EXPERIMENT (tz-in-view): helpers to re-base the whole daily view to a single uniform
// timezone offset (minutes east of UTC, Tidepool convention e.g. US/Eastern EDT = -240).
const MS_IN_MIN = 60000;

// Map a fixed offset (minutes) to a zone name. Etc/GMT uses POSIX sign inversion and only
// supports whole-hour offsets; non-whole-hour offsets fall back to UTC (ticks/data still use
// the exact displayOffset, so only the secondary sticky-day-label may be slightly off).
const offsetToZoneName = offsetMin => {
  if (offsetMin % 60 === 0) {
    const hours = -offsetMin / 60;
    return `Etc/GMT${hours >= 0 ? '+' : '-'}${Math.abs(hours)}`;
  }
  return 'UTC';
};

// Return a copy of the chart data re-based so the whole view renders at `targetOffset`.
// Data points keep their true UTC normalTime and just get a uniform displayOffset; fill
// (grid) segments are shifted by (defaultOffset - targetOffset) so the 3-hour grid and day
// boundaries re-align to the target offset's midnight, then get the uniform displayOffset.
const rebaseChartData = (data, targetOffset, defaultOffset) => {
  const combined = _.get(data, 'data.combined');
  if (!combined || !_.isFinite(targetOffset) || !_.isFinite(defaultOffset)) return data;
  const fillShift = (defaultOffset - targetOffset) * MS_IN_MIN;

  const newCombined = _.map(combined, d => {
    if (d.type === 'fill') {
      const normalTime = d.normalTime + fillShift;
      const duration = _.isFinite(d.duration) ? d.duration : (d.normalEnd - d.normalTime);
      const localTime = normalTime + targetOffset * MS_IN_MIN;
      return {
        ...d,
        normalTime,
        normalEnd: normalTime + duration,
        displayOffset: targetOffset,
        fillDate: new Date(localTime).toISOString().slice(0, 10),
        id: `fill_${new Date(normalTime).toISOString().replace(/[^\w\s]|_/g, '')}`,
      };
    }
    return { ...d, displayOffset: targetOffset };
  });

  return {
    ...data,
    data: { ...data.data, combined: newCombined },
    timePrefs: { ...data.timePrefs, timezoneAware: true, timezoneName: offsetToZoneName(targetOffset) },
  };
};
import { DEFAULT_CGM_SAMPLE_INTERVAL_RANGE } from '../../core/constants';

const DailyChart = withTranslation(null, { withRef: true })(class DailyChart extends Component {
  static propTypes = {
    bgClasses: PropTypes.object.isRequired,
    bgUnits: PropTypes.string.isRequired,
    bolusRatio: PropTypes.number,
    data: PropTypes.object.isRequired,
    dynamicCarbs: PropTypes.bool,
    editedCarbs: PropTypes.bool,
    initialDatetimeLocation: PropTypes.string,
    patient: PropTypes.object,
    timePrefs: PropTypes.object.isRequired,
    // message handlers
    onCreateMessage: PropTypes.func.isRequired,
    onShowMessageThread: PropTypes.func.isRequired,
    // other handlers
    onDatetimeLocationChange: PropTypes.func.isRequired,
    onMostRecent: PropTypes.func.isRequired,
    onTransition: PropTypes.func.isRequired,
    onBolusHover: PropTypes.func.isRequired,
    onBolusOut: PropTypes.func.isRequired,
    onSMBGHover: PropTypes.func.isRequired,
    onSMBGOut: PropTypes.func.isRequired,
    onCBGHover: PropTypes.func.isRequired,
    onCBGOut: PropTypes.func.isRequired,
    onCarbHover: PropTypes.func.isRequired,
    onCarbOut: PropTypes.func.isRequired,
    onPumpSettingsOverrideHover: PropTypes.func.isRequired,
    onPumpSettingsOverrideOut: PropTypes.func.isRequired,
    onAlarmHover: PropTypes.func.isRequired,
    onAlarmOut: PropTypes.func.isRequired,
    onEventHover: PropTypes.func.isRequired,
    onEventOut: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    this.chartOpts = [
      'automatedBasal',
      'automatedBolus',
      'bgClasses',
      'bgUnits',
      'bolusRatio',
      'carbUnits',
      'dynamicCarbs',
      'editedCarbs',
      'insulinBolus',
      'timePrefs',
      'onBolusHover',
      'onBolusOut',
      'onSMBGHover',
      'onSMBGOut',
      'onCBGHover',
      'onCBGOut',
      'onCarbHover',
      'onCarbOut',
      'onPumpSettingsOverrideHover',
      'onPumpSettingsOverrideOut',
      'onAlarmHover',
      'onAlarmOut',
      'onEventHover',
      'onEventOut',
    ];

    this.log = bows('Daily Chart');
    this.state = this.getInitialState()
  }

  getInitialState = () => {
    return {
      initialDatetimeLocation: this.props.initialDatetimeLocation,
      datetimeLocation: null
    };
  };

  componentDidMount = () => {
    this.mountChart();
    this.initializeChart(this.props, this.props.initialDatetimeLocation);
  };

  componentWillUnmount = () => {
    this.unmountChart();
  };

  mountChart = (props = this.props) => {
    this.log('Mounting...');

    const node = ReactDOM.findDOMNode(this);

    // When on mobile, the chart will be hidden and therefore have zero width and height.
    // This safety check prevents an error from occurring in tideline due to the zeroes.
    if (!node?.offsetHeight || !node?.offsetWidth) return;

    this.chart = chartDailyFactory(node, _.pick(props, this.chartOpts))
      .setupPools();
    this.bindEvents();
  };

  unmountChart = () => {
    this.log('Unmounting...');
    this.chart?.destroy();
  };

  bindEvents = () => {
    this.chart?.emitter.on('createMessage', this.props.onCreateMessage);
    this.chart?.emitter.on('inTransition', this.props.onTransition);
    this.chart?.emitter.on('messageThread', this.props.onShowMessageThread);
    this.chart?.emitter.on('mostRecent', this.props.onMostRecent);
    this.chart?.emitter.on('navigated', this.handleDatetimeLocationChange);
  };

  initializeChart = (props = this.props, datetime) => {
    const { t } = props;
    this.log('Initializing...');
    if (_.isEmpty(_.get(props.data, 'data.combined', []))) {
      throw new Error(t('Cannot create new chart with no data'));
    }

    this.chart?.load(props.data);
    if (datetime) {
      this.chart?.locate(datetime);
    }
    else if (this.state.datetimeLocation !== null) {
      this.chart?.locate(this.state.datetimeLocation);
    }
    else {
      this.chart?.locate();
    }
  };

  render = () => {
    return (
      <div id="tidelineContainer" className="patient-data-chart"></div>
      );
  };

  // handlers
  handleDatetimeLocationChange = datetimeLocationEndpoints => {
    this.setState({
      datetimeLocation: datetimeLocationEndpoints[1]
    });
    this.props.onDatetimeLocationChange(datetimeLocationEndpoints);
  };

  rerenderChart = (updates = {}) => {
    const chartProps = { ...this.props, ...updates };
    this.log('Rerendering...');
    this.unmountChart();
    this.mountChart(chartProps);
    this.initializeChart(chartProps);
    this.chart?.emitter.emit('inTransition', false);
  };

  getCurrentDay = () => {
    return this.chart?.getCurrentDay().toISOString();
  };

  goToMostRecent = () => {
    this.chart?.setAtDate(null, true);
  };

  panBack = () => {
    this.chart?.panBack();
  };

  panForward = () => {
    this.chart?.panForward();
  };

  // methods for messages
  closeMessage = () => {
    return this.chart?.closeMessage();
  };

  createMessage = message => {
    return this.chart?.createMessage(message);
  };

  editMessage = message => {
    return this.chart?.editMessage(message);
  };
});

class Daily extends Component {
  static propTypes = {
    addingData: PropTypes.object.isRequired,
    chartPrefs: PropTypes.object.isRequired,
    data: PropTypes.object.isRequired,
    initialDatetimeLocation: PropTypes.string,
    loading: PropTypes.bool.isRequired,
    mostRecentDatetimeLocation: PropTypes.string,
    queryDataCount: PropTypes.number.isRequired,
    stats: PropTypes.array.isRequired,
    updatingDatum: PropTypes.object.isRequired,
    // refresh handler
    onClickRefresh: PropTypes.func.isRequired,
    // message handlers
    onCreateMessage: PropTypes.func.isRequired,
    onShowMessageThread: PropTypes.func.isRequired,
    // navigation handlers
    onSwitchToBasics: PropTypes.func.isRequired,
    onSwitchToDaily: PropTypes.func.isRequired,
    onClickExport: PropTypes.func.isRequired,
    onClickPrint: PropTypes.func.isRequired,
    onSwitchToSettings: PropTypes.func.isRequired,
    onSwitchToBgLog: PropTypes.func.isRequired,
    onSwitchToTrends: PropTypes.func.isRequired,
    // data state updaters
    onUpdateChartDateRange: PropTypes.func.isRequired,
    updateChartPrefs: PropTypes.func.isRequired,
    trackMetric: PropTypes.func.isRequired,
    removeGeneratedPDFS: PropTypes.func.isRequired,
    isSmartOnFhirMode: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.chartType = 'daily';
    this.log = bows('Daily View');
    this.state = this.getInitialState()
    this.chartRef = React.createRef();
    this.headerRef = React.createRef();
    // Created once so rapid-fire D3 'navigated' events during pan animation properly debounce
    this.debouncedDateRangeUpdate = _.debounce((...args) => this.props.onUpdateChartDateRange(...args), 250);
  }

  getInitialState = () => {
    this.throttledMetric = _.throttle(this.props.trackMetric, 5000);
    return {
      atMostRecent: false,
      endpoints: [],
      hasAlarmEventsInView: null,
      tzInView: null,
      appliedOffset: null,
      showTzTooltip: false,
      showTzDebug: true,
      initialDatetimeLocation: this.props.initialDatetimeLocation,
      inTransition: false,
      title: '',
    };
  };

  UNSAFE_componentWillReceiveProps = nextProps => {
    const loadingJustCompleted = this.props.loading && !nextProps.loading;
    const newDataAdded = this.props.addingData.inProgress && nextProps.addingData.completed;
    const dataUpdated = this.props.updatingDatum.inProgress && nextProps.updatingDatum.completed;
    const newDataRecieved = this.props.queryDataCount !== nextProps.queryDataCount;
    const newEndpointsReceived = this.props.data?.data?.current?.endpoints !== nextProps.data?.data?.current?.endpoints;

    // EXPERIMENT (tz-in-view): recompute the in-view timezone summary and the target display
    // offset whenever the visible window changes. appliedOffset is the uniform offset the chart
    // is re-based to (null = use the status-quo default tz).
    let nextTzInView = this.state.tzInView;
    let nextAppliedOffset = this.state.appliedOffset;
    if (nextProps.data?.data?.combined && (this.state.tzInView === null || newEndpointsReceived)) {
      nextTzInView = this.computeTzInView(nextProps.data);
      nextAppliedOffset = this.getTargetOffset(nextTzInView);
      const stateUpdates = {};
      if (!_.isEqual(nextTzInView, this.state.tzInView)) stateUpdates.tzInView = nextTzInView;
      if (nextAppliedOffset !== this.state.appliedOffset) stateUpdates.appliedOffset = nextAppliedOffset;
      if (!_.isEmpty(stateUpdates)) this.setState(stateUpdates);
    }

    if (this.chartRef.current) {
      const updates = {};
      if (loadingJustCompleted || newDataAdded || dataUpdated || newDataRecieved) {
        const effective = this.getEffectiveData(nextProps.data, nextAppliedOffset, nextTzInView);
        updates.data = effective.data;
        updates.timePrefs = effective.timePrefs;
        updates.editedCarbs = _.some(
          _.get(nextProps, 'data.data.combined'),
          d => d.type === 'food' && (d.tags?.carbsEdited === true || d.tags?.entryTimeDiffers === true)
        );
      }
      if (!_.isEmpty(updates)) this.chartRef.current?.rerenderChart(updates);
    }

    if (nextProps.data?.data?.combined && (this.state.hasAlarmEventsInView === null || newEndpointsReceived)) {
      const hasAlarmEventsInView = _.some(
        _.filter(nextProps.data.data.combined, d => !!d.tags?.alarm),
        d => d.normalTime >= nextProps.data.data.current.endpoints.range[0] && d.normalTime <= nextProps.data.data.current.endpoints.range[1]
      );

      if (hasAlarmEventsInView !== this.state.hasAlarmEventsInView) {
        this.setState({ hasAlarmEventsInView });
      }
    }

  };

  // EXPERIMENT (tz-in-view): render the 24h window in the offset held by the plurality of
  // in-view data (largest group wins). Re-base whenever that differs from the status-quo
  // default; null means the plurality already matches the default (no re-base needed).
  getTargetOffset = tzInView => {
    if (!tzInView || !tzInView.mostPrevalent) return null;
    const defaultOffset = tzInView.displayOffset;
    if (!_.isFinite(defaultOffset)) return null;
    return tzInView.mostPrevalent.offset !== defaultOffset ? tzInView.mostPrevalent.offset : null;
  };

  // EXPERIMENT (tz-in-view): return the data/timePrefs the chart should render. When an offset
  // is applied, re-base a (memoized) copy; otherwise pass the original through unchanged.
  getEffectiveData = (data, appliedOffset, tzInView) => {
    if (appliedOffset === null) return { data, timePrefs: _.get(data, 'timePrefs') };
    const cache = this._effectiveCache;
    if (cache && cache.srcData === data && cache.offset === appliedOffset) return cache.result;
    const defaultOffset = _.get(tzInView, 'displayOffset', _.get(this.computeTzInView(data), 'displayOffset'));
    const rebased = rebaseChartData(data, appliedOffset, defaultOffset);
    const result = { data: rebased, timePrefs: _.get(rebased, 'timePrefs') };
    this._effectiveCache = { srcData: data, offset: appliedOffset, result };
    return result;
  };

  // EXPERIMENT (tz-in-view): when the applied offset changes, redraw the chart in place
  // (rerenderChart() reads this.props, which already carries the re-based data/timePrefs).
  componentDidUpdate = (prevProps, prevState) => {
    if (prevState.appliedOffset !== this.state.appliedOffset) {
      this.chartRef.current?.rerenderChart();
    }
  };

  // EXPERIMENT (tz-in-view): summarize timezoneOffsets of data in the visible window.
  computeTzInView = data => {
    const combined = _.get(data, 'data.combined');
    const range = _.get(data, 'data.current.endpoints.range');
    if (!combined || !range) return null;

    const [start, end] = range;
    const inView = _.filter(combined, d =>
      _.isFinite(d.timezoneOffset) && d.normalTime >= start && d.normalTime <= end
    );

    const byOffset = {};
    _.forEach(inView, d => {
      if (!byOffset[d.timezoneOffset]) {
        byOffset[d.timezoneOffset] = { offset: d.timezoneOffset, count: 0, timezones: new Set() };
      }
      byOffset[d.timezoneOffset].count += 1;
      if (d.timezone) byOffset[d.timezoneOffset].timezones.add(d.timezone);
    });

    const rows = _.orderBy(
      _.map(byOffset, o => ({ offset: o.offset, count: o.count, timezones: Array.from(o.timezones) })),
      ['count', 'offset'],
      ['desc', 'asc']
    );

    const timePrefs = _.get(data, 'timePrefs', {});
    const displayTimezone = timePrefs.timezoneAware ? timePrefs.timezoneName : null;
    const center = (start + end) / 2;
    const displayOffset = displayTimezone
      ? sundial.getOffsetFromZone(new Date(center).toISOString(), displayTimezone)
      : NaN;

    return {
      total: inView.length,
      displayTimezone,
      displayOffset,
      rows,
      mostPrevalent: rows[0] || null,
      mixed: rows.length > 1,
    };
  };

  componentWillUnmount = () => {
    this.debouncedDateRangeUpdate.cancel();
  };

  render = () => {
    const timePrefs = _.get(this.props, 'data.timePrefs', {});
    const bgPrefs = _.get(this.props, 'data.bgPrefs', {});
    const dataQueryComplete = _.get(this.props, 'data.query.chartType') === 'daily';

    // EXPERIMENT (tz-in-view): hover tooltips (bolus/cbg/smbg/carb/etc.) format their time
    // from timePrefs, so they must use the re-based timePrefs when an offset is applied.
    // Falls back to the original timePrefs when nothing is re-based.
    const effectiveTimePrefs = this.getEffectiveData(this.props.data, this.state.appliedOffset, this.state.tzInView).timePrefs || timePrefs;

    return (
      <div id="tidelineMain" className="daily">
        <Box variant="containers.patientData">
          <Header
            chartType={this.chartType}
            patient={this.props.patient}
            inTransition={this.state.inTransition}
            atMostRecent={this.state.atMostRecent}
            title={this.state.title}
            iconBack={'icon-back'}
            iconNext={'icon-next'}
            iconMostRecent={'icon-most-recent'}
            onClickBack={this.handlePanBack}
            onClickBasics={this.props.onSwitchToBasics}
            onClickChartDates={this.props.onClickChartDates}
            onClickTrends={this.handleClickTrends}
            onClickMostRecent={this.handleClickMostRecent}
            onClickNext={this.handlePanForward}
            onClickOneDay={this.handleClickOneDay}
            onClickSettings={this.props.onSwitchToSettings}
            onClickBgLog={this.handleClickBgLog}
            onClickExport={this.handleClickExport}
            onClickPrint={this.handleClickPrint}
            isSmartOnFhirMode={this.props.isSmartOnFhirMode}
            ref={this.headerRef}
          />

          <Box variant="containers.patientDataInner">
            <Box className="patient-data-content" variant="containers.patientDataContent">
                <Loader show={!!this.chartRef && this.props.loading} overlay={true} />
                {dataQueryComplete && this.renderChart()}

                <Button
                  className="btn-refresh"
                  variant="secondaryCondensed"
                  onClick={this.props.onClickRefresh}
                  mt={3}
                  ml="40px"
                >
                  {this.props.t('Refresh')}
                </Button>
            </Box>

            <Box className="patient-data-sidebar" variant="containers.patientDataSidebar">
              <Flex mb={2} sx={{ justifyContent: 'flex-end' }}>
                <BgSourceToggle
                  bgSources={_.get(this.props, 'data.metaData.bgSources', {})}
                  chartPrefs={this.props.chartPrefs}
                  chartType={this.chartType}
                  onClickBgSourceToggle={this.toggleBgDataSource}
                />
              </Flex>
              <Stats
                bgPrefs={bgPrefs}
                chartPrefs={this.props.chartPrefs}
                chartType={this.chartType}
                stats={this.props.stats}
                trackMetric={this.props.trackMetric}
              />
              <DeviceSelection
                chartPrefs={this.props.chartPrefs}
                chartType={this.chartType}
                devices={_.get(this.props, 'data.metaData.devices', [])}
                removeGeneratedPDFS={this.props.removeGeneratedPDFS}
                trackMetric={this.props.trackMetric}
                updateChartPrefs={this.props.updateChartPrefs}
              />
            </Box>
          </Box>
          {this.state.hoveredBolus && <BolusTooltip
            position={{
              top: this.state.hoveredBolus.top,
              left: this.state.hoveredBolus.left
            }}
            side={this.state.hoveredBolus.side}
            bolus={this.state.hoveredBolus.data}
            bgPrefs={bgPrefs}
            timePrefs={effectiveTimePrefs}
          />}
          {this.state.hoveredSMBG && <SMBGTooltip
            position={{
              top: this.state.hoveredSMBG.top,
              left: this.state.hoveredSMBG.left
            }}
            side={this.state.hoveredSMBG.side}
            smbg={this.state.hoveredSMBG.data}
            timePrefs={effectiveTimePrefs}
            bgPrefs={bgPrefs}
          />}
          {this.state.hoveredCBG && <CBGTooltip
            position={{
              top: this.state.hoveredCBG.top,
              left: this.state.hoveredCBG.left
            }}
            side={this.state.hoveredCBG.side}
            cbg={this.state.hoveredCBG.data}
            timePrefs={effectiveTimePrefs}
            bgPrefs={bgPrefs}
          />}
          {this.state.hoveredCarb && <FoodTooltip
            position={{
              top: this.state.hoveredCarb.top,
              left: this.state.hoveredCarb.left
            }}
            side={this.state.hoveredCarb.side}
            food={this.state.hoveredCarb.data}
            bgPrefs={bgPrefs}
            timePrefs={effectiveTimePrefs}
          />}
          {this.state.hoveredPumpSettingsOverride && <PumpSettingsOverrideTooltip
            position={{
              top: this.state.hoveredPumpSettingsOverride.top,
              left: this.state.hoveredPumpSettingsOverride.left
            }}
            side={this.state.hoveredPumpSettingsOverride.side}
            override={this.state.hoveredPumpSettingsOverride.data}
            bgPrefs={bgPrefs}
            timePrefs={effectiveTimePrefs}
          />}
          {this.state.hoveredAlarm && <AlarmTooltip
            position={{
              top: this.state.hoveredAlarm.top,
              left: this.state.hoveredAlarm.left
            }}
            offset={{
              top: 0,
              left: this.state.hoveredAlarm.leftOffset || 0
            }}
            side={this.state.hoveredAlarm.side}
            alarm={this.state.hoveredAlarm.data}
            timePrefs={effectiveTimePrefs}
          />}
          {this.state.hoveredEvent && <EventTooltip
            position={{
              top: this.state.hoveredEvent.top,
              left: this.state.hoveredEvent.left
            }}
            offset={{
              top: 0,
              left: this.state.hoveredEvent.leftOffset || 0
            }}
            side={this.state.hoveredEvent.side}
            event={this.state.hoveredEvent.data}
            timePrefs={effectiveTimePrefs}
          />}
          <WindowSizeListener onResize={this.handleWindowResize} />
        </Box>
      </div>
      );
  };

  renderChart = () => {
    const timePrefs = _.get(this.props, 'data.timePrefs', {});
    const bgPrefs = _.get(this.props, 'data.bgPrefs', {});
    const carbUnits = ['grams'];

    // EXPERIMENT (tz-in-view): the chart renders re-based data/timePrefs when an offset is
    // applied; the rest of the page (stats, header) stays on the default tz.
    const effectiveChart = this.getEffectiveData(this.props.data, this.state.appliedOffset, this.state.tzInView);
    const showingCgmData = _.get(this.props, 'chartPrefs.daily.bgSource')  === 'cbg';

    const {
      isAutomatedBasalDevice,
      isAutomatedBolusDevice,
    } = _.get(this.props, 'data.metaData.latestPumpUpload', {});

    const hasCarbExchanges = _.some(
      _.get(this.props, 'data.data.combined'),
      { type: 'wizard', carbUnits: 'exchanges' }
    );

    const hasInsulinData = _.some(
      _.get(this.props, 'data.data.combined'),
      { type: 'insulin' }
    );

    const hasEditedCarbs = _.some(
      _.get(this.props, 'data.data.combined'),
      d => d.type === 'food' && (d.tags?.carbsEdited === true || d.tags?.entryTimeDiffers === true)
    );

    const hasOneMinCgmSampleIntervalDevice = _.some(
      _.get(this.props, 'data.metaData.devices'),
      { oneMinCgmSampleInterval: true }
    );

    if (hasCarbExchanges) carbUnits.push('exchanges');

    return (
      <>
        <Flex
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <EventsInfoLabel hasAlarmEventsInView={this.state.hasAlarmEventsInView}>
            {this.renderTzSubnote()}
          </EventsInfoLabel>

          {this.state.showTzDebug ? (
            <TimezoneInViewLabel
              summary={this.state.tzInView}
              onHide={() => this.setState({ showTzDebug: false })}
            />
          ) : (
            <Box
              as="button"
              type="button"
              onClick={() => this.setState({ showTzDebug: true })}
              sx={{
                fontFamily: 'monospace',
                fontSize: 0,
                bg: '#fffbe6',
                border: '1px solid #e0c040',
                borderRadius: '4px',
                px: 2,
                py: '2px',
                color: '#8a6d00',
                cursor: 'pointer',
                '&:hover': { color: '#5a4700' },
              }}
            >
              tz ▸
            </Box>
          )}

          {/* TODO: re-enable CgmSampleIntervalRangeToggle once twiist data issue is resolved */}
          {/* {showingCgmData && hasOneMinCgmSampleIntervalDevice && (
            <CgmSampleIntervalRangeToggle
              chartPrefs={this.props.chartPrefs}
              chartType={this.chartType}
              onClickCgmSampleIntervalRangeToggle={this.toggleCgmSampleIntervalRange}
            />
          )} */}
        </Flex>

        <Box sx={{ position: 'relative', top: '-24px' }}>
          <DailyChart
            automatedBasal={isAutomatedBasalDevice}
            automatedBolus={isAutomatedBolusDevice}
            insulinBolus={hasInsulinData}
            bgClasses={bgPrefs.bgClasses}
            bgUnits={bgPrefs.bgUnits}
            bolusRatio={this.props.chartPrefs.bolusRatio}
            carbUnits={carbUnits}
            data={effectiveChart.data}
            dynamicCarbs={this.props.chartPrefs.dynamicCarbs}
            editedCarbs={hasEditedCarbs}
            initialDatetimeLocation={this.props.initialDatetimeLocation}
            timePrefs={effectiveChart.timePrefs || timePrefs}
            // message handlers
            onCreateMessage={this.props.onCreateMessage}
            onShowMessageThread={this.props.onShowMessageThread}
            // other handlers
            onDatetimeLocationChange={this.handleDatetimeLocationChange}
            onHideBasalSettings={this.handleHideBasalSettings}
            onMostRecent={this.handleMostRecent}
            onShowBasalSettings={this.handleShowBasalSettings}
            onTransition={this.handleInTransition}
            onBolusHover={this.handleBolusHover}
            onBolusOut={this.handleBolusOut}
            onSMBGHover={this.handleSMBGHover}
            onSMBGOut={this.handleSMBGOut}
            onCBGHover={this.handleCBGHover}
            onCBGOut={this.handleCBGOut}
            onCarbHover={this.handleCarbHover}
            onCarbOut={this.handleCarbOut}
            onPumpSettingsOverrideHover={this.handlePumpSettingsOverrideHover}
            onPumpSettingsOverrideOut={this.handlePumpSettingsOverrideOut}
            onAlarmHover={this.handleAlarmHover}
            onAlarmOut={this.handleAlarmOut}
            onEventHover={this.handleEventHover}
            onEventOut={this.handleEventOut}
            ref={this.chartRef}
          />
        </Box>
      </>
    );
  }

  // EXPERIMENT (tz-in-view): small always-on offset note under the date (e.g. "UTC-7") with a
  // hover/focus tooltip explaining which offset is displayed and why. Caution-styled when the
  // 24h window spans more than one timezone.
  renderTzSubnote = () => {
    const tzInView = this.state.tzInView;
    const displayedOffset = this.state.appliedOffset !== null
      ? this.state.appliedOffset
      : _.get(tzInView, 'displayOffset');
    if (!_.isFinite(displayedOffset)) return null;

    const mixed = !!tzInView?.mixed;
    const offsetLabel = formatOffset(displayedOffset);
    const offsets = _.map(_.get(tzInView, 'rows', []), r => formatOffset(r.offset)).join(', ');

    let why;
    if (mixed) {
      why = `This 24-hour window spans multiple time zones (${offsets}). Showing ${offsetLabel}, the majority of the data in view.`;
    } else if (this.state.appliedOffset !== null) {
      why = `Showing ${offsetLabel}, the timezone of all data in this 24-hour window.`;
    } else {
      why = `Showing ${offsetLabel}, your default timezone (the timezone of your most recent data).`;
    }

    const show = () => this.setState({ showTzTooltip: true });
    const hide = () => this.setState({ showTzTooltip: false });

    return (
      <Flex
        sx={{ position: 'relative', alignItems: 'center', justifyContent: 'flex-start', gap: 1, mt: '1px', fontSize: '11px', color: mixed ? '#946C00' : '#6d6d6d' }}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <Box as="span" sx={{ fontWeight: mixed ? 'bold' : 'normal' }}>{offsetLabel}</Box>
        <Icon
          icon={HelpOutlineRoundedIcon}
          label="Timezone information"
          cursor="help"
          onFocus={show}
          onBlur={hide}
          sx={{ fontSize: '14px', color: mixed ? '#C28A00' : '#9b9b9b', '&:hover': { color: mixed ? '#946C00' : '#6d6d6d' } }}
        />
        {this.state.showTzTooltip && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 2,
              width: '240px',
              p: 2,
              fontSize: '11px',
              fontWeight: 'normal',
              lineHeight: 1.45,
              color: '#33404d',
              bg: 'white',
              border: '1px solid',
              borderColor: mixed ? '#e0c040' : '#d8d8d8',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              textAlign: 'left',
              whiteSpace: 'normal',
            }}
          >
            {why}
          </Box>
        )}
      </Flex>
    );
  };

  getTitle = datetime => {
    const { t } = this.props;
    const timePrefs = _.get(this.props, 'data.timePrefs', {});
    let timezone;

    // EXPERIMENT (tz-in-view): when re-based to a uniform offset, title the day in that zone.
    if (this.state.appliedOffset !== null) {
      timezone = offsetToZoneName(this.state.appliedOffset);
    }
    else if (!timePrefs.timezoneAware) {
      timezone = 'UTC';
    }
    else {
      timezone = timePrefs.timezoneName || 'UTC';
    }
    return sundial.formatInTimezone(datetime, timezone, t('ddd, MMM D, YYYY'));
  };

  // handlers
  toggleBgDataSource = (e, bgSource) => {
    if (e) {
      e.preventDefault();
    }

    const changedTo = bgSource === 'cbg' ? 'CGM' : 'BGM';
    this.props.trackMetric(`Daily Click to ${changedTo}`);

    const prefs = _.cloneDeep(this.props.chartPrefs);
    prefs.daily.bgSource = bgSource;
    this.props.updateChartPrefs(prefs, false, true);
  };

  toggleCgmSampleIntervalRange = (e, cgmSampleIntervalRange) => {
    if (e) {
      e.preventDefault();
    }

    const changedTo = _.isEqual(cgmSampleIntervalRange, DEFAULT_CGM_SAMPLE_INTERVAL_RANGE) ? '5min' : '1min';
    this.props.trackMetric(`Daily Click CGM Sample Interval to ${changedTo}`);

    const prefs = _.cloneDeep(this.props.chartPrefs);
    prefs.daily.cgmSampleIntervalRange = cgmSampleIntervalRange;
    this.props.updateChartPrefs(prefs);
  };

  handleWindowResize = () => {
    this.chartRef.current?.rerenderChart()
  };

  handleClickTrends = e => {
    if (e) {
      e.preventDefault();
    }
    const datetime = this.chartRef.current?.getCurrentDay();
    this.props.onSwitchToTrends(datetime);
  };

  handleClickMostRecent = e => {
    if (e) {
      e.preventDefault();
    }

    const latestFillDatum = _.findLast(this.chartRef.current?.chart.renderedData(), { type: 'fill' });

    if (latestFillDatum.fillDate >= this.props.mostRecentDatetimeLocation.slice(0,10)) {
      this.chartRef.current?.goToMostRecent();
    } else {
      this.props.onUpdateChartDateRange(this.props.mostRecentDatetimeLocation, true)
    }
  };

  handleClickOneDay = e => {
    if (e) {
      e.preventDefault();
    }
    return;
  };

  handleClickExport = e => {
    if (e) {
      e.preventDefault();
    }

    this.props.onClickExport();
  };

  handleClickPrint = e => {
    if (e) {
      e.preventDefault();
    }

    this.props.onClickPrint(this.props.pdf);
  };

  handleClickBgLog = e => {
    if (e) {
      e.preventDefault();
    }
    const datetime = this.chartRef.current?.getCurrentDay();
    this.props.onSwitchToBgLog(datetime);
  };

  handleDatetimeLocationChange = datetimeLocationEndpoints => {
    this.setState({
      title: this.getTitle(datetimeLocationEndpoints[1]),
    });

    // Update the chart date range in the data component.
    // We debounce this to avoid excessive updates while panning the view.
    // The debounced function is a stable instance property so that rapid-fire D3 'navigated'
    // events (emitted on every animation frame during a pan) correctly cancel each other.
    this.debouncedDateRangeUpdate(datetimeLocationEndpoints[0].end.toISOString());
  };

  handleInTransition = inTransition => {
    this.setState({
      inTransition: inTransition
    });
  };

  handleBolusHover = bolus => {
    const rect = bolus.rect;
    const datetimeLocation = this.chartRef.current?.state.datetimeLocation;
    // range here is -12 to 12
    const hoursOffset = sundial.dateDifference(bolus.data.normalTime, datetimeLocation, 'h');
    bolus.top = rect.top + (rect.height / 2)
    if(hoursOffset > 5) {
      bolus.side = 'left';
      bolus.left = rect.left;
    } else {
      bolus.side = 'right';
      bolus.left = rect.left + rect.width;
    }
    this.setState({
      hoveredBolus: bolus
    });
  };

  handleBolusOut = () => {
    this.setState({
      hoveredBolus: false
    });
  };

  handleSMBGHover = smbg => {
    const rect = smbg.rect;
    const datetimeLocation = this.chartRef.current?.state.datetimeLocation;
    // range here is -12 to 12
    const hoursOffset = sundial.dateDifference(smbg.data.normalTime, datetimeLocation, 'h');
    smbg.top = rect.top + (rect.height / 2)
    if(hoursOffset > 5) {
      smbg.side = 'left';
      smbg.left = rect.left;
    } else {
      smbg.side = 'right';
      smbg.left = rect.left + rect.width;
    }
    this.setState({
      hoveredSMBG: smbg
    });
  };

  handleSMBGOut = () => {
    this.setState({
      hoveredSMBG: false
    });
  };

  handleCBGHover = cbg => {
    this.throttledMetric('hovered over daily cgm tooltip');
    var rect = cbg.rect;
    const datetimeLocation = this.chartRef.current?.state.datetimeLocation;
    // range here is -12 to 12
    var hoursOffset = sundial.dateDifference(cbg.data.normalTime, datetimeLocation, 'h');
    cbg.top = rect.top + (rect.height / 2)
    if(hoursOffset > 5) {
      cbg.side = 'left';
      cbg.left = rect.left;
    } else {
      cbg.side = 'right';
      cbg.left = rect.left + rect.width;
    }
    this.setState({
      hoveredCBG: cbg
    });
  };

  handleCBGOut = () => {
    this.setState({
      hoveredCBG: false
    });
  };

  handlePumpSettingsOverrideHover = override => {
    this.throttledMetric('hovered over daily settings override tooltip');
    const rect = override.rect;
    const markerLeftOffset = 7;
    override.top = rect.top;
    override.left = rect.left + markerLeftOffset;

    // Prevent the tooltip from spilling over chart edges
    const leftOffset = override.left - override.chartExtents.left;
    const rightOffset = override.left - override.chartExtents.right;

    if (leftOffset < 70) {
      override.left = override.chartExtents.left + 70;
    }

    if (rightOffset > -70) {
      override.left = override.chartExtents.right - 70;
    }

    this.setState({
      hoveredPumpSettingsOverride: override
    });
  };

  handlePumpSettingsOverrideOut = () => {
    this.setState({
      hoveredPumpSettingsOverride: false
    });
  };

  handleAlarmHover = alarm => {
    this.throttledMetric('hovered over daily alarm tooltip');
    const rect = alarm.rect;
    alarm.top = rect.top + rect.height;
    alarm.left = rect.left + (rect.width / 2);
    alarm.side = 'bottom';

    // Prevent the tooltip from spilling over chart edges
    const leftOffset = alarm.left - alarm.chartExtents.left;
    const rightOffset = alarm.left - alarm.chartExtents.right;

    if (leftOffset < 35) {
      alarm.leftOffset = 35;
    }

    if (rightOffset > -35) {
      alarm.leftOffset = -35;
    }

    this.setState({
      hoveredAlarm: alarm
    });
  };

  handleAlarmOut = () => {
    this.setState({
      hoveredAlarm: false
    });
  };

  handleEventHover = event => {
    this.throttledMetric('hovered over daily event tooltip');
    const rect = event.rect;

    const isDetailedEvent = ['pump_shutdown'].includes(event.data?.tags?.event);
    const topOffset = isDetailedEvent ? 20 : 0;
    const xEdgeOffset = isDetailedEvent ? 70 : 40;

    event.top = rect.top + rect.height + topOffset;
    event.left = rect.left + (rect.width / 2);
    event.side = 'bottom';

    // Prevent the tooltip from spilling over chart edges
    const leftOffset = event.left - event.chartExtents.left;
    const rightOffset = event.left - event.chartExtents.right;

    if (leftOffset < xEdgeOffset) {
      event.leftOffset = xEdgeOffset;
    }

    if (rightOffset > -xEdgeOffset) {
      event.leftOffset = -xEdgeOffset;
    }

    this.setState({
      hoveredEvent: event
    });
  };

  handleEventOut = () => {
    this.setState({
      hoveredEvent: false
    });
  };

  handleCarbHover = carb => {
    var rect = carb.rect;
    // range here is -12 to 12
    var hoursOffset = sundial.dateDifference(carb.data.normalTime, this.state.datetimeLocation, 'h');
    carb.top = rect.top + (rect.height / 2)
    if(hoursOffset > 5) {
      carb.side = 'left';
      carb.left = rect.left;
    } else {
      carb.side = 'right';
      carb.left = rect.left + rect.width;
    }
    this.setState({
      hoveredCarb: carb
    });
  };

  handleCarbOut = () => {
    this.setState({
      hoveredCarb: false
    });
  };

  handleMostRecent = atMostRecent => {
    this.setState({
      atMostRecent: atMostRecent
    });
  };

  handlePanBack = e => {
    if (e) {
      e.preventDefault();
    }
    this.chartRef.current?.panBack();
  };

  handlePanForward = e => {
    if (e) {
      e.preventDefault();
    }
    this.chartRef.current?.panForward();
  };
}

export default withTranslation()(Daily);
