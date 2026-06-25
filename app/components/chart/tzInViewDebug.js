/**
 * EXPERIMENT (WEB tz-in-view): debug overlay that summarizes the timezoneOffsets
 * of the data currently in the daily view, to compare a "most-prevalent tz in view"
 * strategy against the status-quo "latest datum" display timezone.
 *
 * This component is self-contained and intended to be easy to remove. It renders
 * a small panel; pass the summary object computed in daily.js.
 */
import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import { Box, Flex, Text } from 'theme-ui';

export const formatOffset = (min) => {
  if (!_.isFinite(min)) return 'n/a';
  const sign = min < 0 ? '-' : '+';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
};

const displayOffsetDiffers = (displayOffset, prevalentOffset) =>
  _.isFinite(displayOffset) && _.isFinite(prevalentOffset) && displayOffset !== prevalentOffset;

const TimezoneInViewLabel = ({ summary, onHide }) => {
  if (!summary) return null;

  const { total, displayTimezone, displayOffset, rows, mostPrevalent, mixed } = summary;

  return (
    <Box
      sx={{
        position: 'relative',
        fontFamily: 'monospace',
        fontSize: 0,
        bg: '#fffbe6',
        border: '1px solid #e0c040',
        borderRadius: '4px',
        p: 2,
        pr: '22px',
        lineHeight: 1.4,
        maxWidth: '420px',
      }}
    >
      {onHide && (
        <Box
          as="button"
          type="button"
          onClick={onHide}
          aria-label="Hide tz debug panel"
          sx={{
            position: 'absolute',
            top: '2px',
            right: '4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#8a6d00',
            fontSize: 1,
            lineHeight: 1,
            p: '2px',
            '&:hover': { color: '#5a4700' },
          }}
        >
          ×
        </Box>
      )}
      <Text sx={{ fontWeight: 'bold' }}>tz-in-view (datum count, n={total})</Text>
      <Box>
        status-quo display: <b>{displayTimezone || 'naive'}</b>
        {_.isFinite(displayOffset) ? ` (${formatOffset(displayOffset)} @ center)` : ''}
      </Box>
      {rows.length === 0 && <Box>no timezoned data in view</Box>}
      {rows.map((r) => {
        const isTop = mostPrevalent && r.offset === mostPrevalent.offset;
        return (
          <Flex key={r.offset} sx={{ justifyContent: 'space-between', fontWeight: isTop ? 'bold' : 'normal' }}>
            <span>
              {formatOffset(r.offset)}
              {r.timezones.length ? ` (${r.timezones.join(', ')})` : ''}
              {isTop ? '  ← most prevalent' : ''}
            </span>
            <span>{r.count} ({Math.round((r.count / total) * 100)}%)</span>
          </Flex>
        );
      })}
      <Box sx={{ mt: 1 }}>
        mixed tz in view: <b style={{ color: mixed ? '#c0392b' : '#2e7d32' }}>{mixed ? 'YES' : 'no'}</b>
        {mostPrevalent && displayOffsetDiffers(displayOffset, mostPrevalent.offset)
          ? '  — proposed differs from status-quo'
          : ''}
      </Box>
    </Box>
  );
};

TimezoneInViewLabel.propTypes = {
  summary: PropTypes.object,
  onHide: PropTypes.func,
};

export default TimezoneInViewLabel;
