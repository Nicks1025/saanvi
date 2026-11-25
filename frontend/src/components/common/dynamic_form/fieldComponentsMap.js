import FieldShortText from './fields/FieldShortText';
import FieldLongText from './fields/FieldLongText';
import FieldPhoneNumber from './fields/FieldPhoneNumber';
import FieldEmail from './fields/FieldEmail';
import FieldNumber from './fields/FieldNumber';
import FieldDate from './fields/FieldDate';
import FieldDropdown from './fields/FieldDropdown';
import FieldRadio from './fields/FieldRadio';
import FieldCheckbox from './fields/FieldCheckbox';
import FieldFileUpload from './fields/FieldFileUpload';

export const FIELD_COMPONENTS = {
  shorttext: FieldShortText,
  text: FieldShortText,
  string: FieldShortText,
  longtext: FieldLongText,
  textarea: FieldLongText,
  phonenumber: FieldPhoneNumber,
  phone: FieldPhoneNumber,
  email: FieldEmail,
  number: FieldNumber,
  numeric: FieldNumber,
  integer: FieldNumber,
  decimal: FieldNumber,
  date: FieldDate,
  dropdown: FieldDropdown,
  select: FieldDropdown,
  radio: FieldRadio,
  checkbox: FieldCheckbox,
  check_box: FieldCheckbox,
  fileupload: FieldFileUpload,
  file: FieldFileUpload,
};

export const getFieldComponent = (fieldType) => {
  if (!fieldType) return FieldShortText;
  const normalized = String(fieldType).toLowerCase().trim().replace(/[\s_-]+/g, '');
  return FIELD_COMPONENTS[normalized] || FieldShortText;
};
