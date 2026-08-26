const Joi = require('joi');
const schema = Joi.object({
  identifiers: Joi.object({
    PAN: Joi.string().trim().uppercase().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/).required(),
    DPID: Joi.string().allow('').optional(),
    APPLICATION_NUMBER: Joi.string().allow('').optional()
  }).required()
});

const testCases = [
  "ABCDE1234F",
  "AAAAA0000A",
  "ABCDE9999Z",
  " abcde1234f ",
  "ABC1234567",
  "ABCDE12345",
  "123456789A",
  "ABCDE1234",
  "ABCDE12345F",
  "ABCD 1234F",
  "ABCDE-1234F",
  "ABCDE1234FF"
];

testCases.forEach(pan => {
  const result = schema.validate({ identifiers: { PAN: pan } });
  if (result.error) {
    console.log(`[INVALID] '${pan}': ${result.error.message}`);
  } else {
    console.log(`[VALID] '${pan}' -> Normalizes to: '${result.value.identifiers.PAN}'`);
  }
});
