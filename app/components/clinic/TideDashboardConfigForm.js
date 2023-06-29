import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import moment from 'moment';
import includes from 'lodash/includes';
import keyBy from 'lodash/keyBy';
import map from 'lodash/map';
import reject from 'lodash/reject';
import without from 'lodash/without';
import { useFormik } from 'formik';
import { Box, BoxProps } from 'rebass/styled-components';
import { utils as vizUtils } from '@tidepool/viz';

import * as actions from '../../redux/actions';
import { TagList } from '../../components/elements/Tag';
import RadioGroup from '../../components/elements/RadioGroup';
import { useToasts } from '../../providers/ToastProvider';
import { useIsFirstRender, useLocalStorage } from '../../core/hooks';
import { getCommonFormikFieldProps, getFieldError } from '../../core/forms';
import { tideDashboardConfigSchema as validationSchema, summaryPeriodOptions, lastUploadDateFilterOptions } from '../../core/clinicUtils';
import { Body0, Caption } from '../../components/elements/FontStyles';
import { borders } from '../../themes/baseTheme';
import { pick } from 'lodash';
import { push } from 'connected-react-router';

const { getLocalizedCeiling } = vizUtils.datetime;

function getFormValues(config, clinicPatientTags) {
  return {
    period: config?.period || null,
    lastUpload: config?.lastUpload || null,
    tags: config?.tags ? reject(config.tags, tagId => !clinicPatientTags?.[tagId]) : null,
  };
}

export const TideDashboardConfigForm = (props) => {
  const { t, api, onFormChange, trackMetric, ...boxProps } = props;
  const dispatch = useDispatch();
  const isFirstRender = useIsFirstRender();
  const { set: setToast } = useToasts();
  const selectedClinicId = useSelector((state) => state.blip.selectedClinicId);
  const loggedInUserId = useSelector((state) => state.blip.loggedInUserId);
  const clinic = useSelector(state => state.blip.clinics?.[selectedClinicId]);
  const timePrefs = useSelector((state) => state.blip.timePrefs);
  const clinicPatientTags = useMemo(() => keyBy(clinic?.patientTags, 'id'), [clinic?.patientTags]);
  const [config, setConfig] = useLocalStorage('tideDashboardConfig', {});
  const { fetchingTideDashboardPatients } = useSelector((state) => state.blip.working);

  const formikContext = useFormik({
    initialValues: getFormValues(config?.[loggedInUserId], clinicPatientTags),
    onSubmit: values => {
      const options = pick(values, ['tags', 'period']);
      options.mockData = true; // TODO: delete temp mocked data response
      options.lastUploadDateTo = getLocalizedCeiling(new Date().toISOString(), timePrefs).toISOString();
      options.lastUploadDateFrom = moment(options.lastUploadDateTo).subtract(values.lastUpload, 'days').toISOString();
      dispatch(push('/dashboard/tide'));

      setConfig({
        ...config,
        [loggedInUserId]: values,
      });
    },
    validationSchema,
  });

  const {
    errors,
    setFieldValue,
    setFieldTouched,
    values,
  } = formikContext;

  function handleAsyncResult(workingState, successMessage) {
    const { inProgress, completed, notification } = workingState;

    if (!isFirstRender && !inProgress) {
      if (completed) {
        // TODO: add onComplete prop an fire it, so that we can control whether or not we need to
        // redirect, as is the case when on the patients list, or simply allow the current view to
        // re-render with the new data, and close the modal
      }

      if (completed === false) {
        setToast({
          message: get(notification, 'message'),
          variant: 'danger',
        });
      }
    }
  }

  useEffect(() => {
    onFormChange(formikContext);
  }, [values, clinicPatientTags]);

  useEffect(() => {
    handleAsyncResult(fetchingTideDashboardPatients);
  }, [fetchingTideDashboardPatients]);

  return (
    <Box
      as="form"
      id="tide-dashboard-config-form"
      {...boxProps}
    >
      <Box id='patient-tags-select' mb={3}>
        <Body0 fontWeight="medium" mb={2}>{t('Select Patient Tags')}</Body0>

        <TagList
          tags={map(clinic?.patientTags, tag => ({
            ...tag,
            selected: includes(values.tags, tag.id),
          }))}
          tagProps={{
            onClick: tagId => {
              setFieldTouched('tags', true, true);
              setFieldValue('tags', [...(values.tags || []), tagId]);
            },
            sx: { userSelect: 'none' }
          }}
          selectedTagProps={{
            onClick: tagId => {
              setFieldValue('tags', without(values.tags, tagId));
            },
            color: 'white',
            backgroundColor: 'purpleMedium',
          }}
        />

        {getFieldError('tags', formikContext) && (
          <Caption ml={2} mt={2} color="feedback.danger">
            {errors.tags}
          </Caption>
        )}
      </Box>

      <Box sx={{ borderTop: borders.default }} py={3}>
        <Body0 fontWeight="medium" mb={2}>{t('Select Duration')}</Body0>

        <RadioGroup
          id="summary-period-select"
          options={summaryPeriodOptions}
          {...getCommonFormikFieldProps('period', formikContext)}
          variant="vertical"
        />
      </Box>

      <Box sx={{ borderTop: borders.default }} pt={3}>
        <Body0 fontWeight="medium" mb={2}>{t('Select Last Upload Date')}</Body0>

        <RadioGroup
          id="summary-period-select"
          options={lastUploadDateFilterOptions}
          {...getCommonFormikFieldProps('lastUpload', formikContext)}
          variant="vertical"
        />
      </Box>
    </Box>
  );
};

TideDashboardConfigForm.propTypes = {
  ...BoxProps,
  api: PropTypes.object.isRequired,
  onFormChange: PropTypes.func.isRequired,
  patient: PropTypes.object,
  t: PropTypes.func.isRequired,
  trackMetric: PropTypes.func.isRequired,
};

export default translate()(TideDashboardConfigForm);
